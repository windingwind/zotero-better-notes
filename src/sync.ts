import { AddonBase } from "./base";

class AddonSync extends AddonBase {
  triggerTime: number;
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
    if (this._window && !this._window.closed) {
      this._window.close();
    }
    this._window = _window;
    this.io = (this._window as unknown as XULWindow).arguments[0];
    this.doUpdate();
  }

  doUpdate() {
    const syncInfo = this.getNoteSyncStatus(this.io.dataIn);
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
      this._Addon.views.showProgressWindow(
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
      const allNoteIds = await this.getRelatedNoteIds(note);
      const notes = Zotero.Items.get(allNoteIds);
      for (const item of notes) {
        await this.removeSyncNote(item);
      }
      this._Addon.views.showProgressWindow(
        "Better Notes",
        `Cancel sync of ${notes.length} notes.`
      );
    }
  }
  doExport() {
    this.io.dataOut.export = true;
    (this._window.document.querySelector("dialog") as any).acceptDialog();
  }

  getSyncNoteIds(): Number[] {
    const ids = Zotero.Prefs.get("Knowledge4Zotero.syncNoteIds");
    if (typeof ids === "undefined") {
      Zotero.Prefs.set("Knowledge4Zotero.syncNoteIds", "");
      return [];
    }
    return ids.split(",").map((id: string) => Number(id));
  }

  isSyncNote(note: ZoteroItem): boolean {
    const syncNoteIds = this._Addon.sync.getSyncNoteIds();
    return syncNoteIds.includes(note.id);
  }

  async getRelatedNoteIds(note: ZoteroItem): Promise<Number[]> {
    let allNoteIds: Number[] = [note.id];
    const linkMatches = note.getNote().match(/zotero:\/\/note\/\w+\/\w+\//g);
    if (!linkMatches) {
      return allNoteIds;
    }
    const subNoteIds = (
      await Promise.all(
        linkMatches.map(async (link) =>
          this._Addon.knowledge.getNoteFromLink(link)
        )
      )
    )
      .filter((res) => res.item)
      .map((res) => res.item.id);
    allNoteIds = allNoteIds.concat(subNoteIds);
    allNoteIds = new Array(...new Set(allNoteIds));
    return allNoteIds;
  }

  async getRelatedNoteIdsFromNotes(notes: ZoteroItem[]): Promise<Number[]> {
    let allNoteIds: Number[] = [];
    for (const note of notes) {
      allNoteIds = allNoteIds.concat(await this.getRelatedNoteIds(note));
    }
    return allNoteIds;
  }

  addSyncNote(noteItem: ZoteroItem) {
    const ids = this.getSyncNoteIds();
    if (ids.includes(noteItem.id)) {
      return;
    }
    ids.push(noteItem.id);
    Zotero.Prefs.set("Knowledge4Zotero.syncNoteIds", ids.join(","));
  }

  async removeSyncNote(noteItem: ZoteroItem) {
    const ids = this.getSyncNoteIds();
    Zotero.Prefs.set(
      "Knowledge4Zotero.syncNoteIds",
      ids.filter((id) => id !== noteItem.id).join(",")
    );
    const sycnTag = noteItem.getTags().find((t) => t.tag.includes("sync://"));
    if (sycnTag) {
      noteItem.removeTag(sycnTag.tag);
    }
    await noteItem.saveTx();
  }

  getNoteSyncStatus(noteItem: ZoteroItem): any {
    const sycnInfo = noteItem.getTags().find((t) => t.tag.includes("sync://"));
    if (!sycnInfo) {
      return false;
    }
    const params = {};
    sycnInfo.tag
      .split("?")
      .pop()
      .split("&")
      .forEach((p) => {
        params[p.split("=")[0]] = p.split("=")[1];
      });
    return params;
  }

  async updateNoteSyncStatus(
    noteItem: ZoteroItem,
    path: string = "",
    filename: string = ""
  ) {
    this.addSyncNote(noteItem);
    const syncInfo = this.getNoteSyncStatus(noteItem);
    const sycnTag = noteItem.getTags().find((t) => t.tag.includes("sync://"));
    if (sycnTag) {
      noteItem.removeTag(sycnTag.tag);
    }
    noteItem.addTag(
      `sync://note/?version=${noteItem._version + 1}&path=${
        path ? encodeURIComponent(path) : syncInfo["path"]
      }&filename=${
        filename ? encodeURIComponent(filename) : syncInfo["filename"]
      }&lastsync=${new Date().getTime()}`,
      undefined
    );
    await noteItem.saveTx();
  }

  setSync() {
    const _t = new Date().getTime();
    this.triggerTime = _t;
    const syncPeriod = Number(Zotero.Prefs.get("Knowledge4Zotero.syncPeriod"));
    if (syncPeriod > 0) {
      setTimeout(() => {
        if (this.triggerTime === _t) {
          this.doSync();
        }
      }, syncPeriod);
    }
  }

  async doSync(
    items: ZoteroItem[] = null,
    force: boolean = false,
    useIO: boolean = true
  ) {
    Zotero.debug("Better Notes: sync start");
    items = items || Zotero.Items.get(this.getSyncNoteIds());
    const toExport = {};
    const forceNoteIds = force
      ? await this.getRelatedNoteIdsFromNotes(useIO ? [this.io.dataIn] : items)
      : [];
    for (const item of items) {
      const syncInfo = this.getNoteSyncStatus(item);
      const filepath = decodeURIComponent(syncInfo.path);
      const filename = decodeURIComponent(syncInfo.filename);
      if (
        Number(syncInfo.version) < item._version ||
        !(await OS.File.exists(`${filepath}/${filename}`)) ||
        forceNoteIds.includes(item.id)
      ) {
        if (Object.keys(toExport).includes(filepath)) {
          toExport[filepath].push(item);
        } else {
          toExport[filepath] = [item];
        }
      }
    }
    console.log(toExport);
    for (const filepath of Object.keys(toExport)) {
      await this._Addon.knowledge.syncNotesToFile(toExport[filepath], filepath);
    }
    if (this._window && !this._window.closed) {
      this.doUpdate();
    }
  }
}

export default AddonSync;
