import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class SyncController extends AddonBase {
  triggerTime: number;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  getSyncNoteIds(): number[] {
    const ids = Zotero.Prefs.get("Knowledge4Zotero.syncNoteIds") as string;
    return ids.split(",").map((id: string) => Number(id));
  }

  isSyncNote(note: Zotero.Item): boolean {
    const syncNoteIds = this.getSyncNoteIds();
    return syncNoteIds.includes(note.id);
  }

  async getRelatedNoteIds(note: Zotero.Item): Promise<number[]> {
    let allNoteIds: number[] = [note.id];
    const linkMatches = note.getNote().match(/zotero:\/\/note\/\w+\/\w+\//g);
    if (!linkMatches) {
      return allNoteIds;
    }
    const subNoteIds = (
      await Promise.all(
        linkMatches.map(async (link) =>
          this._Addon.NoteUtils.getNoteFromLink(link)
        )
      )
    )
      .filter((res) => res.item)
      .map((res) => res.item.id);
    allNoteIds = allNoteIds.concat(subNoteIds);
    allNoteIds = new Array(...new Set(allNoteIds));
    return allNoteIds;
  }

  async getRelatedNoteIdsFromNotes(notes: Zotero.Item[]): Promise<number[]> {
    let allNoteIds: number[] = [];
    for (const note of notes) {
      allNoteIds = allNoteIds.concat(await this.getRelatedNoteIds(note));
    }
    return allNoteIds;
  }

  addSyncNote(noteItem: Zotero.Item) {
    const ids = this.getSyncNoteIds();
    if (ids.includes(noteItem.id)) {
      return;
    }
    ids.push(noteItem.id);
    Zotero.Prefs.set("Knowledge4Zotero.syncNoteIds", ids.join(","));
  }

  async removeSyncNote(noteItem: Zotero.Item) {
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

  getNoteSyncStatus(noteItem: Zotero.Item): any {
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
    noteItem: Zotero.Item,
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
    items: Zotero.Item[] = null,
    force: boolean = false,
    useIO: boolean = true
  ) {
    Zotero.debug("Better Notes: sync start");
    items = items || (Zotero.Items.get(this.getSyncNoteIds()) as Zotero.Item[]);
    const toExport = {};
    const forceNoteIds = force
      ? await this.getRelatedNoteIdsFromNotes(
          useIO ? [this._Addon.SyncInfoWindow.io.dataIn] : items
        )
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
      await this._Addon.NoteExport.syncNotesToFile(
        toExport[filepath],
        filepath
      );
    }
    if (this._Addon.SyncInfoWindow._window && !this._Addon.SyncInfoWindow._window.closed) {
      this._Addon.SyncInfoWindow.doUpdate();
    }
  }
}

export default SyncController;
