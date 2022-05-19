class AddonBase {
  protected _Addon: Knowledge4Zotero;
  constructor(parent: Knowledge4Zotero) {
    this._Addon = parent;
  }
}

class EditorMessage {
  public type: string;
  public content: {
    event?: XULEvent;
    editorInstance?: EditorInstance;
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
  text: string;
  disabled: boolean;
}

export { AddonBase, EditorMessage, OutlineType, NoteTemplate };
