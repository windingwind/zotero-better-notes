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
    let exportSingleFile = Zotero.Prefs.get(
      "Knowledge4Zotero.exportSingleFile"
    );
    if (typeof exportSingleFile !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enablesingle"
        ) as XUL.Checkbox
      ).checked = exportSingleFile;
    }
    let embedLink = Zotero.Prefs.get("Knowledge4Zotero.embedLink");
    if (typeof embedLink !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-embedLink"
        ) as XUL.Checkbox
      ).checked = embedLink;
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
    let exportPDF = Zotero.Prefs.get("Knowledge4Zotero.exportPDF");
    if (typeof exportPDF !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enablepdf"
        ) as XUL.Checkbox
      ).checked = false;
    }
    (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablepdf"
      ) as XUL.Checkbox
    ).disabled = true;
    this.doUpdate();
  }
  doUpdate() {
    (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-embedLink"
      ) as XUL.Checkbox
    ).disabled = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablesingle"
      ) as XUL.Checkbox
    ).checked;

    (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablesingle"
      ) as XUL.Checkbox
    ).disabled = !(
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablefile"
      ) as XUL.Checkbox
    ).checked;
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
    let exportSingleFile = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablesingle"
      ) as XUL.Checkbox
    ).checked;
    let embedLink = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-embedLink"
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
    let exportPDF = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablepdf"
      ) as XUL.Checkbox
    ).checked;
    Zotero.Prefs.set("Knowledge4Zotero.exportFile", exportFile);
    Zotero.Prefs.set("Knowledge4Zotero.exportSingleFile", exportSingleFile);
    Zotero.Prefs.set("Knowledge4Zotero.embedLink", embedLink);
    Zotero.Prefs.set("Knowledge4Zotero.exportNote", exportNote);
    Zotero.Prefs.set("Knowledge4Zotero.exportCopy", exportCopy);
    Zotero.Prefs.set("Knowledge4Zotero.exportPDF", exportPDF);
    Zotero.debug(this.io);
    Zotero.debug(this.io.dataOut);
    this.io.dataOut = {
      exportFile: exportFile,
      exportSingleFile: exportSingleFile,
      embedLink: embedLink,
      exportNote: exportNote,
      exportCopy: exportCopy,
      exportPDF: exportPDF,
    };
  }
}

export default AddonExport;
