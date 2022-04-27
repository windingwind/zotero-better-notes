import { AddonBase } from "./base";

class AddonPrefs extends AddonBase {
  private _document: Document;
  constructor(parent: Notero) {
    super(parent);
  }
  initPreferences(_document: Document) {
    this._document = _document;
    Zotero.debug("Notero: Initialize preferences.");
  }
}

export default AddonPrefs;
