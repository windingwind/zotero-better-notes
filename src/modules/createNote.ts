import { getString } from "../utils/locale";
import { config } from "../../package.json";

export { createWorkspaceNote, createNoteFromTemplate };

async function createWorkspaceNote() {
  const currentCollection = ZoteroPane.getSelectedCollection();
  if (!currentCollection) {
    window.alert(getString("alert.notValidCollectionError"));
    return;
  }
  const confirmOperation = window.confirm(
    `${getString(
      "menuAddNote.newMainNote.confirmHead"
      // @ts-ignore
    )} '${currentCollection.getName()}' ${getString(
      "menuAddNote.newMainNote.confirmTail"
    )}`
  );
  if (!confirmOperation) {
    return;
  }
  const header = window.prompt(
    getString("menuAddNote.newMainNote.enterNoteTitle"),
    `New Note ${new Date().toLocaleString()}`
  );
  const noteID = await ZoteroPane.newNote();
  const noteItem = Zotero.Items.get(noteID);
  noteItem.setNote(
    `<div data-schema-version="${config.dataSchemaVersion}"><h1>${header}</h1>\n</div>`
  );
  await noteItem.saveTx();
  addon.hooks.onSetWorkspaceNote(noteID, "main");
  if (
    !addon.data.workspace.tab.active &&
    !addon.data.workspace.window.active &&
    window.confirm(getString("menuAddNote.newMainNote.openWorkspaceTab"))
  ) {
    addon.hooks.onOpenWorkspace("tab");
  }
}

function getLibraryParentId() {
  return ZoteroPane.getSelectedItems().filter((item) => item.isRegularItem())[0]
    ?.id;
}

function getReaderParentId() {
  const currentReader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
  if (currentReader) {
  }
  const parentItemId = Zotero.Items.get(
    currentReader?.itemID || -1
  ).parentItemID;
  return parentItemId;
}

async function createNoteFromTemplate(noteType: "standalone"): Promise<void>;
async function createNoteFromTemplate(
  noteType: "item",
  parentType: "reader" | "library"
): Promise<void>;
async function createNoteFromTemplate(
  noteType: "standalone" | "item",
  parentType?: "reader" | "library"
) {
  if (noteType === "item") {
    const parentItemId =
      parentType === "reader" ? getReaderParentId() : getLibraryParentId();
    if (!parentItemId) {
      window.alert(getString("alert.notValidParentItemError"));
      return;
    }
    addon.hooks.onShowTemplatePicker("create", {
      noteType,
      parentItemId,
    });
  } else {
    addon.hooks.onShowTemplatePicker("create", {
      noteType,
    });
  }
}
