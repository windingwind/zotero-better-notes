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

export { EditorMessage, OutlineType, NoteTemplate, SyncCode, NodeMode };
