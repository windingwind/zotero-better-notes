// The prosemirror imports are only for type hint
import {
  Node,
  NodeType,
  Mark,
  MarkType,
  ResolvedPos,
  Attrs,
  DOMParser,
  Schema,
} from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

function fromHTML(schema: Schema, html: string, slice?: boolean) {
  let domNode = document.createElement("div");
  domNode.innerHTML = html;
  let fragment = document.createDocumentFragment();
  while (domNode.firstChild) {
    fragment.appendChild(domNode.firstChild);
  }
  if (slice) {
    return DOMParser.fromSchema(schema).parseSlice(fragment);
  } else {
    return DOMParser.fromSchema(schema).parse(fragment);
  }
}

function getSliceFromHTML(state: EditorState, html: string) {
  return fromHTML(state.schema, html, true);
}

function getNodeFromHTML(state: EditorState, html: string) {
  return fromHTML(state.schema, html);
}

function setSelection(anchor: number, head?: number | undefined) {
  return (state: EditorState, dispatch?: EditorView["dispatch"]) => {
    const { tr, selection } = state;
    const _TextSelection =
      selection.constructor as unknown as typeof TextSelection;
    tr.setSelection(_TextSelection.create(tr.doc, anchor, head));
    dispatch && dispatch(tr);
  };
}

// Code from https://github.com/ueberdosis/tiptap/tree/main/packages/core/src/helpers

function objectIncludes(object1: any, object2: any) {
  const keys = Object.keys(object2);

  if (!keys.length) {
    return true;
  }

  return !!keys.filter((key) => object2[key] === object1[key]).length;
}

function findMarkInSet(
  marks: readonly Mark[],
  type: MarkType,
  attributes = {}
) {
  return marks.find((item) => {
    return item.type === type && objectIncludes(item.attrs, attributes);
  });
}

function isMarkInSet(marks: readonly Mark[], type: MarkType, attributes = {}) {
  return !!findMarkInSet(marks, type, attributes);
}

function getMarkRange($pos: ResolvedPos, type: MarkType, attributes = {}) {
  if (!$pos || !type) {
    return;
  }

  const start = $pos.parent.childAfter($pos.parentOffset);

  if (!start.node) {
    return;
  }

  const mark = findMarkInSet(start.node.marks, type, attributes);

  if (!mark) {
    return;
  }

  let startIndex = $pos.index();
  let startPos = $pos.start() + start.offset;
  let endIndex = startIndex + 1;
  let endPos = startPos + start.node.nodeSize;

  findMarkInSet(start.node.marks, type, attributes);

  while (
    startIndex > 0 &&
    mark.isInSet($pos.parent.child(startIndex - 1).marks)
  ) {
    startIndex -= 1;
    startPos -= $pos.parent.child(startIndex).nodeSize;
  }

  while (
    endIndex < $pos.parent.childCount &&
    isMarkInSet($pos.parent.child(endIndex).marks, type, attributes)
  ) {
    endPos += $pos.parent.child(endIndex).nodeSize;
    endIndex += 1;
  }

  return {
    from: startPos,
    to: endPos,
  };
}

function getMarkRangeAtCursor(state: EditorState, type: MarkType) {
  const { selection } = state;
  const { $from, empty } = selection;

  if (empty) {
    const start = $from.parent.childAfter($from.parentOffset);
    if (start.node) {
      const mark = start.node.marks.find(
        (mark) => mark.type.name === type.name
      );
      if (mark) {
        return getMarkRange($from, type, mark.attrs);
      }
    }
  }

  return null;
}

function deleteRange(from: number, to: number) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const { tr } = state;
    console.log("Delete Node", from, to);
    tr.delete(from, to);
    dispatch(tr);
  };
}

function deleteRangeAtCursor(searchType: MarkType) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const range = getMarkRangeAtCursor(state, searchType);
    if (range) {
      const from = range.from;
      const to = range.to;
      return deleteRange(from, to)(state, dispatch);
    }
  };
}

function replaceRange(
  from: number,
  to: number,
  text: string | undefined,
  type: MarkType,
  attrs: Attrs | string
) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const { tr } = state;
    if (typeof attrs === "string") {
      attrs = JSON.parse(attrs) as Attrs;
    }

    const node = state.schema.text(text || state.doc.textBetween(from, to), [
      type.create(attrs),
    ]);
    console.log("Replace Node", from, to, node);
    tr.replaceWith(from, to, node);
    dispatch(tr);
  };
}

