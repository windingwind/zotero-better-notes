import YAML = require("yamljs");
import { showHint } from "../../utils/hint";
import { getNoteLinkParams } from "../../utils/link";
import { clearPref, getPref, setPref } from "../../utils/prefs";
import { getString } from "../../utils/locale";

export {
  getRelatedNoteIds,
  removeSyncNote,
  isSyncNote,
  getSyncNoteIds,
  addSyncNote,
  updateSyncStatus,
  doSync,
  setSync,
  getSyncStatus,
  getNoteStatus,
  getMDStatus,
  getMDStatusFromContent,
  getMDFileName,
};

function getSyncNoteIds(): number[] {
  const ids = getPref("syncNoteIds") as string;
  return Zotero.Items.get(ids.split(",").map((id: string) => Number(id)))
    .filter((item) => item.isNote())
    .map((item) => item.id);
}

function isSyncNote(noteId: number): boolean {
  const syncNoteIds = getSyncNoteIds();
  return syncNoteIds.includes(noteId);
}

async function getRelatedNoteIds(noteId: number): Promise<number[]> {
  let allNoteIds: number[] = [noteId];
  const note = Zotero.Items.get(noteId);
  const linkMatches = note.getNote().match(/zotero:\/\/note\/\w+\/\w+\//g);
  if (!linkMatches) {
    return allNoteIds;
  }
  const subNoteIds = (
    await Promise.all(
      linkMatches.map(async (link) => getNoteLinkParams(link).noteItem)
    )
  )
    .filter((item) => item && item.isNote())
    .map((item) => (item as Zotero.Item).id);
  allNoteIds = allNoteIds.concat(subNoteIds);
  allNoteIds = new Array(...new Set(allNoteIds));
  return allNoteIds;
}

async function getRelatedNoteIdsFromNotes(
  noteIds: number[]
): Promise<number[]> {
  let allNoteIds: number[] = [];
  for (const noteId of noteIds) {
    allNoteIds = allNoteIds.concat(await getRelatedNoteIds(noteId));
  }
  return allNoteIds;
}

function addSyncNote(noteId: number) {
  const ids = getSyncNoteIds();
  if (ids.includes(noteId)) {
    return;
  }
  ids.push(noteId);
  setPref("syncNoteIds", ids.join(","));
}

function removeSyncNote(noteId: number) {
  const ids = getSyncNoteIds();
  setPref("syncNoteIds", ids.filter((id) => id !== noteId).join(","));
  clearPref(`syncDetail-${noteId}`);
}

function updateSyncStatus(noteId: number, status: SyncStatus) {
  addSyncNote(noteId);
  setPref(`syncDetail-${noteId}`, JSON.stringify(status));
}
function getNoteStatus(noteId: number) {
  const noteItem = Zotero.Items.get(noteId);
  if (!noteItem?.isNote()) {
    return;
  }
  const fullContent = noteItem.getNote();
  const ret = {
    meta: "",
    content: "",
    tail: "</div>",
    lastmodify: Zotero.Date.sqlToDate(noteItem.dateModified, true),
  };
  const metaRegex = /"?data-schema-version"?="[0-9]*">/;
  const match = fullContent?.match(metaRegex);
  if (!match || match.length == 0) {
    ret.meta = '<div "data-schema-version"="9">';
    ret.content = fullContent || "";
    return ret;
  }
  const idx = fullContent.search(metaRegex);
  if (idx != -1) {
    ret.content = fullContent.substring(
      idx + match[0].length,
      fullContent.length - ret.tail.length
    );
  }
  return ret;
}

function getSyncStatus(noteId?: number): SyncStatus {
  const defaultStatus = JSON.stringify({
    path: "",
    filename: "",
    md5: "",
    noteMd5: "",
    lastsync: new Date().getTime(),
    itemID: -1,
  });
  return JSON.parse(
    (getPref(`syncDetail-${noteId}`) as string) || defaultStatus
  );
}

function getMDStatusFromContent(contentRaw: string): MDStatus {
  const result = contentRaw.match(/^---([\s\S]*)---\n/);
  const ret: MDStatus = {
    meta: { version: -1 },
    content: contentRaw,
    filedir: "",
    filename: "",
    lastmodify: new Date(0),
  };
  if (result) {
    const yaml = result[0].replace(/---/g, "");
    ret.content = contentRaw.slice(result[0].length);
    try {
      ret.meta = YAML.parse(yaml);
    } catch (e) {
      ztoolkit.log(e);
    }
  }
  return ret;
}

async function getMDStatus(
  source: Zotero.Item | number | string
): Promise<MDStatus> {
  let ret: MDStatus = {
    meta: null,
    content: "",
    filedir: "",
    filename: "",
    lastmodify: new Date(0),
  };
  try {
    let filepath = "";
    if (typeof source === "string") {
      filepath = source;
    } else if (typeof source === "number") {
      const syncStatus = getSyncStatus(source);
      filepath = `${syncStatus.path}/${syncStatus.filename}`;
    } else if (source.isNote && source.isNote()) {
      const syncStatus = getSyncStatus(source.id);
      filepath = `${syncStatus.path}/${syncStatus.filename}`;
    }
    filepath = Zotero.File.normalizeToUnix(filepath);
    if (await OS.File.exists(filepath)) {
      let contentRaw = (await OS.File.read(filepath, {
        encoding: "utf-8",
      })) as string;
      ret = getMDStatusFromContent(contentRaw);
      const pathSplit = filepath.split("/");
      ret.filedir = Zotero.File.normalizeToUnix(
        pathSplit.slice(0, -1).join("/")
      );
      ret.filename = filepath.split("/").pop() || "";
      const stat = await OS.File.stat(filepath);
      ret.lastmodify = stat.lastModificationDate;
    }
  } catch (e) {
    ztoolkit.log(e);
  }
  return ret;
}

async function getMDFileName(noteId: number, searchDir?: string) {
  const noteItem = Zotero.Items.get(noteId);
  if (searchDir !== undefined && (await OS.File.exists(searchDir))) {
    const mdRegex = /\.(md|MD|Md|mD)$/;
    let matchedFileName = null;
    let matchedDate = new Date(0);
    await Zotero.File.iterateDirectory(
      searchDir,
      async (entry: OS.File.Entry) => {
        if (entry.isDir) return;
        if (mdRegex.test(entry.name)) {
          if (
            entry.name.split(".").shift()?.split("-").pop() === noteItem.key
          ) {
            const stat = await OS.File.stat(entry.path);
            if (stat.lastModificationDate > matchedDate) {
              matchedFileName = entry.name;
              matchedDate = stat.lastModificationDate;
            }
          }
        }
      }
    );
    if (matchedFileName) {
      return matchedFileName;
    }
  }
  return await addon.api.template.runTemplate(
    "[ExportMDFileNameV2]",
    "noteItem",
    [noteItem]
  );
}

function setSync() {
  const syncPeriod = getPref("syncPeriodSeconds") as number;
  if (syncPeriod > 0) {
    showHint(`${getString("sync.start.hint")} ${syncPeriod} s`);
    const timer = ztoolkit.getGlobal("setInterval")(() => {
      if (!addon.data.alive) {
        showHint(getString("sync.stop.hint"));
        ztoolkit.getGlobal("clearInterval")(timer);
      }
      // Only when Zotero is active and focused
      if (document.hasFocus() && (getPref("syncPeriodSeconds") as number) > 0) {
        doSync(undefined, { quiet: true, skipActive: true, reason: "auto" });
      }
    }, Number(syncPeriod) * 1000);
  }
}

async function doCompare(noteItem: Zotero.Item): Promise<SyncCode> {
  const syncStatus = getSyncStatus(noteItem.id);
  const MDStatus = await getMDStatus(noteItem.id);
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

async function doSync(
  items: Zotero.Item[] = [],
  { quiet, skipActive, reason } = {
    quiet: true,
    skipActive: true,
    reason: "unknown",
  }
) {
  // Always log in development mode
  if (addon.data.env === "development") {
    quiet = false;
  }
  if (addon.data.sync.lock) {
    // Only allow one task
    return;
  }
  let progress;
  // Wrap the code in try...catch so that the lock can be released anyway
  try {
    addon.data.sync.lock = true;
    let skippedCount = 0;
    if (!items || !items.length) {
      items = Zotero.Items.get(getSyncNoteIds());
    } else {
      items = items.filter((item) => isSyncNote(item.id));
    }
    if (items.length === 0) {
      return;
    }
    if (skipActive) {
      // Skip active note editors' targets
      const activeNoteIds = Zotero.Notes._editorInstances
        .filter((editor) => editor._iframeWindow.document.hasFocus())
        .map((editor) => editor._item.id);
      const filteredItems = items.filter(
        (item) => !activeNoteIds.includes(item.id)
      );
      skippedCount = items.length - filteredItems.length;
      items = filteredItems;
    }
    ztoolkit.log("sync start", reason, items, skippedCount);

    if (!quiet) {
      progress = new ztoolkit.ProgressWindow(
        `[${getString("sync.running.hint.title")}] ${
          addon.data.env === "development" ? reason : "Better Notes"
        }`
      )
        .createLine({
          text: `[${getString("sync.running.hint.check")}] 0/${
            items.length
          } ...`,
          type: "default",
          progress: 1,
        })
        .show(-1);
    }
    // Export items of same dir in batch
    const toExport = {} as Record<string, number[]>;
    const toImport: SyncStatus[] = [];
    const toDiff: SyncStatus[] = [];
    let i = 1;
    for (const item of items) {
      const syncStatus = getSyncStatus(item.id);
      const filepath = syncStatus.path;
      let compareResult = await doCompare(item);
      switch (compareResult) {
        case SyncCode.NoteAhead:
          if (Object.keys(toExport).includes(filepath)) {
            toExport[filepath].push(item.id);
          } else {
            toExport[filepath] = [item.id];
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
      progress?.changeLine({
        text: `[${getString("sync.running.hint.check")}] ${i}/${
          items.length
        } ...`,
        progress: ((i - 1) / items.length) * 100,
      });
      i += 1;
    }
    ztoolkit.log("will be synced:", toExport, toImport, toDiff);
    i = 1;
    let totalCount = Object.keys(toExport).length;
    for (const filepath of Object.keys(toExport)) {
      progress?.changeLine({
        text: `[${getString("sync.running.hint.updateMD")}] ${i}/${
          items.length
        } ...`,
        progress: ((i - 1) / items.length) * 100,
      });
      await addon.api._export.syncMDBatch(filepath, toExport[filepath]);
      i += 1;
    }
    i = 1;
    totalCount = toImport.length;
    for (const syncStatus of toImport) {
      progress?.changeLine({
        text: `[${getString(
          "sync.running.hint.updateNote"
        )}] ${i}/${totalCount}, ${toDiff.length} queuing...`,
        progress: ((i - 1) / totalCount) * 100,
      });
      const item = Zotero.Items.get(syncStatus.itemID);
      const filepath = OS.Path.join(syncStatus.path, syncStatus.filename);
      await addon.api._import.fromMD(filepath, { noteId: item.id });
      // Update md file to keep the metadata synced
      await addon.api._export.syncMDBatch(syncStatus.path, [item.id]);
      i += 1;
    }
    i = 1;
    totalCount = toDiff.length;
    for (const syncStatus of toDiff) {
      progress?.changeLine({
        text: `[${getString("sync.running.hint.diff")}] ${i}/${totalCount}...`,
        progress: ((i - 1) / totalCount) * 100,
      });

      await addon.api.window.showSyncDiff(
        syncStatus.itemID,
        OS.Path.join(syncStatus.path, syncStatus.filename)
      );
      i += 1;
    }
    const syncCount =
      Object.keys(toExport).length + toImport.length + toDiff.length;
    progress?.changeLine({
      text:
        (syncCount
          ? `[${getString(
              "sync.running.hint.finish"
            )}] ${syncCount} ${getString("sync.running.hint.synced")}`
          : `[${getString("sync.running.hint.finish")}] ${getString(
              "sync.running.hint.upToDate"
            )}`) + (skippedCount ? `, ${skippedCount} skipped.` : ""),
      progress: 100,
    });
  } catch (e) {
    ztoolkit.log(e);
    showHint(`Sync Error: ${String(e)}`);
  } finally {
    progress?.startCloseTimer(5000);
  }
  addon.data.sync.lock = false;
}

enum SyncCode {
  UpToDate = 0,
  NoteAhead,
  MDAhead,
  NeedDiff,
}
