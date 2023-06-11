import { Prompt } from "zotero-plugin-toolkit/dist/managers/prompt";
import ToolkitGlobal from "zotero-plugin-toolkit/dist/managers/toolkitGlobal";
import { addLineToNote } from "../../utils/note";
import { getString } from "../../utils/locale";

export { updateTemplatePicker, showTemplatePicker };

function showTemplatePicker(
  mode: "insert",
  data?: { noteId?: number; lineIndex?: number }
): void;
function showTemplatePicker(
  mode: "create",
  data?: { noteType?: "standalone" | "item"; parentItemId?: number }
): void;
function showTemplatePicker(mode: "export", data?: {}): void;
function showTemplatePicker(): void;
function showTemplatePicker(
  mode: typeof addon.data.templatePicker.mode = "insert",
  data: Record<string, any> = {}
) {
  if (addon.data.prompt) {
    addon.data.templatePicker.mode = mode;
    addon.data.templatePicker.data = data;
    addon.data.prompt.promptNode.style.display = "flex";
    addon.data.prompt.showCommands(
      addon.data.prompt.commands.filter(
        (cmd) => cmd.label === "BNotes Template"
      )
    );
  }
}

function updateTemplatePicker() {
  ztoolkit.Prompt.unregisterAll();
  const templates = addon.api.template.getTemplateKeys();
  ztoolkit.Prompt.register(
    templates
      .filter(
        (template) =>
          !addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(template.name)
      )
      .map((template) => {
        return {
          name: `Template: ${template.name}`,
          label: "BNotes Template",
          callback: getTemplatePromptHandler(template.name),
        };
      })
  );
  if (!addon.data.prompt) {
    addon.data.prompt = ToolkitGlobal.getInstance().prompt.instance;
  }
}

function getTemplatePromptHandler(name: string) {
  return async (prompt: Prompt) => {
    ztoolkit.log(prompt, name);
    prompt.promptNode.style.display = "none";
    // TODO: add preview when command is selected
    switch (addon.data.templatePicker.mode) {
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
    addon.data.templatePicker.mode = "insert";
    addon.data.templatePicker.data = {};
  };
}

async function insertTemplateCallback(name: string) {
  const targetNoteItem = Zotero.Items.get(
    addon.data.templatePicker.data.noteId || addon.data.workspace.mainId
  );
  let html = "";
  if (name.startsWith("[Item]")) {
    html = await addon.api.template.runItemTemplate(name, {
      targetNoteId: targetNoteItem.id,
    });
  } else {
    html = await addon.api.template.runTemplate(name, "", []);
  }
  await addLineToNote(
    targetNoteItem,
    html,
    addon.data.templatePicker.data.lineIndex
  );
}

async function createTemplateNoteCallback(name: string) {
  addon.data.templatePicker.data.librarySelectedIds =
    ZoteroPane.getSelectedItems(true);
  switch (addon.data.templatePicker.data.noteType) {
    case "standalone": {
      const currentCollection = ZoteroPane.getSelectedCollection();
      if (!currentCollection) {
        window.alert(getString("alert.notValidCollectionError"));
        return;
      }
      const noteID = await ZoteroPane.newNote();
      const noteItem = Zotero.Items.get(noteID);
      await noteItem.saveTx();
      addon.data.templatePicker.data.noteId = noteID;
      break;
    }
    case "item": {
      const parentID = addon.data.templatePicker.data.parentItemId;
      const noteItem = new Zotero.Item("note");
      noteItem.libraryID = Zotero.Items.get(parentID).libraryID;
      noteItem.parentID = parentID;
      await noteItem.saveTx();
      addon.data.templatePicker.data.noteId = noteItem.id;
      break;
    }
    default:
      return;
  }
  await insertTemplateCallback(name);
}

async function exportTemplateCallback(name: string) {
  addon.data.templatePicker.data.librarySelectedIds =
    ZoteroPane.getSelectedItems(true);
  // Create temp note
  const noteItem = new Zotero.Item("note");
  noteItem.libraryID = Zotero.Libraries.userLibraryID;
  await noteItem.saveTx();
  addon.data.templatePicker.data.noteId = noteItem.id;
  await insertTemplateCallback(name);
  // Export note
  await addon.hooks.onShowExportNoteOptions([noteItem.id], {
    setAutoSync: false,
  });
  // Delete temp note
  await Zotero.Items.erase(noteItem.id);
}
