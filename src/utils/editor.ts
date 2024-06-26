import TreeModel = require("tree-model");
import { TextSelection } from "prosemirror-state";
import { getNoteTreeFlattened } from "./note";
import { getPref } from "./prefs";

export {
  insert,
  del,
  move,
  replace,
  scroll,
  scrollToSection,
  getEditorInstance,
  moveHeading,
  updateHeadingTextAtLine,
  getEditorCore,
  getRangeAtCursor,
  getLineAtCursor,
  getSectionAtCursor,
  getPositionAtLine,
  getPositionAtCursor,
  getURLAtCursor,
  updateImageDimensionsAtCursor,
  updateURLAtCursor,
  getTextBetween,
  getTextBetweenLines,
  isImageAtCursor,
  initLinkPreview,
};

function insert(
  editor: Zotero.EditorInstance,
  content: string = "",
  position: number | "end" | "start" | "cursor" = "cursor",
  select?: boolean,
) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  if (position === "cursor") {
    position = getPositionAtCursor(editor);
  } else if (position === "end") {
    position = core.view.state.doc.content.size;
  } else if (position === "start") {
    position = 0;
  }
  position = Math.max(0, Math.min(position, core.view.state.doc.content.size));
  (core as any).insertHTML(position, content);
  if (select) {
    const slice = EditorAPI.getSliceFromHTML(core.view.state, content);
    EditorAPI.refocusEditor(() => {
      EditorAPI.setSelection(
        (position as number) + slice.content.size,
        position as number,
      )(core.view.state, core.view.dispatch);
    });
  }
}

function del(editor: Zotero.EditorInstance, from: number, to: number) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  EditorAPI.deleteRange(from, to)(core.view.state, core.view.dispatch);
}

function move(
  editor: Zotero.EditorInstance,
  from: number,
  to: number,
  delta: number,
) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  EditorAPI.moveRange(from, to, delta)(core.view.state, core.view.dispatch);
}

function replace(
  editor: Zotero.EditorInstance,
  from: number,
  to: number,
  text: string | undefined,
  nodeTypeName:
    | "doc"
    | "paragraph"
    | "heading"
    | "math_display"
    | "codeBlock"
    | "blockquote"
    | "horizontalRule"
    | "orderedList"
    | "bulletList"
    | "listItem"
    | "table"
    | "table_row"
    | "table_cell"
    | "table_header"
    | "text"
    | "hardBreak"
    | "image"
    | "citation"
    | "highlight"
    | "math_inline",
  nodeAttrs: Record<string, any>,
  markTypeName:
    | "strong"
    | "em"
    | "underline"
    | "strike"
    | "subsup"
    | "textColor"
    | "backgroundColor"
    | "link"
    | "code",
  markAttrs: Record<string, any>,
  select?: boolean,
) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  const schema = core.view.state.schema;
  EditorAPI.replaceRangeNode(
    from,
    to,
    text,
    schema.nodes[nodeTypeName],
    JSON.stringify(nodeAttrs),
    schema.marks[markTypeName],
    JSON.stringify(markAttrs),
    select,
  )(core.view.state, core.view.dispatch);
}

function scroll(editor: Zotero.EditorInstance, lineIndex: number) {
  const core = getEditorCore(editor);
  const dom = getDOMAtLine(editor, lineIndex);
  const offset = dom.offsetTop;
  core.view.dom.parentElement?.scrollTo(0, offset);
}

function scrollToSection(editor: Zotero.EditorInstance, sectionName: string) {
  const item = editor._item;
  const sectionTree = getNoteTreeFlattened(item);
  const sectionNode = sectionTree.find(
    (node) => node.model.name.trim() === sectionName.trim(),
  );
  if (!sectionNode) return;
  scroll(editor, sectionNode.model.lineIndex);
}

function getEditorInstance(noteId: number) {
  const editor = Zotero.Notes._editorInstances.find(
    (e) =>
      e._item.id === noteId && !Components.utils.isDeadWrapper(e._iframeWindow),
  );
  return editor;
}

function getEditorCore(editor: Zotero.EditorInstance): EditorCore {
  return (editor._iframeWindow as any).wrappedJSObject._currentEditorInstance
    ._editorCore;
}

function getEditorAPI(editor: Zotero.EditorInstance) {
  return (editor._iframeWindow as any).wrappedJSObject
    .BetterNotesEditorAPI as EditorAPI;
}

