import { AddonBase } from "./base";

class AddonExport extends AddonBase {
  private io: {
    dataIn: any;
    dataOut: any;
    deferred?: typeof Promise;
  };
  private _window: Window;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }
  doLoad(_window: Window) {
    this._window = _window;

    this.io = (this._window as unknown as XULWindow).arguments[0];

    let exportFile = Zotero.Prefs.get("Knowledge4Zotero.exportFile");
    if (typeof exportFile !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enablefile"
        ) as XUL.Checkbox
      ).checked = exportFile;
    }
    let embedImage = Zotero.Prefs.get("Knowledge4Zotero.embedImage");
    if (typeof embedImage !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-embedImage"
        ) as XUL.Checkbox
      ).checked = embedImage;
    }
    let exportNote = Zotero.Prefs.get("Knowledge4Zotero.exportNote");
    if (typeof exportNote !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enablenote"
        ) as XUL.Checkbox
      ).checked = exportNote;
    }
    let exportCopy = Zotero.Prefs.get("Knowledge4Zotero.exportCopy");
    if (typeof exportCopy !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enablecopy"
        ) as XUL.Checkbox
      ).checked = exportCopy;
    }
  }
  doUnload() {
    this.io.deferred && this.io.deferred.resolve();
  }

  doAccept() {
    let exportFile = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablefile"
      ) as XUL.Checkbox
    ).checked;
    let embedImage = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-embedImage"
      ) as XUL.Checkbox
    ).checked;
    let exportNote = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablenote"
      ) as XUL.Checkbox
    ).checked;
    let exportCopy = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablecopy"
      ) as XUL.Checkbox
    ).checked;
    Zotero.Prefs.set("Knowledge4Zotero.exportFile", exportFile);
    Zotero.Prefs.set("Knowledge4Zotero.embedImage", embedImage);
    Zotero.Prefs.set("Knowledge4Zotero.exportNote", exportNote);
    Zotero.Prefs.set("Knowledge4Zotero.exportCopy", exportCopy);
    Zotero.debug(this.io);
    Zotero.debug(this.io.dataOut);
    this.io.dataOut = {
      exportFile: exportFile,
      embedImage: embedImage,
      exportNote: exportNote,
      exportCopy: exportCopy,
    };
  }
}

export default AddonExport;