function replaceRangeNode(
  from: number,
  to: number,
  text: string | undefined,
  nodeType: NodeType,
  nodeAttrs: Attrs | string,
  markType?: MarkType,
  markAttrs?: Attrs | string,
  select?: boolean
) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const { tr } = state;
    if (typeof nodeAttrs === "string") {
      nodeAttrs = JSON.parse(nodeAttrs) as Attrs;
    }
    if (typeof markAttrs === "string") {
      markAttrs = JSON.parse(markAttrs) as Attrs;
    }

    const node = nodeType.create(
      nodeAttrs,
      state.schema.text(text || state.doc.textBetween(from, to)),
      markType ? [markType.create(markAttrs)] : []
    );
    console.log("Replace Node", from, to, node);
    tr.replaceWith(from, to, node);
    if (select) {
      setSelection(from + node.nodeSize, from)(state);
    }
    dispatch(tr);
  };
}

function replaceRangeAtCursor(
  text: string | undefined,
  type: MarkType,
  attrs: Attrs | string,
  searchType: MarkType
) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const range = getMarkRangeAtCursor(state, searchType);
    if (range) {
      const from = range.from;
      const to = range.to;
      return replaceRange(from, to, text, type, attrs)(state, dispatch);
    }
  };
}

function moveRange(from: number, to: number, delta: number) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const { tr, selection } = state;
    const _TextSelection =
      selection.constructor as unknown as typeof TextSelection;
    const slice = state.doc.slice(from, to);
    console.log("Move Node", from, to, delta, slice);
    tr.delete(from, to);
    tr.insert(from + delta, slice.content);
    tr.setSelection(_TextSelection.create(tr.doc, from + delta));
    tr.scrollIntoView();
    dispatch(tr);
  };
}

function updateMarkRangeAtCursor(type: MarkType, attrs: Attrs) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const { tr, selection, doc } = state;
    let { from, to } = selection;
    const { $from, empty } = selection;

    if (empty) {
      const range = getMarkRangeAtCursor(state, type);
      if (range) {
        from = range.from;
        to = range.to;
      }
    }

    const hasMark = doc.rangeHasMark(from, to, type);

    if (hasMark) {
      tr.removeMark(from, to, type);
    }

    tr.addStoredMark(type.create(attrs));

    if (to > from) {
      tr.addMark(from, to, type.create(attrs));
    }

    dispatch(tr);
  };
}

function removeMarkRangeAtCursor(type: MarkType) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    const { tr, selection } = state;
    let { from, to } = selection;
    const { $from, empty } = selection;

    if (empty) {
      const range = getMarkRangeAtCursor(state, type);
      if (range) {
        from = range.from;
        to = range.to;
      }
    }

    tr.ensureMarks([]);
    if (to > from) {
      tr.removeMark(from, to, type);
    }
    dispatch(tr);
  };
}

function getHeadingLevelInRange(from: number, to: number) {
  return (state: EditorState) => {
    let level = -1;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "heading") {
        level = node.attrs.level;
      }
    });
    return level;
  };
}

function updateHeadingsInRange(from: number, to: number, levelOffset: number) {
  return (state: EditorState, dispatch: EditorView["dispatch"]) => {
    let { tr } = state;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "heading") {
        tr = tr.setNodeMarkup(pos, state.schema.nodes.heading, {
          level: node.attrs.level + levelOffset,
        });
      }
    });
    dispatch(tr);
  };
}

function refocusEditor(callback: Function) {
  let scrollTop = document.querySelector(".editor-core")!.scrollTop;
  let input = document.createElement("input");
  input.style.position = "absolute";
  input.style.opacity = "0";
  document.body.append(input);
  input.focus();
  input.offsetTop;
  setTimeout(() => {
    (document.querySelector(".primary-editor") as any).focus();
    input.remove();
    document.querySelector(".editor-core")!.scrollTop = scrollTop;
    setTimeout(callback, 0);
  }, 0);
}

function updateImageDimensions(
  nodeID: string,
  width: number,
  height: number | undefined,
  state: EditorState,
  dispatch: EditorView["dispatch"]
) {
  let { tr } = state;
  state.doc.descendants((node: Node, pos: number) => {
    if (node.type.name === "image" && node.attrs.nodeID === nodeID) {
      // tr.step(new SetAttrsStep(pos, { ...node.attrs, width, height }));
      // tr.setMeta("addToHistory", false);
      // tr.setMeta("system", true);
      tr.setNodeMarkup(
        pos,
        node.type,
        { ...node.attrs, width, height },
        node.marks
      );
      dispatch(tr);
      return false;
    }
  });
}

export const BetterNotesEditorAPI = {
  deleteRange,
  deleteRangeAtCursor,
  replaceRange,
  replaceRangeNode,
  replaceRangeAtCursor,
  moveRange,
  updateMarkRangeAtCursor,
  removeMarkRangeAtCursor,
  refocusEditor,
  updateImageDimensions,
  getHeadingLevelInRange,
  updateHeadingsInRange,
  getSliceFromHTML,
  getNodeFromHTML,
  setSelection,
};

// @ts-ignore
window.BetterNotesEditorAPI = BetterNotesEditorAPI;
