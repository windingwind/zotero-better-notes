/*
 * This file contains note export window code.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class NoteExportWindow extends AddonBase {
  private io: {
    dataIn: any;
    dataOut: any;
    deferred?: typeof Promise;
  };
  private _window: Window;
  private options: string[];

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.options = [
      "embedLink",
      "exportNote",
      "exportMD",
      "exportSubMD",
      "exportAutoSync",
      "exportHighlight",
      "convertSquare",
      "exportDocx",
      "exportPDF",
      "exportFreeMind",
    ];
  }

  getOption(optionKey: string) {
    return (this._window.document.getElementById(optionKey) as XUL.Checkbox)
      ?.checked;
  }

  setOption(optionKey: string, checked: boolean) {
    (this._window.document.getElementById(optionKey) as XUL.Checkbox).checked =
      checked;
  }

  setOptionDisabled(optionKey: string, disabled: boolean) {
    (this._window.document.getElementById(optionKey) as XUL.Checkbox).disabled =
      disabled;
  }

  doLoad(_window: Window) {
    this._window = _window;

    this.io = (this._window as unknown as XUL.XULWindow).arguments[0];

    const initOptions = (optionKey: string) => {
      let pref = Zotero.Prefs.get(`Knowledge4Zotero.${optionKey}`) as boolean;
      if (typeof pref !== "undefined") {
        this.setOption(optionKey, pref);
      }
    };
    this.options.forEach(initOptions);
    this.doUpdate();
  }

  doUpdate(event?: XUL.XULEvent) {
    if (event) {
      if (event.target.id === "embedLink" && this.getOption("embedLink")) {
        this.setOption("exportSubMD", false);
        this.setOption("exportAutoSync", false);
      }
      if (event.target.id === "exportSubMD") {
        if (this.getOption("exportSubMD")) {
          this.setOption("embedLink", false);
        } else {
          this.setOption("exportAutoSync", false);
        }
      }
    }

    this.setOptionDisabled(
      "exportSubMD",
      !this.getOption("exportMD") || this.getOption("embedLink")
    );

    this.setOptionDisabled(
      "exportAutoSync",
      !this.getOption("exportMD") || !this.getOption("exportSubMD")
    );
    this.setOptionDisabled("exportHighlight", !this.getOption("exportMD"));
    this.setOptionDisabled("convertSquare", !this.getOption("exportMD"));
  }

  doUnload() {
    this.io.deferred && this.io.deferred.resolve();
  }

  doAccept() {
    this.io.dataOut = {};
    const saveOptions = (optionKey: string) => {
      const pref = this.getOption(optionKey);
      Zotero.Prefs.set(`Knowledge4Zotero.${optionKey}`, pref);
      this.io.dataOut[optionKey] = pref;
    };
    this.options.forEach(saveOptions);

    Zotero.debug(this.io);
    Zotero.debug(this.io.dataOut);
  }
}

export default NoteExportWindow;
