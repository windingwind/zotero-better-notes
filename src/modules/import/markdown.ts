import { addLineToNote } from "../../utils/note";
import { config } from "../../../package.json";

export async function fromMD(
  filepath: string,
  options: {
    noteId?: number;
    ignoreVersion?: boolean;
    append?: boolean;
    appendLineIndex?: number;
  } = {},
) {
  let mdStatus: MDStatus;
  try {
    mdStatus = await addon.api.sync.getMDStatus(filepath);
  } catch (e) {
    ztoolkit.log(`Import Error: ${String(e)}`);
    return;
  }
  let noteItem = options.noteId ? Zotero.Items.get(options.noteId) : undefined;
  if (
    !options.ignoreVersion &&
    typeof mdStatus.meta?.$version === "number" &&
    typeof noteItem?.version === "number" &&
    mdStatus.meta?.$version < noteItem?.version
  ) {
    if (
      !window.confirm(
        `The target note seems to be newer than the file ${filepath}. Are you sure you want to import it anyway?`,
      )
    ) {
      return;
    }
  }
  const noteStatus = noteItem
    ? addon.api.sync.getNoteStatus(noteItem.id)
    : {
        meta: `<div data-schema-version="${config.dataSchemaVersion}">`,
        content: "",
        tail: "</div>",
      };

  if (!noteItem) {
    const _noteItem = await addon.hooks.onCreateNote({
      noSave: true,
    });
    if (!_noteItem) {
      return;
    }
    noteItem = _noteItem;
    await noteItem.saveTx({
      notifierData: {
        autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
      },
    });
  }
  const parsedContent = await addon.api.convert.md2note(mdStatus, noteItem, {
    isImport: true,
  });
  ztoolkit.log("import", noteStatus);

  if (options.append) {
    await addLineToNote(noteItem, parsedContent, options.appendLineIndex || -1);
  } else {
    noteItem.setNote(noteStatus!.meta + parsedContent + noteStatus!.tail);
    await noteItem.saveTx({
      notifierData: {
        autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
      },
    });
  }
  return noteItem;
}
