import { Attrs, Node as ProsemirrorNode } from "prosemirror-model";
import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  NodeView,
} from "prosemirror-view";
import { tableNodeTypes } from "prosemirror-tables";
import { TableMap } from "prosemirror-tables";
import { TableView, updateColumnsOnResize } from "prosemirror-tables";
import { cellAround, pointsAtCell } from "prosemirror-tables";

/**
 * Major changes:
 * - Add `selecting` property to `ResizeState` class to disable resizing when selecting text
 * - Skip handle update if the view has non-empty selection in table
 * - Restore selection after resizing
 */

interface CellAttrs {
  colspan: number;
  rowspan: number;
  colwidth: number[] | null;
}

/**
 * @public
 */
export const columnResizingPluginKey = new PluginKey<ResizeState>(
  "tableColumnResizing",
);

/**
 * @public
 */
export type ColumnResizingOptions = {
  handleWidth?: number;
  /**
   * Minimum width of a cell /column. The column cannot be resized smaller than this.
   */
  cellMinWidth?: number;
  /**
   * The default minWidth of a cell / column when it doesn't have an explicit width (i.e.: it has not been resized manually)
   */
  defaultCellMinWidth?: number;
  lastColumnResizable?: boolean;
  /**
   * A custom node view for the rendering table nodes. By default, the plugin
   * uses the {@link TableView} class. You can explicitly set this to `null` to
   * not use a custom node view.
   */
  View?:
    | (new (
        node: ProsemirrorNode,
        cellMinWidth: number,
        view: EditorView,
      ) => NodeView)
    | null;
};

/**
 * @public
 */
export type Dragging = { startX: number; startWidth: number };

/**
 * @public
 */
export function columnResizing({
  handleWidth = 5,
  cellMinWidth = 25,
  defaultCellMinWidth = 100,
  View = TableView as any,
  lastColumnResizable = true,
}: ColumnResizingOptions = {}): Plugin {
  const plugin = new Plugin<ResizeState>({
    key: columnResizingPluginKey,
    state: {
      init(_, state) {
        const nodeViews = plugin.spec?.props?.nodeViews;
        const tableName = tableNodeTypes(state.schema).table.name;
        if (View && nodeViews) {
          nodeViews[tableName] = (node, view) => {
            return new View(node, defaultCellMinWidth, view);
          };
        }
        return new ResizeState(-1, false, false);
      },
      apply(tr, prev) {
        return prev.apply(tr);
      },
    },
    props: {
      attributes: (state): Record<string, string> => {
        const pluginState = columnResizingPluginKey.getState(state);
        return pluginState && pluginState.activeHandle > -1
          ? { class: "resize-cursor" }
          : {};
      },

      handleDOMEvents: {
        mousemove: (view, event) => {
          handleMouseMove(view, event, handleWidth, lastColumnResizable);
        },
        mouseleave: (view) => {
          handleMouseLeave(view);
        },
        mousedown: (view, event) => {
          handleMouseDown(view, event, cellMinWidth, defaultCellMinWidth);
        },
      },

      decorations: (state) => {
        const pluginState = columnResizingPluginKey.getState(state);
        if (pluginState && pluginState.activeHandle > -1) {
          return handleDecorations(state, pluginState.activeHandle);
        }
      },

      nodeViews: {},
    },
  });
  return plugin;
}

/**
 * @public
 */
export class ResizeState {
  constructor(
    public activeHandle: number,
    public dragging: Dragging | false,
    public selecting: boolean,
    public position: number = 0,
  ) {}

  apply(tr: Transaction): ResizeState {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const state = this;
    const action = tr.getMeta(columnResizingPluginKey);

    // If action provides a selecting flag, update it; otherwise keep the current one.
    const newSelecting =
      action && typeof action.selecting === "boolean"
        ? action.selecting
        : state.selecting;

    // Only update the handle if a setHandle is provided AND we're not in selecting mode.
    if (action && action.setHandle != null && !newSelecting) {
      return new ResizeState(
        action.setHandle,
        false,
        newSelecting,
        state.position,
      );
    }
    if (action && action.setDragging !== undefined) {
      return new ResizeState(
        action.setDragging === null ? -1 : state.activeHandle,
        action.setDragging,
        newSelecting,
        action.setDragging
          ? // @ts-ignore
            _currentEditorInstance._editorCore.view.state.selection.$anchor.pos
          : 0,
      );
    }
    if (state.activeHandle > -1 && tr.docChanged) {
      let handle = tr.mapping.map(state.activeHandle, -1);
      if (!pointsAtCell(tr.doc.resolve(handle))) {
        handle = -1;
      }
      return new ResizeState(
        handle,
        state.dragging,
        newSelecting,
        state.position,
      );
    }

    return new ResizeState(
      state.activeHandle,
      state.dragging,
      newSelecting,
      state.position,
    );
  }
}

