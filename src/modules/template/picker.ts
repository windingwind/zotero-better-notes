import { Prompt } from "zotero-plugin-toolkit/dist/managers/prompt";
import ToolkitGlobal from "zotero-plugin-toolkit/dist/managers/toolkitGlobal";
import { addLineToNote } from "../../utils/note";

export { updateTemplatePicker, showTemplatePicker };

function showTemplatePicker(noteId?: number, lineIndex?: number) {
  if (addon.data.prompt) {
    addon.data.templatePicker = { noteId, lineIndex };
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
    const targetNoteItem = Zotero.Items.get(
      addon.data.templatePicker.noteId || addon.data.workspace.mainId
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
      addon.data.templatePicker.lineIndex
    );
    addon.data.templatePicker = {};
  };
}
