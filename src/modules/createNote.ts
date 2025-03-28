import { getString } from "../utils/locale";
import { formatPath } from "../utils/str";

export { createNoteFromTemplate, createNoteFromMD, createNote };

function getLibraryParentId() {
  return Zotero.getMainWindow()
    .ZoteroPane.getSelectedItems()
    .filter((item) => item.isRegularItem())[0]?.id;
}

function getReaderParentId() {
  const currentReader = Zotero.Reader.getByTabID(
    Zotero.getMainWindow().Zotero_Tabs.selectedID,
  );
  const parentItemId = Zotero.Items.get(
    currentReader?.itemID || -1,
  ).parentItemID;
  return parentItemId;
}

async function createNoteFromTemplate(noteType: "standalone"): Promise<void>;
async function createNoteFromTemplate(
  noteType: "item",
  parentType: "reader" | "library",
): Promise<void>;
async function createNoteFromTemplate(
  noteType: "standalone" | "item",
  parentType?: "reader" | "library",
) {
  if (noteType === "item") {
    const parentItemId =
      parentType === "reader" ? getReaderParentId() : getLibraryParentId();
    if (!parentItemId) {
      Zotero.getMainWindow().alert(getString("alert.notValidParentItemError"));
      return;
    }
    addon.hooks.onShowTemplatePicker("create", {
      noteType,
      parentItemId,
      // Only pre-select the top item if the parent is a reader item
      topItemIds: parentType === "reader" ? [parentItemId] : undefined,
    });
  } else {
    addon.hooks.onShowTemplatePicker("create", {
      noteType,
    });
  }
}

async function createNoteFromMD() {
  // Check if we can create a note
  if (!(await createNote({ dryRun: true }))) {
    return;
  }

  const syncNotes = Zotero.getMainWindow().confirm(
    getString("alert-syncImportedNotes"),
  );

  const filepaths = await new ztoolkit.FilePicker(
    "Import MarkDown",
    "multiple",
    [[`MarkDown(*.md)`, `*.md`]],
  ).open();

  if (!filepaths) {
    return;
  }

  for (const filepath of filepaths) {
    const noteItem = await createNote();
    if (!noteItem) {
      continue;
    }
    await addon.api.$import.fromMD(filepath, {
      noteId: noteItem.id,
      ignoreVersion: true,
    });
    if (noteItem && syncNotes) {
      const pathSplit = PathUtils.split(formatPath(filepath));
      addon.api.sync.updateSyncStatus(noteItem.id, {
        itemID: noteItem.id,
        path: formatPath(pathSplit.slice(0, -1).join("/")),
        filename: pathSplit.pop() || "",
        lastsync: new Date().getTime(),
        md5: "",
        noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
      });
    }
  }
}

async function createNote(): Promise<Zotero.Item | false>;
async function createNote(options: {
  dryRun: true;
  noSave?: boolean;
}): Promise<boolean>;
async function createNote(options: {
  dryRun?: false;
  noSave?: boolean;
}): Promise<Zotero.Item | false>;
async function createNote(
  options: { dryRun?: boolean; noSave?: boolean } = {},
) {
  let noteItem: Zotero.Item;
  const ZoteroPane = Zotero.getActiveZoteroPane();

  const cView = ZoteroPane.collectionsView;
  if (!cView) {
    Zotero.getMainWindow().alert(getString("alert.notValidCollectionError"));
    return false;
  }
  const cRow = cView.selectedTreeRow;
  if (["library", "group", "collection"].includes(cRow.type)) {
    if (options.dryRun) {
      return true;
    }
    noteItem = new Zotero.Item("note");
    noteItem.libraryID = ZoteroPane.getSelectedLibraryID();
    if (cRow.type === "collection") {
      noteItem.addToCollection(cRow.ref.id);
    }
  } else {
    Zotero.getMainWindow().alert(getString("alert.notValidCollectionError"));
    return false;
  }

  if (!options.noSave) {
    await noteItem.saveTx();
  }
  return noteItem;
}
