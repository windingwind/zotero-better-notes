import { AddonBase } from "./base";

class AddonPrefs extends AddonBase {
  private _document: Document;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }
  initPreferences(_document: Document) {
    this._document = _document;
    Zotero.debug("Knowledge4Zotero: Initialize preferences.");
  }
}

export default AddonPrefs;
