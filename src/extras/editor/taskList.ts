import {
  Plugin,
  PluginKey,
  PluginSpec,
  TextSelection,
} from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { Node, ResolvedPos } from "prosemirror-model";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

export {
  initTaskListPlugin,
  TaskListOptions,
  toggleTaskList,
  isTaskListActive,
};

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

interface TaskListOptions {
  enable: boolean;
}

// Matches a GFM task marker at the very start of a list item's text, e.g.
// "[ ] foo" or "[x] bar". The state char is captured and an optional single
// trailing space is consumed so it can be hidden together with the marker.
//
// The checked state is stored as plain text inside a normal <li>, which is the
// only representation that round-trips through the note-editor's fixed schema
// (listItem has no attributes) and syncs safely to other Zotero clients.
const MARKER_RE = /^\[([ xX])\]( ?)/;
const MARKER_UNCHECKED = "[ ] ";

const taskListPluginKey = new PluginKey<DecorationSet>("betterNotesTaskList");

interface TaskItemInfo {
  /** Depth of the listItem node. */
  depth: number;
  /** The regex match of the marker on the item's first text node. */
  markerMatch: RegExpExecArray;
  /** Absolute position of the "[" that opens the marker. */
  paraContentStart: number;
  /** Length of the item's text after the marker (0 = empty task). */
  contentAfter: number;
}

// Returns info about the bullet-list task item enclosing $from, or null.
function getTaskItemAt($from: ResolvedPos): TaskItemInfo | null {
  for (let d = $from.depth; d >= 1; d--) {
    const node = $from.node(d);
    if (node.type.name !== "listItem") {
      continue;
    }
    // GFM task lists live in unordered lists only.
    const parent = $from.node(d - 1);
    if (!parent || parent.type.name !== "bulletList") {
      return null;
    }
    const paragraph = node.firstChild;
    if (!paragraph || paragraph.type.name !== "paragraph") {
      return null;
    }
    const firstInline = paragraph.firstChild;
    if (!firstInline || !firstInline.isText || !firstInline.text) {
      return null;
    }
    const markerMatch = MARKER_RE.exec(firstInline.text);
    if (!markerMatch) {
      return null;
    }
    return {
      depth: d,
      markerMatch,
      // The paragraph content starts one position inside the listItem.
      paraContentStart: $from.start(d) + 1,
      contentAfter: paragraph.textContent.length - markerMatch[0].length,
    };
  }
  return null;
}

function isInBulletList($from: ResolvedPos): boolean {
  for (let d = $from.depth; d >= 1; d--) {
    if ($from.node(d).type.name === "bulletList") {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Commands shared by the "/" palette, the toolbar format menu, and Enter.
// ---------------------------------------------------------------------------

function isTaskListActive(
  state = _currentEditorInstance._editorCore.view.state,
) {
  return !!getTaskItemAt(state.selection.$from);
}

// Toggle the current line's todo state:
//  - task item        -> remove the marker (back to a plain bullet)
//  - other bullet item -> prepend the marker (becomes a checkbox)
//  - anything else     -> convert to a bullet list, then prepend the marker
function toggleTaskList() {
  const core = _currentEditorInstance._editorCore;
  const view = core.view;

  const info = getTaskItemAt(view.state.selection.$from);
  if (info) {
    view.dispatch(
      view.state.tr.delete(
        info.paraContentStart,
        info.paraContentStart + info.markerMatch[0].length,
      ),
    );
    return;
  }

  if (!isInBulletList(view.state.selection.$from)) {
    core.pluginState.menu?.bulletList?.run();
  }
  insertMarkerAtCursor(view);
}

function insertMarkerAtCursor(view: EditorView) {
  const { $from } = view.state.selection;
  let liDepth = -1;
  for (let d = $from.depth; d >= 1; d--) {
    if ($from.node(d).type.name === "listItem") {
      liDepth = d;
      break;
    }
  }
  if (liDepth < 0) {
    return;
  }
  const paraContentStart = $from.start(liDepth) + 1;
  const tr = view.state.tr.insertText(MARKER_UNCHECKED, paraContentStart);
  // Put the caret after the marker so the user types the task text, not before
  // the (hidden) marker.
  tr.setSelection(
    TextSelection.create(tr.doc, paraContentStart + MARKER_UNCHECKED.length),
  );
  view.dispatch(tr);
}

// Position at the end of the marker for the task item containing `pos`, or -1.
function markerEndAtPos(state: EditorState, pos: number): number {
  if (pos < 0 || pos > state.doc.content.size) {
    return -1;
  }
  const info = getTaskItemAt(state.doc.resolve(pos));
  if (!info) {
    return -1;
  }
  return info.paraContentStart + info.markerMatch[0].length;
}

// ---------------------------------------------------------------------------
// Enter handling: continue the todo list instead of creating a plain item.
//
// Continuing the list on Enter = split the current item and seed the new item
// with a marker, in ONE transaction built from the note-editor's OWN transform
// (state.tr) — never our own bundled splitListItem, which mis-mapped positions
// because it's a different copy of ProseMirror than the editor's.
// ---------------------------------------------------------------------------

function handleTaskEnter(view: EditorView): boolean {
  const { state } = view;
  if (!state.selection.empty) {
    return false;
  }
  const info = getTaskItemAt(state.selection.$from);
  if (!info) {
    return false;
  }
  // Empty task item: drop the marker, then let the note-editor's Enter run on
  // the now-empty item so it exits the list normally.
  if (info.contentAfter <= 0) {
    view.dispatch(
      state.tr.delete(
        info.paraContentStart,
        info.paraContentStart + info.markerMatch[0].length,
      ),
    );
    return false;
  }
  // Non-empty task item: split it, then prepend an unchecked marker to the new
  // item. `depth` breaks out through the cursor's paragraph and the listItem.
  const { $from } = state.selection;
  const depth = $from.depth - info.depth + 1;
  const tr = state.tr;
  try {
    tr.split($from.pos, depth);
  } catch (e) {
    return false;
  }
  // Insert the marker at the split caret WITHOUT an explicit setSelection: let
  // insertText advance the caret using the editor's own selection classes, then
  // re-focus so the browser's DOM selection stays in sync. (Setting the caret
  // explicitly left it desynced — Backspace didn't register until the cursor
  // was moved.)
  tr.insertText(MARKER_UNCHECKED);
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

// ---------------------------------------------------------------------------
// Decorations: render the markers as checkboxes.
// ---------------------------------------------------------------------------

function buildDecorations(doc: Node): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (node.type.name !== "listItem") {
      return;
    }
    // GFM task lists live in unordered lists only.
    if (parent?.type.name !== "bulletList") {
      return;
    }
    const paragraph = node.firstChild;
    if (!paragraph || paragraph.type.name !== "paragraph") {
      return;
    }
    // Anchor on the first inline child and require it to be a text node that
    // starts with the marker. This keeps the marker exactly at pos + 2 even when
    // a list item begins with an inline node (image, citation, ...).
    const firstInline = paragraph.firstChild;
    if (!firstInline || !firstInline.isText || !firstInline.text) {
      return;
    }
    const match = MARKER_RE.exec(firstInline.text);
    if (!match) {
      return;
    }
    const checked = match[1] !== " ";
    const markerLength = match[0].length;
    // The paragraph content starts one position inside the listItem and one
    // more inside the paragraph, so the "[" sits at pos + 2.
    const markerStart = pos + 2;
    const markerEnd = markerStart + markerLength;

    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: `bn-task-item${checked ? " bn-task-checked" : ""}`,
      }),
    );
    decorations.push(
      Decoration.inline(markerStart, markerEnd, { class: "bn-task-marker" }),
    );
    decorations.push(
      Decoration.widget(
        markerStart,
        (view, getPos) => createCheckbox(view, getPos, checked),
        // Include the state in the key so ProseMirror redraws the checkbox
        // when it toggles.
        { side: -1, ignoreSelection: true, key: `bn-task-cb-${checked}` },
      ),
    );
  });
  return DecorationSet.create(doc, decorations);
}

