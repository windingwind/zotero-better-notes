import YAML = require("yamljs");
import { clearPref, getPref, setPref } from "../../utils/prefs";
import { getNoteLinkParams } from "../../utils/link";
import { config } from "../../../package.json";
import { fileExists } from "../../utils/str";

export {
  getRelatedNoteIds,
  removeSyncNote,
  isSyncNote,
  getSyncNoteIds,
  addSyncNote,
  updateSyncStatus,
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
      linkMatches.map(async (link) => getNoteLinkParams(link).noteItem),
    )
  )
    .filter((item) => item && item.isNote())
    .map((item) => (item as Zotero.Item).id);
  allNoteIds = allNoteIds.concat(subNoteIds);
  allNoteIds = new Array(...new Set(allNoteIds));
  return allNoteIds;
}

async function getRelatedNoteIdsFromNotes(
  noteIds: number[],
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
    ret.meta = `<div "data-schema-version"="${config.dataSchemaVersion}">`;
    ret.content = fullContent || "";
    return ret;
  }
  const idx = fullContent.search(metaRegex);
  if (idx != -1) {
    ret.content = fullContent.substring(
      idx + match[0].length,
      fullContent.length - ret.tail.length,
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
    (getPref(`syncDetail-${noteId}`) as string) || defaultStatus,
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
  source: Zotero.Item | number | string,
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
      filepath = PathUtils.join(syncStatus.path, syncStatus.filename);
    } else if (source.isNote && source.isNote()) {
      const syncStatus = getSyncStatus(source.id);
      filepath = PathUtils.join(syncStatus.path, syncStatus.filename);
    }
    filepath = Zotero.File.normalizeToUnix(filepath);
    if (await fileExists(filepath)) {
      const contentRaw = (await Zotero.File.getContentsAsync(
        filepath,
        "utf-8",
      )) as string;
      ret = getMDStatusFromContent(contentRaw);
      const pathSplit = filepath.split("/");
      ret.filedir = Zotero.File.normalizeToUnix(
        pathSplit.slice(0, -1).join("/"),
      );
      ret.filename = filepath.split("/").pop() || "";
      const stat = await IOUtils.stat(filepath);
      ret.lastmodify = new Date(stat.lastModified);
    }
  } catch (e) {
    ztoolkit.log(e);
  }
  return ret;
}

async function getMDFileName(noteId: number, searchDir?: string) {
  const syncStatus = getSyncStatus(noteId);
  // If the note is already synced, use the filename in sync status
  if (
    (!searchDir || searchDir === syncStatus.path) &&
    syncStatus.filename &&
    (await fileExists(`${syncStatus.path}/${syncStatus.filename}`))
  ) {
    return syncStatus.filename;
  }
  // If the note is not synced or the synced file does not exists, search for the latest file with the same key
  const noteItem = Zotero.Items.get(noteId);
  if (searchDir !== undefined && (await fileExists(searchDir))) {
    const mdRegex = /\.(md|MD|Md|mD)$/;
    let matchedFileName = null;
    let matchedDate = 0;
    await Zotero.File.iterateDirectory(
      searchDir,
      async (entry: OS.File.Entry) => {
        if (entry.isDir) return;
        if (mdRegex.test(entry.name)) {
          if (
            entry.name.split(".").shift()?.split("-").pop() === noteItem.key
          ) {
            const stat = await IOUtils.stat(entry.path);
            if (stat.lastModified > matchedDate) {
              matchedFileName = entry.name;
              matchedDate = stat.lastModified;
            }
          }
        }
      },
    );
    if (matchedFileName) {
      return matchedFileName;
    }
  }
  // If no file found, use the template to generate a new filename
  return await addon.api.template.runTemplate(
    "[ExportMDFileNameV2]",
    "noteItem",
    [noteItem],
  );
}
