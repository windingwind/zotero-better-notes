import { getString } from "../utils/locale";
import { formatPath } from "../utils/str";

export { createNoteFromTemplate, createNoteFromMD };

function getLibraryParentId() {
  return ZoteroPane.getSelectedItems().filter((item) => item.isRegularItem())[0]
    ?.id;
}

function getReaderParentId() {
  const currentReader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
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
  const currentCollection = ZoteroPane.getSelectedCollection();
  if (!currentCollection) {
    Zotero.getMainWindow().alert(getString("alert.notValidCollectionError"));
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
    const noteItem = await addon.api.$import.fromMD(filepath, {
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