function handleMouseMove(
  view: EditorView,
  event: MouseEvent,
  handleWidth: number,
  lastColumnResizable: boolean,
): void {
  if (!view.editable) return;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (!pluginState) return;

  if (!pluginState.dragging) {
    const target = domCellAround(event.target as HTMLElement);
    let cell = -1;
    if (target) {
      const { left, right } = target.getBoundingClientRect();
      if (event.clientX - left <= handleWidth)
        cell = edgeCell(view, event, "left", handleWidth);
      else if (right - event.clientX <= handleWidth)
        cell = edgeCell(view, event, "right", handleWidth);
    }

    if (cell != pluginState.activeHandle) {
      if (!lastColumnResizable && cell !== -1) {
        const $cell = view.state.doc.resolve(cell);
        const table = $cell.node(-1);
        const map = TableMap.get(table);
        const tableStart = $cell.start(-1);
        const col =
          map.colCount($cell.pos - tableStart) +
          $cell.nodeAfter!.attrs.colspan -
          1;

        if (col == map.width - 1) {
          return;
        }
      }

      updateHandle(view, cell);
    }
  }
}

function handleMouseLeave(view: EditorView): void {
  if (!view.editable) return;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging)
    updateHandle(view, -1);
}

function handleMouseDown(
  view: EditorView,
  event: MouseEvent,
  cellMinWidth: number,
  defaultCellMinWidth: number,
): boolean {
  if (!view.editable) return false;

  const win = view.dom.ownerDocument.defaultView ?? window;

  const pluginState = columnResizingPluginKey.getState(view.state);
  if (!pluginState || pluginState.activeHandle == -1) {
    if (pluginState?.dragging) {
      return false;
    }

    // If the mousedown event is not on a resize handle, record being in non-resize drag mode
    view.dispatch(
      view.state.tr.setMeta(columnResizingPluginKey, {
        selecting: true,
      }),
    );
  } else {
    const cell = view.state.doc.nodeAt(pluginState.activeHandle)!;
    const width = currentColWidth(view, pluginState.activeHandle, cell.attrs);

    view.dispatch(
      view.state.tr.setMeta(columnResizingPluginKey, {
        setDragging: { startX: event.clientX, startWidth: width },
      }),
    );

    displayColumnWidth(
      view,
      pluginState.activeHandle,
      width,
      defaultCellMinWidth,
    );

    event.preventDefault();
  }

  function finish(event: MouseEvent) {
    win.removeEventListener("mouseup", finish);
    win.removeEventListener("mousemove", move);
    const pluginState = columnResizingPluginKey.getState(view.state);
    if (pluginState?.dragging) {
      const tr = updateColumnWidth(
        view,
        pluginState.activeHandle,
        draggedWidth(pluginState.dragging, event, cellMinWidth),
      );
      tr.setMeta(columnResizingPluginKey, {
        setDragging: null,
        selecting: false,
      });
      // Reset selection to prevent dragging text
      tr.setSelection(TextSelection.create(tr.doc, pluginState?.position || 0));
      view.dispatch(tr);
    } else {
      view.dispatch(
        view.state.tr.setMeta(columnResizingPluginKey, {
          selecting: false,
        }),
      );
    }
  }

  function move(event: MouseEvent): void {
    if (!event.which) return finish(event);
    const pluginState = columnResizingPluginKey.getState(view.state);
    if (!pluginState) return;
    if (pluginState.dragging) {
      const dragged = draggedWidth(pluginState.dragging, event, cellMinWidth);
      displayColumnWidth(
        view,
        pluginState.activeHandle,
        dragged,
        defaultCellMinWidth,
      );
    }
  }

  win.addEventListener("mouseup", finish);
  win.addEventListener("mousemove", move);
  return true;
}

function currentColWidth(
  view: EditorView,
  cellPos: number,
  { colspan, colwidth }: Attrs,
): number {
  const width = colwidth && colwidth[colwidth.length - 1];
  if (width) return width;
  const dom = view.domAtPos(cellPos);
  const node = dom.node.childNodes[dom.offset] as HTMLElement;
  let domWidth = node.offsetWidth,
    parts = colspan;
  if (colwidth)
    for (let i = 0; i < colspan; i++)
      if (colwidth[i]) {
        domWidth -= colwidth[i];
        parts--;
      }
  return domWidth / parts;
}

function domCellAround(target: HTMLElement | null): HTMLElement | null {
  while (target && target.nodeName != "TD" && target.nodeName != "TH")
    target =
      target.classList && target.classList.contains("ProseMirror")
        ? null
        : (target.parentNode as HTMLElement);
  return target;
}

