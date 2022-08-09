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
    let exportAutoSync = Zotero.Prefs.get("Knowledge4Zotero.exportAutoSync");
    if (typeof exportAutoSync !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enableautosync"
        ) as XUL.Checkbox
      ).checked = exportAutoSync;
    }
    let exportHighlight = Zotero.Prefs.get("Knowledge4Zotero.exportHighlight");
    if (typeof exportHighlight !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-enablehighlight"
        ) as XUL.Checkbox
      ).checked = exportHighlight;
    }
    let convertSquare = Zotero.Prefs.get("Knowledge4Zotero.convertSquare");
    if (typeof convertSquare !== "undefined") {
      (
        this._window.document.getElementById(
          "Knowledge4Zotero-export-convertsquare"
        ) as XUL.Checkbox
      ).checked = convertSquare;
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
      ).checked = exportPDF;
    }
    this.doUpdate();
  }
  doUpdate(event: XULEvent = undefined) {
    let embedLink = this._window.document.getElementById(
      "Knowledge4Zotero-export-embedLink"
    ) as XUL.Checkbox;

    let exportFile = this._window.document.getElementById(
      "Knowledge4Zotero-export-enablefile"
    ) as XUL.Checkbox;
    let exportSingleFile = this._window.document.getElementById(
      "Knowledge4Zotero-export-enablesingle"
    ) as XUL.Checkbox;
    let exportAutoSync = this._window.document.getElementById(
      "Knowledge4Zotero-export-enableautosync"
    ) as XUL.Checkbox;
    let exportHighlight = this._window.document.getElementById(
      "Knowledge4Zotero-export-enablehighlight"
    ) as XUL.Checkbox;
    let convertSquare = this._window.document.getElementById(
      "Knowledge4Zotero-export-convertsquare"
    ) as XUL.Checkbox;


    if (event) {
      if (
        event.target.id === "Knowledge4Zotero-export-embedLink" &&
        embedLink.checked
      ) {
        exportSingleFile.checked = false;
        exportAutoSync.checked = false;
      }
      if (event.target.id === "Knowledge4Zotero-export-enablesingle") {
        if (exportSingleFile.checked) {
          embedLink.checked = false;
        } else {
          exportAutoSync.checked = false;
        }
      }
    }

    if (exportFile.checked && !embedLink.checked) {
      exportSingleFile.disabled = false;
    } else {
      exportSingleFile.disabled = true;
    }

    if (exportFile.checked && exportSingleFile.checked) {
      exportAutoSync.disabled = false;
    } else {
      exportAutoSync.disabled = true;
    }

    exportHighlight.disabled = !exportFile.checked;
    convertSquare.disabled = !exportFile.checked;
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
    let exportAutoSync = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enableautosync"
      ) as XUL.Checkbox
    ).checked;
    let exportHighlight = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-enablehighlight"
      ) as XUL.Checkbox
    ).checked;
    let convertSquare = (
      this._window.document.getElementById(
        "Knowledge4Zotero-export-convertsquare"
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
    Zotero.Prefs.set("Knowledge4Zotero.exportAutoSync", exportAutoSync);
    Zotero.Prefs.set("Knowledge4Zotero.exportHighlight", exportHighlight);
    Zotero.Prefs.set("Knowledge4Zotero.convertSquare", convertSquare);
    Zotero.Prefs.set("Knowledge4Zotero.embedLink", embedLink);
    Zotero.Prefs.set("Knowledge4Zotero.exportNote", exportNote);
    Zotero.Prefs.set("Knowledge4Zotero.exportCopy", exportCopy);
    Zotero.Prefs.set("Knowledge4Zotero.exportPDF", exportPDF);
    Zotero.debug(this.io);
    Zotero.debug(this.io.dataOut);
    this.io.dataOut = {
      exportFile: exportFile,
      exportSingleFile: exportSingleFile,
      exportAutoSync: exportAutoSync,
      embedLink: embedLink,
      exportNote: exportNote,
      exportCopy: exportCopy,
      exportPDF: exportPDF,
    };
  }
}

export default AddonExport;
