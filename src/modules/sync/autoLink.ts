import { showHint } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { getPref } from "../../utils/prefs";

export { syncLinkedNoteOnEdit };

/**
 * When a note is edited, look at the link-cluster formed by the note and the
 * notes it links to / from. If any note in that cluster is already set up with
 * two-way sync, add every not-yet-synced note in the cluster to sync, using the
 * synced note's folder.
 *
 * This propagates in both directions: an unsynced edited note next to a synced
 * note gets synced, and a synced edited note pulls its unsynced linked notes
 * into sync as well.
 *
 * If the synced notes in the cluster live in different folders, prompt the user
 * to pick which folder to sync the new notes to.
 */
async function syncLinkedNoteOnEdit(noteId: number) {
  if (!getPref("sync.autoSyncLinkedNotes")) {
    return;
  }
  const note = Zotero.Items.get(noteId);
  if (!note?.isNote()) {
    return;
  }

  // The cluster: the edited note plus the notes it links to / from.
  const neighborIds = await getLinkedNeighborIds(noteId);
  const clusterIds = [noteId, ...neighborIds];

  // Split the cluster into already-synced notes (which anchor the target
  // folder) and not-yet-synced notes (which we may add to sync).
  const syncedFolders = new Set<string>();
  const unsyncedIds: number[] = [];
  for (const id of clusterIds) {
    if (addon.api.sync.isSyncNote(id)) {
      const path = addon.api.sync.getSyncStatus(id).path;
      if (path) {
        syncedFolders.add(path);
      }
    } else {
      unsyncedIds.push(id);
    }
  }

  // Need both a synced anchor and at least one note to add.
  if (syncedFolders.size === 0 || unsyncedIds.length === 0) {
    return;
  }

  let targetFolder: string | undefined;
  if (syncedFolders.size === 1) {
    targetFolder = [...syncedFolders][0];
  } else {
    targetFolder = promptForFolder([...syncedFolders]);
  }
  if (!targetFolder) {
    return;
  }

  for (const id of unsyncedIds) {
    const item = Zotero.Items.get(id);
    if (item?.isNote()) {
      await addNoteToSync(item, targetFolder);
    }
  }
}

/**
 * Get the ids of all notes linked to / by the given note (both directions),
 * excluding the note itself.
 */
async function getLinkedNeighborIds(noteId: number): Promise<number[]> {
  const ids = new Set<number>();
  const [outbound, inbound] = await Promise.all([
    addon.api.relation.getNoteLinkOutboundRelation(noteId),
    addon.api.relation.getNoteLinkInboundRelation(noteId),
  ]);
  for (const link of outbound) {
    const item = Zotero.Items.getByLibraryAndKey(link.toLibID, link.toKey);
    if (item && (item as Zotero.Item).isNote()) {
      ids.add(item.id);
    }
  }
  for (const link of inbound) {
    const item = Zotero.Items.getByLibraryAndKey(link.fromLibID, link.fromKey);
    if (item && (item as Zotero.Item).isNote()) {
      ids.add(item.id);
    }
  }
  ids.delete(noteId);
  return [...ids];
}

/**
 * Prompt the user to choose one folder among several. Returns the chosen folder
 * or undefined if the user cancelled.
 */
function promptForFolder(folders: string[]): string | undefined {
  const selection = { value: 0 };
  const ok = Services.prompt.select(
    Zotero.getMainWindow() as any,
    getString("sync-autoLink-selectFolder-title"),
    getString("sync-autoLink-selectFolder-text"),
    folders,
    selection,
  );
  if (!ok) {
    return undefined;
  }
  return folders[selection.value];
}

/**
 * Add a note to sync targeting the given folder. `syncMDBatch` writes the
 * markdown file (note -> markdown) and registers the note's sync status, so the
 * note is fully synced right away without racing the global sync lock.
 */
async function addNoteToSync(note: Zotero.Item, folder: string) {
  await addon.api.$export.syncMDBatch(folder, [note.id]);
  showHint(
    getString("sync-autoLink-added-hint", {
      args: { title: note.getNoteTitle() || note.key, dir: folder },
    }),
  );
}
