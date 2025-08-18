import YAML = require("yamljs");
import { getPref, setPref } from "../../utils/prefs";
import { config } from "../../../package.json";
import { fileExists, formatPath, jointPath } from "../../utils/str";

export {
  initSyncList,
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
  findAllSyncedFiles,
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

async function getSyncNoteIds() {
  const keys = addon.data.sync.data
    ?.getKeys()
    .map((key) => Number(key))
    .filter((key) => !!key);
  if (!keys) {
    return [];
  }
  return (await Zotero.Items.getAsync(keys))
    .filter((item) => item.isNote())
    .map((item) => item.id);
}

function isSyncNote(noteId: number): boolean {
  return !!addon.data.sync.data?.hasKey(String(noteId));
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
  const metaRegex = /^<div[^>]*>/;
  // Not wrapped inside div
  if (!metaRegex.test(fullContent)) {
    ret.meta = `<div data-schema-version="${config.dataSchemaVersion}">`;
    ret.content = fullContent || "";
    return ret;
  }
  const metaMatch = fullContent.match(metaRegex);
  ret.meta = metaMatch ? metaMatch[0] : "";
  ret.content = fullContent.substring(
    ret.meta.length,
    fullContent.length - ret.tail.length,
  );
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
    meta: { $version: -1 },
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
      filepath = jointPath(syncStatus.path, syncStatus.filename);
    } else if (source.isNote && source.isNote()) {
      const syncStatus = getSyncStatus(source.id);
      filepath = jointPath(syncStatus.path, syncStatus.filename);
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
      ret.lastmodify = new Date(stat.lastModified || 0);
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
    (await fileExists(jointPath(syncStatus.path, syncStatus.filename)))
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
            if (stat.lastModified || 0 > matchedDate) {
              matchedFileName = entry.name;
              matchedDate = stat.lastModified || 0;
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
  let filename = await addon.api.template.runTemplate(
    "[ExportMDFileNameV2]",
    "noteItem",
    [noteItem],
  );
  // trim the filename to remove any leading or trailing spaces or line breaks
  filename = filename.trim();
  return filename;
}

async function findAllSyncedFiles(searchDir: string) {
  const results: SyncStatus[] = [];
  const mdRegex = /\.(md|MD|Md|mD)$/;
  await Zotero.File.iterateDirectory(
    searchDir,
    async (entry: OS.File.Entry) => {
      if (entry.isDir) {
        const subDirResults = await findAllSyncedFiles(entry.path);
        results.push(...subDirResults);
        return;
      }
      if (mdRegex.test(entry.name)) {
        const MDStatus = await getMDStatus(entry.path);
        if (!MDStatus.meta?.$libraryID || !MDStatus.meta?.$itemKey) {
          return;
        }
        const item = await Zotero.Items.getByLibraryAndKeyAsync(
          MDStatus.meta.$libraryID,
          MDStatus.meta.$itemKey,
        );
        if (!item || !(item as Zotero.Item).isNote()) {
          return;
        }
        results.push({
          path: MDStatus.filedir,
          filename: MDStatus.filename,
          md5: Zotero.Utilities.Internal.md5(MDStatus.content, false),
          noteMd5: Zotero.Utilities.Internal.md5(
            (item as Zotero.Item).getNote(),
            false,
          ),
          lastsync: MDStatus.lastmodify.getTime(),
          itemID: item.id,
        });
      }
    },
  );
  return results;
}
