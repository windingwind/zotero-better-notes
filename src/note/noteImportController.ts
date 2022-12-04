/*
 * This file realizes md import.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";
import { pick } from "../utils";

class NoteImport extends AddonBase {
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  async doImport(
    noteItem: Zotero.Item = undefined,
    options: {
      ignoreVersion?: boolean;
      append?: boolean;
    } = {}
  ) {
    const filepath = await pick(
      `${Zotero.getString("fileInterface.import")} MarkDown Document`,
      "open",
      [["MarkDown File(*.md)", "*.md"]]
    );
    if (filepath) {
      await this.importMDFileToNote(filepath, noteItem, options);
    }
  }

  async importMDFileToNote(
    file: string,
    noteItem: Zotero.Item = undefined,
    options: {
      ignoreVersion?: boolean;
      append?: boolean;
    } = {}
  ) {
    let mdStatus: MDStatus;
    try {
      mdStatus = await this._Addon.SyncUtils.getMDStatus(file);
    } catch (e) {
      Zotero.debug(`BN Import: ${String(e)}`);
    }
    if (!options.ignoreVersion && mdStatus.meta?.version < noteItem?._version) {
      if (
        !confirm(
          `The target note seems to be newer than the file ${file}. Are you sure you want to import it anyway?`
        )
      ) {
        return;
      }
    }
    const noteStatus = noteItem
      ? this._Addon.SyncUtils.getNoteStatus(noteItem)
      : {
          meta: '<div data-schema-version="9">',
          content: "",
          tail: "</div>",
        };

    if (!noteItem) {
      noteItem = new Zotero.Item("note");
      noteItem.libraryID = ZoteroPane.getSelectedLibraryID();
      if (ZoteroPane.getCollectionTreeRow().isCollection()) {
        noteItem.addToCollection(ZoteroPane.getCollectionTreeRow().ref.id);
      }
      await noteItem.saveTx({
        notifierData: {
          autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
        },
      });
    }
    const parsedContent = await this._Addon.NoteParse.parseMDToNote(
      mdStatus,
      noteItem,
      true
    );
    console.log("bn import", noteStatus);

    if (options.append) {
      await this._Addon.NoteUtils.addLineToNote(
        noteItem,
        parsedContent,
        Number.MAX_VALUE
      );
    } else {
      noteItem.setNote(noteStatus.meta + parsedContent + noteStatus.tail);
      await noteItem.saveTx({
        notifierData: {
          autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
        },
      });
    }
    return noteItem;
  }
}

export default NoteImport;
