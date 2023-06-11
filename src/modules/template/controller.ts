import YAML = require("yamljs");
import { clearPref, getPref, setPref } from "../../utils/prefs";
import { showHint } from "../../utils/hint";

export {
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  removeTemplate,
  initTemplates,
  importTemplateFromClipboard,
};

// Controller
function getTemplateKeys(): { name: string }[] {
  let templateKeys = getPref("templateKeys") as string;
  return templateKeys ? JSON.parse(templateKeys) : [];
}

function setTemplateKeys(templateKeys: { name: string }[]): void {
  setPref("templateKeys", JSON.stringify(templateKeys));
}

function addTemplateKey(templateKey: { name: string }): boolean {
  const templateKeys = getTemplateKeys();
  if (templateKeys.map((t) => t.name).includes(templateKey.name)) {
    return false;
  }
  templateKeys.push(templateKey);
  setTemplateKeys(templateKeys);
  return true;
}

function removeTemplateKey(keyName: string): boolean {
  const templateKeys = getTemplateKeys();
  if (!templateKeys.map((t) => t.name).includes(keyName)) {
    return false;
  }
  templateKeys.splice(templateKeys.map((t) => t.name).indexOf(keyName), 1);
  setTemplateKeys(templateKeys);
  return true;
}

function getTemplateText(keyName: string): string {
  let template = getPref(`template.${keyName}`) as string;
  if (!template) {
    template = "";
    setPref(`template.${keyName}`, template);
  }
  return template;
}

function setTemplate(
  template: NoteTemplate,
  updatePrompt: boolean = true
): void {
  template = JSON.parse(JSON.stringify(template));
  addTemplateKey({ name: template.name });
  setPref(`template.${template.name}`, template.text);
  if (updatePrompt) {
    addon.hooks.onUpdateTemplatePicker();
  }
}

function removeTemplate(
  keyName: string | undefined,
  updatePrompt: boolean = true
): void {
  if (typeof keyName === "undefined") {
    return;
  }
  removeTemplateKey(keyName);
  clearPref(`template.${keyName}`);
  if (updatePrompt) {
    addon.hooks.onUpdateTemplatePicker();
  }
}

function initTemplates() {
  let templateKeys = getTemplateKeys();
  const currentNames = templateKeys.map((t) => t.name);
  for (const defaultTemplate of addon.api.template.DEFAULT_TEMPLATES) {
    if (!currentNames.includes(defaultTemplate.name)) {
      setTemplate(defaultTemplate, false);
    }
  }
  addon.hooks.onUpdateTemplatePicker();
}

function importTemplateFromClipboard() {
  const templateText = Zotero.Utilities.Internal.getClipboard("text/unicode");
  if (!templateText) {
    return;
  }
  let template: NoteTemplate;
  try {
    template = YAML.parse(templateText);
  } catch (e) {
    try {
      template = JSON.parse(templateText);
    } catch (e) {
      template = { name: "", text: "" };
    }
  }
  if (!template.name || !template.text) {
    showHint("The copied template is invalid");
    return;
  }
  if (!window.confirm(`Import template "${template.name}"?`)) {
    return;
  }
  setTemplate(template);
  showHint(`Template ${template.name} saved.`);
}
