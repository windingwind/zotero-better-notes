/*
 * This file realizes note diff with markdown file.
 */

import BetterNotes from "../addon";
import AddonBase from "../module";

import { diffChars } from "diff";

class SyncDiffWindow extends AddonBase {
  _window: any | Window;
  constructor(parent: BetterNotes) {
    super(parent);
  }

  async doDiff(noteItem: Zotero.Item, mdPath: string) {
    const syncStatus = this._Addon.SyncUtils.getSyncStatus(noteItem);
    const noteStatus = this._Addon.SyncUtils.getNoteStatus(noteItem);
    mdPath = Zotero.File.normalizeToUnix(mdPath);
    if (!noteItem || !noteItem.isNote() || !(await OS.File.exists(mdPath))) {
      return;
    }
    const mdStatus = await this._Addon.SyncUtils.getMDStatus(mdPath);
    if (!mdStatus.meta) {
      return;
    }
    const mdNoteContent = await this._Addon.NoteParse.parseMDToNote(
      mdStatus,
      noteItem,
      true
    );
    const noteContent = await this._Addon.NoteParse.parseNoteForDiff(noteItem);
    this._Addon.toolkit.Tool.log(mdNoteContent, noteContent);
    const changes = diffChars(noteContent, mdNoteContent);
    this._Addon.toolkit.Tool.log("changes", changes);

    const io = {
      defer: Zotero.Promise.defer(),
      result: "",
      type: "skip",
    };

    const syncDate = new Date(syncStatus.lastsync);
    if (!(noteStatus.lastmodify > syncDate && mdStatus.lastmodify > syncDate)) {
      // If only one kind of changes, merge automatically
      if (noteStatus.lastmodify >= mdStatus.lastmodify) {
        // refuse all, keep note
        io.result = changes
          .filter((diff) => (!diff.added && !diff.removed) || diff.removed)
          .map((diff) => diff.value)
          .join("");
      } else {
        // accept all, keep md
        io.result = changes
          .filter((diff) => (!diff.added && !diff.removed) || diff.added)
          .map((diff) => diff.value)
          .join("");
      }
      io.type = "finish";
    } else {
      // Otherwise, merge manually
      const imageAttachemnts = Zotero.Items.get(
        noteItem.getAttachments()
      ).filter((attch) => attch.isEmbeddedImageAttachment());
      const imageData = {};
      for (const image of imageAttachemnts) {
        try {
          const b64 = await this._Addon.SyncUtils._getDataURL(image);
          imageData[image.key] = b64;
        } catch (e) {
          this._Addon.toolkit.Tool.log(e);
        }
      }

      if (!this._window || this._window.closed) {
        this._window = window.open(
          "chrome://Knowledge4Zotero/content/diff.html",
          "betternotes-note-syncdiff",
          `chrome,centerscreen,resizable,status,width=900,height=550`
        );
        const defer = Zotero.Promise.defer();
        this._window.addEventListener("DOMContentLoaded", (e) => {
          defer.resolve();
        });
        // Incase we missed the content loaded event
        setTimeout(() => {
          if (this._window.document.readyState === "complete") {
            defer.resolve();
          }
        }, 500);
        await defer.promise;
      }

      this._window.document.title = `[Better Notes Sycing] Diff Merge of ${noteItem.getNoteTitle()}`;
      this._window.syncInfo = {
        noteName: noteItem.getNoteTitle(),
        noteModify: noteStatus.lastmodify.toISOString(),
        mdName: mdPath,
        mdModify: mdStatus.lastmodify.toISOString(),
        syncTime: syncDate.toISOString(),
      };
      this._window.diffData = changes.map((change, id) =>
        Object.assign(change, {
          id: id,
          text: change.value,
        })
      );
      this._window.imageData = imageData;

      this._window.io = io;
      this._window.initSyncInfo();
      this._window.initList();
      this._window.initDiffViewer();
      this._window.updateDiffRender([]);
      const abort = () => {
        this._Addon.toolkit.Tool.log("unloaded");
        io.defer.resolve();
      };
      // If closed by user, abort syncing
      this._window.addEventListener("beforeunload", abort);
      this._window.addEventListener("unload", abort);
      this._window.addEventListener("close", abort);
      this._window.onclose = abort;
      this._window.onbeforeunload = abort;
      this._window.onunload = abort;
      await io.defer.promise;
    }

    switch (io.type) {
      case "skip":
        alert(
          `Syncing of "${noteItem.getNoteTitle()}" is skipped.\nTo sync manually, go to File->Better Notes Sync Manager.`
        );
        this._window.closed || this._window.close();
        break;
      case "unsync":
        this._Addon.toolkit.Tool.log("remove synce" + noteItem.getNote());
        await this._Addon.SyncController.removeSyncNote(noteItem);
        break;
      case "finish":
        this._Addon.toolkit.Tool.log("Diff result:" + io.result);
        this._Addon.toolkit.Tool.log("Diff result:", io.result);
        // return io.result;
        noteItem.setNote(noteStatus.meta + io.result + noteStatus.tail);
        await noteItem.saveTx({
          notifierData: {
            autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
          },
        });
        await this._Addon.NoteExport.exportNotesToMDFiles([noteItem], {
          useEmbed: false,
          useSync: true,
          filedir: mdStatus.filedir,
          withMeta: true,
        });
        break;
      default:
        break;
    }
  }
}

export default SyncDiffWindow;
