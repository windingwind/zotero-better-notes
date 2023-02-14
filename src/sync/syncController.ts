/*
 * This file realizes the sycn feature.
 */

import BetterNotes from "../addon";
import AddonBase from "../module";
import { SyncCode } from "../utils";

class SyncController extends AddonBase {
  sycnLock: boolean;

  constructor(parent: BetterNotes) {
    super(parent);
    this.sycnLock = false;
  }

  getSyncNoteIds(): number[] {
    const ids = Zotero.Prefs.get("Knowledge4Zotero.syncNoteIds") as string;
    return Zotero.Items.get(ids.split(",").map((id: string) => Number(id)))
      .filter((item) => item.isNote())
      .map((item) => item.id);
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
    Zotero.Prefs.clear(`Knowledge4Zotero.syncDetail-${noteItem.id}`);
  }

  async doCompare(noteItem: Zotero.Item): Promise<SyncCode> {
    const syncStatus = this._Addon.SyncUtils.getSyncStatus(noteItem);
    const MDStatus = await this._Addon.SyncUtils.getMDStatus(noteItem);
    // No file found
    if (!MDStatus.meta) {
      return SyncCode.NoteAhead;
    }
    // File meta is unavailable
    if (MDStatus.meta.version < 0) {
      return SyncCode.NeedDiff;
    }
    let MDAhead = false;
    let noteAhead = false;
    const md5 = Zotero.Utilities.Internal.md5(MDStatus.content, false);
    const noteMd5 = Zotero.Utilities.Internal.md5(noteItem.getNote(), false);
    // MD5 doesn't match (md side change)
    if (md5 !== syncStatus.md5) {
      MDAhead = true;
    }
    // MD5 doesn't match (note side change)
    if (noteMd5 !== syncStatus.noteMd5) {
      noteAhead = true;
    }
    // Note version doesn't match (note side change)
    // This might be unreliable when Zotero account is not login
    if (Number(MDStatus.meta.version) !== noteItem.version) {
      noteAhead = true;
    }
    if (noteAhead && MDAhead) {
      return SyncCode.NeedDiff;
    } else if (noteAhead) {
      return SyncCode.NoteAhead;
    } else if (MDAhead) {
      return SyncCode.MDAhead;
    } else {
      return SyncCode.UpToDate;
    }
  }

  async updateNoteSyncStatus(noteItem: Zotero.Item, status: SyncStatus) {
    this.addSyncNote(noteItem);
    Zotero.Prefs.set(
      `Knowledge4Zotero.syncDetail-${noteItem.id}`,
      JSON.stringify(status)
    );
  }

  setSync() {
    const syncPeriod = Zotero.Prefs.get(
      "Knowledge4Zotero.syncPeriod"
    ) as number;
    if (syncPeriod > 0) {
      setInterval(() => {
        // Only when Zotero is active and focused
        if (document.hasFocus()) {
          this.doSync();
        }
      }, syncPeriod);
    }
  }

