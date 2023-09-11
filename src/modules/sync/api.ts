import YAML = require("yamljs");
import { getPref, setPref } from "../../utils/prefs";
import { getNoteLinkParams } from "../../utils/link";
import { config } from "../../../package.json";
import { fileExists, formatPath } from "../../utils/str";

export {
  initSyncList,
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

function initSyncList() {
  const rawKeys = getPref("syncNoteIds") as string;
  if (!rawKeys.startsWith("[") || !rawKeys.endsWith("]")) {
    const keys = rawKeys.split(",").map((id) => String(id));
    setPref("syncNoteIds", JSON.stringify(keys));
  }
  addon.data.sync.data = new ztoolkit.LargePref(
    `${config.prefsPrefix}.syncNoteIds`,
    `${config.prefsPrefix}.syncDetail-`,
    "parser",
  );
  // Due to the bug in v1.1.4-22, the sync data may be corrupted
  const keys = addon.data.sync.data?.getKeys().map((key) => String(key));
  setPref("syncNoteIds", JSON.stringify(keys));
}

function getSyncNoteIds(): number[] {
  const keys = addon.data.sync.data?.getKeys();
  if (!keys) {
    return [];
  }
  return Zotero.Items.get(keys)
    .filter((item) => item.isNote())
    .map((item) => item.id);
}

function isSyncNote(noteId: number): boolean {
  return !!addon.data.sync.data?.hasKey(String(noteId));
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

function addSyncNote(noteId: number) {
  addon.data.sync.data?.setKey(String(noteId));
}

function removeSyncNote(noteId: number) {
  addon.data.sync.data?.deleteKey(String(noteId));
}

function updateSyncStatus(noteId: number, status: SyncStatus) {
  addon.data.sync.data?.setValue(String(noteId), status);
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
  const defaultStatus = {
    path: "",
    filename: "",
    md5: "",
    noteMd5: "",
    lastsync: new Date().getTime(),
    itemID: -1,
  };
  const status = {
    ...defaultStatus,
    ...(addon.data.sync.data?.getValue(String(noteId)) as SyncStatus),
  };
  status.path = formatPath(status.path);
  return status;
}

function getMDStatusFromContent(contentRaw: string): MDStatus {
  contentRaw = contentRaw.replace(/\r\n/g, "\n");
  const result = contentRaw.match(/^---\n(.*\n)+?---$/gm);
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
    filepath = formatPath(filepath);
    if (await fileExists(filepath)) {
      const contentRaw = (await Zotero.File.getContentsAsync(
        filepath,
        "utf-8",
      )) as string;
      ret = getMDStatusFromContent(contentRaw);
      const pathSplit = PathUtils.split(filepath);
      ret.filedir = formatPath(pathSplit.slice(0, -1).join("/"));
      ret.filename = pathSplit.pop() || "";
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
    (await fileExists(PathUtils.join(syncStatus.path, syncStatus.filename)))
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
