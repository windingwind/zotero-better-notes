import { showHint } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { formatPath, slice } from "../../utils/str";

export async function showSyncInfo(noteId: number) {
  const status = addon.api.sync.getSyncStatus(noteId);
  const data = {} as Record<string, any>;

  const dialog = new ztoolkit.Dialog(4, 1)
    .setDialogData(data)
    .addCell(0, 0, {
      tag: "h3",
      properties: {
        innerHTML: getString("syncInfo.syncTo"),
      },
    })
    .addCell(1, 0, {
      tag: "label",
      properties: {
        innerHTML: formatPath(
          OS.Path.join(slice(status.path, 30), status.filename)
        ),
      },
    })
    .addCell(2, 0, {
      tag: "h3",
      properties: {
        innerHTML: getString("syncInfo.lastSync"),
      },
    })
    .addCell(3, 0, {
      tag: "label",
      properties: {
        innerHTML: new Date(status.lastsync).toLocaleString(),
      },
    })
    .addButton(getString("syncInfo.sync"), "sync", {
      noClose: true,
      callback: (ev) => {
        addon.hooks.onSyncing(undefined, {
          quiet: false,
          skipActive: false,
          reason: "manual-info",
        });
      },
    })
    .addButton(getString("syncInfo.unSync"), "unSync", {
      callback: async (ev) => {
        const allNoteIds = await addon.api.sync.getRelatedNoteIds(noteId);
        for (const itemId of allNoteIds) {
          addon.api.sync.removeSyncNote(itemId);
        }
        showHint(`Cancel sync of ${allNoteIds.length} notes.`);
      },
    })
    .addButton(getString("syncInfo.reveal"), "reveal", {
      noClose: true,
      callback: (ev) => {
        Zotero.File.reveal(
          formatPath(OS.Path.join(status.path, status.filename))
        );
      },
    })
    .addButton(getString("syncInfo.manager"), "manager", {
      noClose: true,
      callback: (ev) => {
        addon.hooks.onShowSyncManager();
      },
    })
    .addButton(getString("syncInfo.export"), "export", {
      callback: (ev) => {
        addon.hooks.onShowExportNoteOptions([noteId]);
      },
    })
    .addButton(getString("export.cancel"), "cancel")
    .open(getString("export.title"), {
      resizable: true,
      centerscreen: true,
      fitContent: true,
    });
}