function edgeCell(
  view: EditorView,
  event: MouseEvent,
  side: "left" | "right",
  handleWidth: number,
): number {
  // posAtCoords returns inconsistent positions when cursor is moving
  // across a collapsed table border. Use an offset to adjust the
  // target viewport coordinates away from the table border.
  const offset = side == "right" ? -handleWidth : handleWidth;
  const found = view.posAtCoords({
    left: event.clientX + offset,
    top: event.clientY,
  });
  if (!found) return -1;
  const { pos } = found;
  const $cell = cellAround(view.state.doc.resolve(pos));
  if (!$cell) return -1;
  if (side == "right") return $cell.pos;
  const map = TableMap.get($cell.node(-1)),
    start = $cell.start(-1);
  const index = map.map.indexOf($cell.pos - start);
  return index % map.width == 0 ? -1 : start + map.map[index - 1];
}

function draggedWidth(
  dragging: Dragging,
  event: MouseEvent,
  resizeMinWidth: number,
): number {
  const offset = event.clientX - dragging.startX;
  return Math.max(resizeMinWidth, dragging.startWidth + offset);
}

function updateHandle(view: EditorView, value: number): void {
  // If the view has non-empty selection in table, don't update the handle
  if (view.state.selection.from !== view.state.selection.to) {
    return;
  }
  view.dispatch(
    view.state.tr.setMeta(columnResizingPluginKey, { setHandle: value }),
  );
}

function updateColumnWidth(
  view: EditorView,
  cell: number,
  width: number,
): Transaction {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1),
    map = TableMap.get(table),
    start = $cell.start(-1);
  const col =
    map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs.colspan - 1;
  const tr = view.state.tr;
  for (let row = 0; row < map.height; row++) {
    const mapIndex = row * map.width + col;
    // Rowspanning cell that has already been handled
    if (row && map.map[mapIndex] == map.map[mapIndex - map.width]) continue;
    const pos = map.map[mapIndex];
    const attrs = table.nodeAt(pos)!.attrs as CellAttrs;
    const index = attrs.colspan == 1 ? 0 : col - map.colCount(pos);
    if (attrs.colwidth && attrs.colwidth[index] == width) continue;
    const colwidth = attrs.colwidth
      ? attrs.colwidth.slice()
      : zeroes(attrs.colspan);
    colwidth[index] = width;
    tr.setNodeMarkup(start + pos, null, { ...attrs, colwidth: colwidth });
  }
  return tr;
}

function displayColumnWidth(
  view: EditorView,
  cell: number,
  width: number,
  defaultCellMinWidth: number,
): void {
  const $cell = view.state.doc.resolve(cell);
  const table = $cell.node(-1),
    start = $cell.start(-1);
  const col =
    TableMap.get(table).colCount($cell.pos - start) +
    $cell.nodeAfter!.attrs.colspan -
    1;
  let dom: Node | null = view.domAtPos($cell.start(-1)).node;
  while (dom && dom.nodeName != "TABLE") {
    dom = dom.parentNode;
  }

  if (!dom) return;

  updateColumnsOnResize(
    table,
    dom.firstChild as HTMLTableColElement,
    dom as HTMLTableElement,
    defaultCellMinWidth,
    col,
    width,
  );
}

function zeroes(n: number): 0[] {
  return Array(n).fill(0);
}

export function handleDecorations(
  state: EditorState,
  cell: number,
): DecorationSet {
  const decorations = [];
  const $cell = state.doc.resolve(cell);
  const table = $cell.node(-1);
  if (!table) {
    return DecorationSet.empty;
  }
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const col =
    map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs.colspan - 1;
  for (let row = 0; row < map.height; row++) {
    const index = col + row * map.width;
    // For positions that have either a different cell or the end
    // of the table to their right, and either the top of the table or
    // a different cell above them, add a decoration
    if (
      (col == map.width - 1 || map.map[index] != map.map[index + 1]) &&
      (row == 0 || map.map[index] != map.map[index - map.width])
    ) {
      const cellPos = map.map[index];
      const pos = start + cellPos + table.nodeAt(cellPos)!.nodeSize - 1;
      const dom = document.createElement("div");
      dom.className = "column-resize-handle";
      if (columnResizingPluginKey.getState(state)?.dragging) {
        decorations.push(
          Decoration.node(
            start + cellPos,
            start + cellPos + table.nodeAt(cellPos)!.nodeSize,
            {
              class: "column-resize-dragging",
            },
          ),
        );
      }

      decorations.push(Decoration.widget(pos, dom));
    }
  }
  return DecorationSet.create(state.doc, decorations);
}
