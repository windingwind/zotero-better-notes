/*
 * This file contains definitions of commonly used structures.
 */

class EditorMessage {
  public type: string;
  public content: {
    event?: XUL.XULEvent;
    editorInstance?: Zotero.EditorInstance;
    params?: any;
  };
  constructor(type: string, content: object) {
    this.type = type;
    this.content = content;
  }
}

enum OutlineType {
  treeView = 1,
  mindMap,
  bubbleMap,
}

class NoteTemplate {
  name: string;
  disabled: boolean;
  text?: string;
}

enum SyncCode {
  UpToDate = 0,
  NoteAhead,
  MDAhead,
  NeedDiff,
}

enum NodeMode {
  default = 0,
  wrap,
  replace,
  direct,
}

function getDOMParser(): DOMParser {
  if (Zotero.platformMajorVersion > 60) {
    return new DOMParser();
  } else {
    return Components.classes[
      "@mozilla.org/xmlextras/domparser;1"
    ].createInstance(Components.interfaces.nsIDOMParser);
  }
}

export {
  EditorMessage,
  OutlineType,
  NoteTemplate,
  SyncCode,
  NodeMode,
  getDOMParser,
};
