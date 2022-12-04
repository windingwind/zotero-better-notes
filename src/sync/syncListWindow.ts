/*
 * This file contains sync list window related code.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class SyncListWindow extends AddonBase {
  private _window: Window;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  openSyncList() {
    if (this._window && !this._window.closed) {
      this._window.focus();
      this.doUpdate();
    } else {
      window.open(
        "chrome://Knowledge4Zotero/content/syncList.xul",
        "",
        "chrome,centerscreen,resizable,status,width=600,height=400"
      );
    }
  }

  doLoad(_window: Window) {
    this._window = _window;
    this.doUpdate();
  }

  doUpdate() {
    if (!this._window || this._window.closed) {
      return;
    }
    const notes = Zotero.Items.get(
      this._Addon.SyncController.getSyncNoteIds()
    ) as Zotero.Item[];
    const listbox = this._window.document.getElementById("sync-list");
    let e,
      es = this._window.document.getElementsByTagName("listitem");
    while (es.length > 0) {
      e = es[0];
      e.parentElement.removeChild(e);
    }
    for (const note of notes) {
      const syncInfo = this._Addon.SyncUtils.getSyncStatus(note);
      const listitem: XUL.ListItem =
        this._window.document.createElement("listitem");
      listitem.setAttribute("id", note.id);

      const icon = this._window.document.createElement("listcell");
      icon.setAttribute("class", "listcell-iconic");
      icon.setAttribute("image", "chrome://zotero/skin/treeitem-note.png");

      const name = this._window.document.createElement("listcell");
      name.setAttribute("label", `${note.getNoteTitle()}-${note.key}`);

      let lastSyncString: string;
      const lastSyncTime = Number(syncInfo.lastsync);
      const currentTime = new Date().getTime();
      if (currentTime - lastSyncTime <= 60000) {
        lastSyncString = `${Math.round(
          (currentTime - lastSyncTime) / 1000
        )} seconds ago.`;
      } else if (currentTime - lastSyncTime <= 3600000) {
        lastSyncString = `${Math.round(
          (currentTime - lastSyncTime) / 60000
        )} minutes ago.`;
      } else {
        lastSyncString = new Date(lastSyncTime).toLocaleString();
      }
      const lastSync = this._window.document.createElement("listcell");
      lastSync.setAttribute("label", lastSyncString);

      const syncPath = this._window.document.createElement("listcell");
      syncPath.setAttribute(
        "label",
        `${decodeURIComponent(syncInfo.path)}/${decodeURIComponent(
          syncInfo.filename
        )}`
      );

      listitem.append(icon, name, lastSync, syncPath);

      listitem.addEventListener("dblclick", (e) => {
        ZoteroPane.openNoteWindow(note.id);
      });
      listbox.append(listitem);
    }

    const periodButton = this._window.document.getElementById(
      "changesyncperiod"
    ) as XUL.Button;
    const period =
      Number(Zotero.Prefs.get("Knowledge4Zotero.syncPeriod")) / 1000;
    periodButton.setAttribute(
      "label",
      periodButton.getAttribute("label").split(":")[0] +
        ":" +
        (period > 0 ? period + "s" : "disabled")
    );
    this._window.focus();
    this.onSelect();
  }

  getSelectedItems(): Zotero.Item[] {
    return Zotero.Items.get(
      Array.prototype.map.call(
        (this._window.document.getElementById("sync-list") as any)
          .selectedItems,
        (node) => node.id
      ) as string[]
    );
  }

  onSelect() {
    const selected =
      (this._window.document.getElementById("sync-list") as any).selectedItems
        .length > 0;
    if (selected) {
      this._window.document
        .querySelector("#changesync")
        .removeAttribute("disabled");
      this._window.document
        .querySelector("#removesync")
        .removeAttribute("disabled");
    } else {
      this._window.document
        .querySelector("#changesync")
        .setAttribute("disabled", "true");
      this._window.document
        .querySelector("#removesync")
        .setAttribute("disabled", "true");
    }
  }

  useRelated(): Boolean {
    return confirm(
      "Apply changes to:\n[Yes] Selected note and it's linked notes\n[No] Only selected note"
    );
  }

  async doSync() {
    await this._Addon.SyncController.doSync(this.getSelectedItems(), false);
    this.doUpdate();
  }

  async changeSync() {
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) {
      return;
    }
    await this._Addon.NoteExport.exportNotesToMDFiles(selectedItems, {
      useEmbed: false,
      useSync: true,
    });
    this.doUpdate();
  }

  changeSyncPeriod(period: number = -1) {
    if (period < 0) {
      const inputPeriod = prompt("Enter synchronization period in seconds:");
      if (inputPeriod) {
        period = Number(inputPeriod);
      } else {
        return;
      }
    }
    if (period < 0) {
      period = 0;
    }
    Zotero.Prefs.set("Knowledge4Zotero.syncPeriod", Math.round(period) * 1000);
    this.doUpdate();
  }

  async removeSync() {
    let selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) {
      return;
    }
    if (this.useRelated()) {
      let noteIds: number[] =
        await this._Addon.SyncController.getRelatedNoteIdsFromNotes(
          selectedItems
        );
      selectedItems = Zotero.Items.get(noteIds) as Zotero.Item[];
    }
    for (const note of selectedItems) {
      await this._Addon.SyncController.removeSyncNote(note);
    }
    this.doUpdate();
  }
}

export default SyncListWindow;