function createCheckbox(
  view: EditorView,
  getPos: () => number | undefined,
  checked: boolean,
) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "bn-task-checkbox";
  input.checked = checked;
  input.disabled = !view.editable;
  input.contentEditable = "false";
  input.setAttribute("aria-label", "Toggle task");

  // Prevent ProseMirror from moving the selection / stealing focus on click.
  input.addEventListener("mousedown", (event) => event.preventDefault());
  input.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!view.editable) {
      return;
    }
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos !== "number") {
      return;
    }
    // The state char sits between the brackets: "[" at pos, the char at pos + 1.
    const from = pos + 1;
    const to = pos + 2;
    const current = view.state.doc.textBetween(from, to);
    const isChecked = current === "x" || current === "X";
    view.dispatch(view.state.tr.insertText(isChecked ? " " : "x", from, to));
  });
  return input;
}

function initTaskListPlugin(plugins: readonly Plugin[]) {
  console.log("Init BN Task List Plugin");

  // Behavior handlers. Prepended so they run before the note-editor's own
  // keymap / input rules (which would otherwise split into a plain list item or
  // let text be typed before the hidden marker).
  const enterSpec: PluginSpec<null> = {
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Enter") {
          return false;
        }
        if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
          return false;
        }
        return handleTaskEnter(view);
      },
      // Never let typed text land before the (hidden) marker — redirect it to
      // right after the marker so the line keeps starting with "[ ]"/"[x]".
      handleTextInput(view, from, to, text) {
        if (from !== to) {
          return false;
        }
        const markerEnd = markerEndAtPos(view.state, from);
        if (markerEnd < 0 || from >= markerEnd) {
          return false;
        }
        const tr = view.state.tr.insertText(text, markerEnd);
        tr.setSelection(TextSelection.create(tr.doc, markerEnd + text.length));
        view.dispatch(tr);
        return true;
      },
      // A click on the hidden marker (or before it) should place the caret after
      // the marker, next to the visible task text.
      handleClick(view, pos) {
        const markerEnd = markerEndAtPos(view.state, pos);
        if (markerEnd < 0 || pos >= markerEnd) {
          return false;
        }
        view.dispatch(
          view.state.tr.setSelection(
            TextSelection.create(view.state.doc, markerEnd),
          ),
        );
        return true;
      },
    },
  };
  (enterSpec as any).betterNotes = "taskListEnter";

  const decorationSpec: PluginSpec<DecorationSet> = {
    key: taskListPluginKey,
    state: {
      init: (_config, state) => buildDecorations(state.doc),
      apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc) : old),
    },
    props: {
      decorations(state) {
        return taskListPluginKey.getState(state);
      },
    },
  };
  // Marker used by initPlugins to detect an already-configured core so the
  // reconfigure stays idempotent across editor reloads.
  (decorationSpec as any).betterNotes = "taskList";

  return [new Plugin(enterSpec), ...plugins, new Plugin(decorationSpec)];
}
