import { diffChars } from "diff";
import { config } from "../../../package.json";
import { fileExists, formatPath, getItemDataURL } from "../../utils/str";
import { isWindowAlive } from "../../utils/window";
import { waitUtilAsync } from "../../utils/wait";

export async function showSyncDiff(noteId: number, mdPath: string) {
  const noteItem = Zotero.Items.get(noteId);
  const syncStatus = addon.api.sync.getSyncStatus(noteId);
  const noteStatus = addon.api.sync.getNoteStatus(noteId)!;
  mdPath = formatPath(mdPath);
  if (!noteItem || !noteItem.isNote() || !(await fileExists(mdPath))) {
    return;
  }
  const mdStatus = await addon.api.sync.getMDStatus(mdPath);
  if (!mdStatus.meta) {
    return;
  }
  const mdNoteContent = await addon.api.convert.md2note(mdStatus, noteItem, {
    isImport: true,
  });
  const noteContent = await addon.api.convert.note2noteDiff(noteItem);
  ztoolkit.log(mdNoteContent, noteContent);
  const changes = diffChars(noteContent, mdNoteContent);
  ztoolkit.log("changes", changes);

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
    const imageAttachemnts = Zotero.Items.get(noteItem.getAttachments()).filter(
      (attch) => attch.isEmbeddedImageAttachment(),
    );
    const imageData = {} as Record<string, string>;
    for (const image of imageAttachemnts) {
      try {
        const b64 = await getItemDataURL(image);
        imageData[image.key] = b64;
      } catch (e) {
        ztoolkit.log(e);
      }
    }

    if (!isWindowAlive(addon.data.sync.diff.window)) {
      addon.data.sync.diff.window = window.open(
        `chrome://${config.addonRef}/content/syncDiff.html`,
        `${config.addonRef}-syncDiff`,
        `chrome,centerscreen,resizable,status,width=900,height=550`,
      )!;
      await waitUtilAsync(
        () => addon.data.sync.diff.window?.document.readyState === "complete",
      );
    }
    const win = addon.data.sync.diff.window as any;

    win.document.title = `[Better Notes Sycing] Diff Merge of ${noteItem.getNoteTitle()}`;
    win.syncInfo = {
      noteName: noteItem.getNoteTitle(),
      noteModify: noteStatus.lastmodify && noteStatus.lastmodify.toISOString(),
      mdName: mdPath,
      mdModify: mdStatus.lastmodify && mdStatus.lastmodify.toISOString(),
      syncTime: syncDate.toISOString(),
    };
    win.diffData = changes.map((change, id) =>
      Object.assign(change, {
        id: id,
        text: change.value,
      }),
    );
    win.imageData = imageData;

    win.io = io;
    win.initSyncInfo();
    win.initList();
    win.initDiffViewer();
    win.updateDiffRender([]);
    const abort = () => {
      ztoolkit.log("unloaded");
      io.defer.resolve();
    };
    // If closed by user, abort syncing
    win.addEventListener("beforeunload", abort);
    win.addEventListener("unload", abort);
    win.addEventListener("close", abort);
    win.onclose = abort;
    win.onbeforeunload = abort;
    win.onunload = abort;
    await io.defer.promise;
    win.removeEventListener("beforeunload", abort);
    win.removeEventListener("unload", abort);
    win.removeEventListener("close", abort);
  }

  switch (io.type) {
    case "skip":
      window.alert(
        `Syncing of "${noteItem.getNoteTitle()}" is skipped.\nTo sync manually, go to File->Better Notes Sync Manager.`,
      );
      addon.data.sync.diff.window?.closed ||
        addon.data.sync.diff.window?.close();
      break;
    case "unsync":
      ztoolkit.log("remove sync", noteItem.getNote());
      await addon.api.sync.removeSyncNote(noteItem.id);
      break;
    case "finish":
      ztoolkit.log("Diff result:", io.result);
      // return io.result;
      noteItem.setNote(noteStatus.meta + io.result + noteStatus.tail);
      await noteItem.saveTx({
        notifierData: {
          autoSyncDelay: Zotero.Notes.AUTO_SYNC_DELAY,
        },
      });
      await addon.api.$export.syncMDBatch(mdStatus.filedir, [noteItem.id]);
      break;
    default:
      break;
  }
}
