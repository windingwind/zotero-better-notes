import { addLineToNote } from "../../utils/note";
import { getString } from "../../utils/locale";
import { openTemplatePicker } from "../../utils/templatePicker";

export { showTemplatePicker };

async function showTemplatePicker(
  mode: "insert",
  data?: { noteId?: number; lineIndex?: number },
): Promise<void>;
async function showTemplatePicker(
  mode: "create",
  data?: {
    noteType?: "standalone" | "item";
    parentItemId?: number;
    topItemIds?: number[];
  },
): Promise<void>;
async function showTemplatePicker(
  mode: "export",
  data?: Record<string, never>,
): Promise<void>;
async function showTemplatePicker(): Promise<void>;
async function showTemplatePicker(
  mode: typeof addon.data.template.picker.mode = "insert",
  data: Record<string, any> = {},
) {
  addon.data.template.picker.mode = mode;
  addon.data.template.picker.data = data;
  const selected = await openTemplatePicker();
  if (!selected.length) {
    return;
  }
  const name = selected[0];
  await handleTemplateOperation(name);
}

async function handleTemplateOperation(name: string) {
  ztoolkit.log(name);
  // TODO: add preview when command is selected
  switch (addon.data.template.picker.mode) {
    case "create":
      await createTemplateNoteCallback(name);
      break;
    case "export":
      await exportTemplateCallback(name);
      break;
    case "insert":
    default:
      await insertTemplateCallback(name);
      break;
  }
  addon.data.template.picker.mode = "insert";
  addon.data.template.picker.data = {};
}

async function insertTemplateCallback(name: string) {
  const targetNoteItem = Zotero.Items.get(
    addon.data.template.picker.data.noteId,
  );
  let html = "";
  if (name.toLowerCase().startsWith("[item]")) {
    html = await addon.api.template.runItemTemplate(name, {
      targetNoteId: targetNoteItem.id,
    });
  } else {
    html = await addon.api.template.runTextTemplate(name, {
      targetNoteId: targetNoteItem.id,
    });
  }
  await addLineToNote(
    targetNoteItem,
    html,
    addon.data.template.picker.data.lineIndex,
  );
}

async function createTemplateNoteCallback(name: string) {
  addon.data.template.picker.data.librarySelectedIds =
    ZoteroPane.getSelectedItems(true);
  switch (addon.data.template.picker.data.noteType) {
    case "standalone": {
      const currentCollection = ZoteroPane.getSelectedCollection();
      if (!currentCollection) {
        Zotero.getMainWindow().alert(
          getString("alert.notValidCollectionError"),
        );
        return;
      }
      const noteID = await ZoteroPane.newNote();
      const noteItem = Zotero.Items.get(noteID);
      await noteItem.saveTx();
      addon.data.template.picker.data.noteId = noteID;
      break;
    }
    case "item": {
      const parentID = addon.data.template.picker.data.parentItemId;
      const noteItem = new Zotero.Item("note");
      noteItem.libraryID = Zotero.Items.get(parentID).libraryID;
      noteItem.parentID = parentID;
      await noteItem.saveTx();
      addon.data.template.picker.data.noteId = noteItem.id;
      break;
    }
    default:
      return;
  }
  await insertTemplateCallback(name);
}

async function exportTemplateCallback(name: string) {
  addon.data.template.picker.data.librarySelectedIds =
    ZoteroPane.getSelectedItems(true);
  // Create temp note
  const noteItem = new Zotero.Item("note");
  noteItem.libraryID = Zotero.Libraries.userLibraryID;
  await noteItem.saveTx();
  addon.data.template.picker.data.noteId = noteItem.id;
  await insertTemplateCallback(name);
  // Export note
  await addon.hooks.onShowExportNoteOptions([noteItem.id], {
    setAutoSync: false,
  });
  // Delete temp note
  await Zotero.Items.erase(noteItem.id);
}
