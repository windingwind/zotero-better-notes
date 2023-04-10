import { clearPref, getPref, setPref } from "../../utils/prefs";

export {
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  initTemplates,
  removeTemplate,
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
    addon.api.template.updateTemplatePicker();
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
    addon.api.template.updateTemplatePicker();
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
  addon.api.template.updateTemplatePicker();
}
