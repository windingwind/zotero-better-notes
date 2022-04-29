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
  };
  constructor(type: string, content: object) {
    this.type = type;
    this.content = content;
  }
}

export { AddonBase, EditorMessage };
