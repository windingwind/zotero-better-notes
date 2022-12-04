/*
 * This file contains sync info window related code.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class SyncInfoWindow extends AddonBase {
  triggerTime: number;
  public io: {
    dataIn: any;
    dataOut: any;
    deferred?: typeof Promise;
  };
  public _window: Window;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  doLoad(_window: Window) {
    if (this._window && !this._window.closed) {
      this._window.close();
    }
    this._window = _window;
    this.io = (this._window as unknown as XUL.XULWindow).arguments[0];
    this.doUpdate();
  }

  doUpdate() {
    const syncInfo = this._Addon.SyncUtils.getSyncStatus(this.io.dataIn);
    const syncPathLable = this._window.document.getElementById(
      "Knowledge4Zotero-sync-path"
    );
    const path = `${decodeURIComponent(syncInfo.path)}/${decodeURIComponent(
      syncInfo.filename
    )}`;

    syncPathLable.setAttribute(
      "value",
      path.length > 50
        ? `${path.slice(0, 25)}...${path.slice(path.length - 25)}`
        : path
    );
    syncPathLable.setAttribute("tooltiptext", path);

    const copyCbk = (event) => {
      Zotero.Utilities.Internal.copyTextToClipboard(event.target.tooltipText);
      this._Addon.ZoteroViews.showProgressWindow(
        "Path Copied",
        event.target.tooltipText
      );
    };
    syncPathLable.removeEventListener("click", copyCbk);
    syncPathLable.addEventListener("click", copyCbk);

    let lastSync: string;
    const lastSyncTime = Number(syncInfo.lastsync);
    const currentTime = new Date().getTime();
    if (currentTime - lastSyncTime <= 60000) {
      lastSync = `${Math.round(
        (currentTime - lastSyncTime) / 1000
      )} seconds ago.`;
    } else if (currentTime - lastSyncTime <= 3600000) {
      lastSync = `${Math.round(
        (currentTime - lastSyncTime) / 60000
      )} minutes ago.`;
    } else {
      lastSync = new Date(lastSyncTime).toLocaleString();
    }
    this._window.document
      .getElementById("Knowledge4Zotero-sync-lastsync")
      .setAttribute("value", lastSync);
    setTimeout(() => {
      if (!this._window.closed) {
        this.doUpdate();
      }
    }, 3000);
  }

  doUnload() {
    this.io.deferred && this.io.deferred.resolve();
  }

  async doAccept() {
    // Update Settings
    let enable = (
      this._window.document.getElementById(
        "Knowledge4Zotero-sync-enable"
      ) as XUL.Checkbox
    ).checked;
    if (!enable) {
      const note = this.io.dataIn;
      const allNoteIds = await this._Addon.SyncController.getRelatedNoteIds(
        note
      );
      const notes = Zotero.Items.get(allNoteIds) as Zotero.Item[];
      for (const item of notes) {
        await this._Addon.SyncController.removeSyncNote(item);
      }
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        `Cancel sync of ${notes.length} notes.`
      );
    }
  }
  doExport() {
    this.io.dataOut.export = true;
    (this._window.document.querySelector("dialog") as any).acceptDialog();
  }
}

export default SyncInfoWindow;