  async doSync(items: Zotero.Item[] = null, quiet: boolean = true) {
    if (this.sycnLock) {
      // Only allow one task
      return;
    }
    let progress;
    // Wrap the code in try...catch so that the lock can be released anyway
    try {
      this._Addon.toolkit.Tool.log("sync start");
      this.sycnLock = true;
      if (!items || !items.length) {
        items = Zotero.Items.get(this.getSyncNoteIds());
      }
      this._Addon.toolkit.Tool.log("BN:Sync", items);

      if (!quiet) {
        progress = this._Addon.ZoteroViews.showProgressWindow(
          "[Syncing] Better Notes",
          `[Check Status] 0/${items.length} ...`,
          "default",
          -1
        );
        progress.progress.setProgress(1);
        await this._Addon.ZoteroViews.waitProgressWindow(progress);
      }
      // Export items of same dir in batch
      const toExport = {};
      const toImport: SyncStatus[] = [];
      const toDiff: SyncStatus[] = [];
      let i = 1;
      for (const item of items) {
        const syncStatus = this._Addon.SyncUtils.getSyncStatus(item);
        const filepath = decodeURIComponent(syncStatus.path);
        let compareResult = await this.doCompare(item);
        switch (compareResult) {
          case SyncCode.NoteAhead:
            if (Object.keys(toExport).includes(filepath)) {
              toExport[filepath].push(item);
            } else {
              toExport[filepath] = [item];
            }
            break;
          case SyncCode.MDAhead:
            toImport.push(syncStatus);
            break;
          case SyncCode.NeedDiff:
            toDiff.push(syncStatus);
            break;
          default:
            break;
        }
        if (progress) {
          this._Addon.ZoteroViews.changeProgressWindowDescription(
            progress,
            `[Check Status] ${i}/${items.length} ...`
          );
          progress.progress.setProgress((i / items.length) * 100);
        }
        i += 1;
      }
      this._Addon.toolkit.Tool.log(toExport, toImport, toDiff);
      i = 1;
      let totalCount = Object.keys(toExport).length;
      for (const filepath of Object.keys(toExport)) {
        if (progress) {
          this._Addon.ZoteroViews.changeProgressWindowDescription(
            progress,
            `[Update MD] ${i}/${totalCount}, ${
              toImport.length + toDiff.length
            } queuing...`
          );
          progress.progress.setProgress(((i - 1) / totalCount) * 100);
        }

        await this._Addon.NoteExport.exportNotesToMDFiles(toExport[filepath], {
          useEmbed: false,
          useSync: true,
          filedir: filepath,
          withMeta: true,
        });
        i += 1;
      }
      i = 1;
      totalCount = toImport.length;
      for (const syncStatus of toImport) {
        if (progress) {
          this._Addon.ZoteroViews.changeProgressWindowDescription(
            progress,
            `[Update Note] ${i}/${totalCount}, ${toDiff.length} queuing...`
          );
          progress.progress.setProgress(((i - 1) / totalCount) * 100);
        }
        const item = Zotero.Items.get(syncStatus.itemID);
        const filepath = OS.Path.join(syncStatus.path, syncStatus.filename);
        await this._Addon.NoteImport.importMDFileToNote(filepath, item, {});
        await this._Addon.NoteExport.exportNotesToMDFiles([item], {
          useEmbed: false,
          useSync: true,
          filedir: syncStatus.path,
          withMeta: true,
        });
        i += 1;
      }
      i = 1;
      totalCount = toDiff.length;
      for (const syncStatus of toDiff) {
        if (progress) {
          this._Addon.ZoteroViews.changeProgressWindowDescription(
            progress,
            `[Compare Diff] ${i}/${totalCount}...`
          );
          progress.progress.setProgress(((i - 1) / totalCount) * 100);
        }

        const item = Zotero.Items.get(syncStatus.itemID);
        await this._Addon.SyncDiffWindow.doDiff(
          item,
          OS.Path.join(syncStatus.path, syncStatus.filename)
        );
        i += 1;
      }
      if (
        this._Addon.SyncInfoWindow._window &&
        !this._Addon.SyncInfoWindow._window.closed
      ) {
        this._Addon.SyncInfoWindow.doUpdate();
      }
      if (progress) {
        const syncCount =
          Object.keys(toExport).length + toImport.length + toDiff.length;

        this._Addon.ZoteroViews.changeProgressWindowDescription(
          progress,
          syncCount
            ? `[Finish] Sync ${syncCount} notes successfully`
            : "[Finish] Already up to date"
        );
        progress.progress.setProgress(100);
        progress.startCloseTimer(5000);
      }
    } catch (e) {
      this._Addon.toolkit.Tool.log(e);
      this._Addon.ZoteroViews.showProgressWindow(
        "[Syncing] Better Notes",
        String(e),
        "fail"
      );
    } finally {
      if (progress) {
        progress.startCloseTimer(5000);
      }
    }
    this.sycnLock = false;
  }
}

export default SyncController;
