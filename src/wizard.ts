import { AddonBase, EditorMessage } from "./base";

class AddonWizard extends AddonBase {
  enableSetup: boolean;
  enableCollection: boolean;
  collectionName: string;
  enableNote: boolean;
  private _document: Document;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.enableSetup = true;
    this.enableCollection = true;
    this.collectionName = "";
    this.enableNote = true;
  }
  init(_document: Document) {
    this._document = _document;
    Zotero.debug("Knowledge4Zotero: Initialize AddonWizard.");
    this.updateCollectionSetup();
  }
  changeSetup() {
    this.enableSetup = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-enable"
      ) as XUL.Checkbox
    ).checked;
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionenable"
      ) as XUL.Checkbox
    ).disabled = !this.enableSetup;
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionname"
      ) as XUL.Textbox
    ).disabled = !(this.enableSetup && this.enableCollection);
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-noteenable"
      ) as XUL.Checkbox
    ).disabled = !this.enableSetup;
  }
  updateCollectionSetup() {
    this.enableCollection = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionenable"
      ) as XUL.Checkbox
    ).checked;
    this.collectionName = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionname"
      ) as XUL.Textbox
    ).value;
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionname"
      ) as XUL.Textbox
    ).disabled = !(this.enableSetup && this.enableCollection);
  }
  updateNoteSetup() {
    this.enableNote = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-noteenable"
      ) as XUL.Checkbox
    ).checked;
  }
  async setup() {
    if (this.enableSetup) {
      if (this.enableCollection && this.collectionName.trim().length > 0) {
        const collection = new Zotero.Collection();
        collection.name = this.collectionName;
        await collection.saveTx();
      }
      if (this.enableNote) {
        await this._Addon.events.onEditorEvent(
          new EditorMessage("createWorkspace", {})
        );
      }
    }
  }
}

export default AddonWizard;