function getPositionAtCursor(editor: Zotero.EditorInstance) {
  const selection = getEditorCore(editor).view.state.selection;
  try {
    return selection.$anchor.after(selection.$anchor.depth);
  } catch (e) {
    return -1;
  }
}

function getRangeAtCursor(editor: Zotero.EditorInstance) {
  const selection = getEditorCore(editor).view.state.selection;
  return {
    from: selection.from,
    to: selection.to,
  };
}

function getLineAtCursor(editor: Zotero.EditorInstance) {
  const position = getPositionAtCursor(editor);
  if (position < 0) {
    return -1;
  }
  const lastPos = getEditorCore(editor).view.state.tr.doc.content.size;
  let i = 0;
  let currentPos = getPositionAtLine(editor, 0);
  while (currentPos <= lastPos) {
    if (position <= currentPos) {
      break;
    }
    i += 1;
    currentPos = getPositionAtLine(editor, i);
  }
  return i;
}

function getSectionAtCursor(editor: Zotero.EditorInstance): string | undefined {
  const lineIndex = getLineAtCursor(editor);
  if (lineIndex < 0) return undefined;
  const item = editor._item;
  const sectionTree = getNoteTreeFlattened(item);
  let sectionNode;
  for (let i = 0; i < sectionTree.length; i++) {
    if (
      // Is before cursor
      sectionTree[i].model.lineIndex <= lineIndex &&
      // Is last node, or next node is after cursor
      (i === sectionTree.length - 1 ||
        sectionTree[i + 1].model.lineIndex > lineIndex)
    ) {
      sectionNode = sectionTree[i];
      break;
    }
  }
  return sectionNode?.model.name;
}

function getDOMAtLine(
  editor: Zotero.EditorInstance,
  lineIndex: number,
): HTMLElement {
  const core = getEditorCore(editor);
  const lineNodeDesc =
    core.view.docView.children[
      Math.max(0, Math.min(core.view.docView.children.length - 1, lineIndex))
    ];
  return lineNodeDesc?.dom;
}

function getPositionAtLine(
  editor: Zotero.EditorInstance,
  lineIndex: number,
  type: "start" | "end" = "end",
): number {
  const core = getEditorCore(editor);
  const lineNodeDesc =
    core.view.docView.children[
      Math.max(0, Math.min(core.view.docView.children.length - 1, lineIndex))
    ];
  const linePos = lineNodeDesc ? core.view.posAtDOM(lineNodeDesc.dom, 0) : 0;
  return Math.max(
    0,
    Math.min(
      type === "end" ? linePos + lineNodeDesc.size - 1 : linePos - 1,
      core.view.state.tr.doc.content.size,
    ),
  );
}

function getURLAtCursor(editor: Zotero.EditorInstance) {
  const core = getEditorCore(editor);
  return core.pluginState.link.getHref(core.view.state);
}

function updateURLAtCursor(
  editor: Zotero.EditorInstance,
  text: string | undefined,
  url: string,
) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  const from = core.view.state.selection.from;
  const to = core.view.state.selection.to;
  const schema = core.view.state.schema;
  if (!url) {
    return;
  }

  EditorAPI.replaceRangeAtCursor(
    text,
    schema.marks.link,
    JSON.stringify({ href: url }),
    schema.marks.link,
  )(core.view.state, core.view.dispatch);
  EditorAPI.refocusEditor(() => {
    core.view.dispatch(
      core.view.state.tr.setSelection(
        TextSelection.create(core.view.state.tr.doc, from, to),
      ),
    );
  });
}

function updateHeadingTextAtLine(
  editor: Zotero.EditorInstance,
  lineIndex: number,
  text: string,
) {
  const core = getEditorCore(editor);
  const schema = core.view.state.schema;
  const EditorAPI = getEditorAPI(editor);

  const from = getPositionAtLine(editor, lineIndex, "start");
  const to = getPositionAtLine(editor, lineIndex, "end");
  const level = EditorAPI.getHeadingLevelInRange(from, to)(core.view.state);
  EditorAPI.replaceRangeNode(
    from,
    to,
    text,
    schema.nodes.heading,
    JSON.stringify({ level }),
  )(core.view.state, core.view.dispatch);
  EditorAPI.refocusEditor(() => {
    core.view.dispatch(
      core.view.state.tr.setSelection(
        TextSelection.create(core.view.state.tr.doc, from, from + text.length),
      ),
    );
  });
}

