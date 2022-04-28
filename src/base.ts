class AddonBase {
  protected _Addon: Notero;
  constructor(parent: Notero) {
    this._Addon = parent;
  }
}

class EditorMessage {
  public type: string;
  public content: {
    itemID?: string;
    event?: XULEvent;
    editorInstance?: EditorInstance
  };
  constructor(type: string, content: object) {
    this.type = type;
    this.content = content;
  }
}

export { AddonBase, EditorMessage };