function isImageAtCursor(editor: Zotero.EditorInstance) {
  return (
    // @ts-ignore
    getEditorCore(editor).view.state.selection.node?.type?.name === "image"
  );
}

function updateImageDimensionsAtCursor(
  editor: Zotero.EditorInstance,
  width: number,
) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  EditorAPI.updateImageDimensions(
    // @ts-ignore
    core.view.state.selection.node.attrs.nodeID,
    width,
    undefined,
    core.view.state,
    core.view.dispatch,
  );
}

function moveLines(
  editor: Zotero.EditorInstance,
  fromIndex: number,
  toIndex: number,
  targetIndex: number,
) {
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  const from = getPositionAtLine(editor, fromIndex, "start");
  const to = getPositionAtLine(editor, toIndex, "end");
  const target = getPositionAtLine(editor, targetIndex, "start");
  let delta = 0;
  if (target < from) {
    delta = target - from;
  } else if (target > to) {
    delta = target - to;
  } else {
    throw new Error("Invalid move");
  }
  EditorAPI.moveRange(from, to, delta)(core.view.state, core.view.dispatch);
  EditorAPI.refocusEditor(() => {
    core.view.dispatch(
      core.view.state.tr.setSelection(
        TextSelection.create(
          core.view.state.tr.doc,
          target,
          target + to - from,
        ),
      ),
    );
  });
}

function moveHeading(
  editor: Zotero.EditorInstance | undefined,
  currentNode: TreeModel.Node<NoteNodeData>,
  targetNode: TreeModel.Node<NoteNodeData>,
  as: "child" | "before" | "after",
) {
  if (!editor || targetNode.getPath().indexOf(currentNode) >= 0) {
    return;
  }

  let targetIndex = 0;
  let targetLevel = 1;

  if (as === "child") {
    targetIndex = targetNode.model.endIndex + 1;
    targetLevel = targetNode.model.level === 6 ? 6 : targetNode.model.level + 1;
  } else if (as === "before") {
    targetIndex = targetNode.model.lineIndex;
    targetLevel =
      targetNode.model.level === 7
        ? targetNode.parent.model.level === 6
          ? 6
          : targetNode.parent.model.level + 1
        : targetNode.model.level;
  } else if (as === "after") {
    targetIndex = targetNode.model.endIndex + 1;
    targetLevel =
      targetNode.model.level === 7
        ? targetNode.parent.model.level === 6
          ? 6
          : targetNode.parent.model.level + 1
        : targetNode.model.level;
  }

  const fromIndex = currentNode.model.lineIndex;
  const toIndex = currentNode.model.endIndex;
  const levelChange = targetLevel - currentNode.model.level;
  const core = getEditorCore(editor);
  const EditorAPI = getEditorAPI(editor);
  EditorAPI.updateHeadingsInRange(
    getPositionAtLine(editor, fromIndex, "start"),
    getPositionAtLine(editor, toIndex, "end"),
    levelChange,
  )(core.view.state, core.view.dispatch);
  moveLines(editor, fromIndex, toIndex, targetIndex);
}

function getTextBetween(
  editor: Zotero.EditorInstance,
  from: number,
  to: number,
) {
  const core = getEditorCore(editor);
  return core.view.state.doc.textBetween(from, to);
}

function getTextBetweenLines(
  editor: Zotero.EditorInstance,
  fromIndex: number,
  toIndex: number,
) {
  const core = getEditorCore(editor);
  const from = getPositionAtLine(editor, fromIndex, "start");
  const to = getPositionAtLine(editor, toIndex, "end");
  return core.view.state.doc.textBetween(from, to);
}

function initLinkPreview(editor: Zotero.EditorInstance) {
  if (!getPref("editor.noteLinkPreview")) {
    return;
  }
  const EditorAPI = getEditorAPI(editor);
  EditorAPI.initLinkPreviewPlugin(
    Components.utils.cloneInto(
      {
        setPreviewContent: (
          link: string,
          setContent: (content: string) => void,
        ) => {
          const note = addon.api.convert.link2note(link);
          if (!note) {
            setContent(`<p style="color: red;">Invalid note link: ${link}</p>`);
            return;
          }
          addon.api.convert
            .link2html(link, {
              noteItem: note,
              dryRun: true,
              usePosition: true,
            })
            .then((content) => setContent(content));
        },
        openURL: (url: string) => {
          Zotero.getActiveZoteroPane().loadURI(url);
        },
      },
      editor._iframeWindow,
      { wrapReflectors: true, cloneFunctions: true },
    ),
  );
}
