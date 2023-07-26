import YAML = require("yamljs");
import { config } from "../../../package.json";
import { showHint } from "../../utils/hint";
import { itemPicker } from "../../utils/itemPicker";
import { getString } from "../../utils/locale";

export async function showTemplateEditor() {
  if (
    !addon.data.templateEditor.window ||
    Components.utils.isDeadWrapper(addon.data.templateEditor.window) ||
    addon.data.templateEditor.window.closed
  ) {
    const windowArgs = {
      _initPromise: Zotero.Promise.defer(),
    };
    // @ts-ignore
    const _window = window.openDialog(
      `chrome://${config.addonRef}/content/templateEditor.xhtml`,
      `${config.addonRef}-templateEditor`,
      `chrome,centerscreen,resizable,status,width=600,height=400,dialog=no`,
      windowArgs
    )!;
    addon.data.templateEditor.window = _window;
    await windowArgs._initPromise.promise;
    updateData();
    addon.data.templateEditor.tableHelper = new ztoolkit.VirtualizedTable(
      _window!
    )
      .setContainerId("table-container")
      .setProp({
        id: "templates-table",
        // Do not use setLocale, as it modifies the Zotero.Intl.strings
        // Set locales directly to columns
        columns: [
          {
            dataKey: "name",
            label: "templateEditor-templateName",
            fixedWidth: false,
          },
        ].map((column) =>
          Object.assign(column, {
            label: getString(column.label),
          })
        ),
        showHeader: true,
        multiSelect: false,
        staticColumns: true,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => addon.data.templateEditor.templates.length)
      .setProp(
        "getRowData",
        (index) =>
          (addon.data.templateEditor.templates[index] as { name: string }) || {
            name: "no data",
          }
      )
      .setProp("onSelectionChange", (selection) => {
        updateEditor();
        updatePreview();
      })
      .setProp("onKeyDown", (event: KeyboardEvent) => {
        if (
          event.key == "Delete" ||
          (Zotero.isMac && event.key == "Backspace")
        ) {
          addon.api.template.removeTemplate(getSelectedTemplateName());
          refresh();
          return false;
        }
        return true;
      })
      .setProp(
        "getRowString",
        (index) => addon.data.prefs?.rows[index].title || ""
      )
      .render();
    _window.document
      .querySelector("#create")
      ?.addEventListener("click", (ev) => {
        createTemplate();
      });
    _window.document
      .querySelector("#import")
      ?.addEventListener("click", (ev) => {
        importNoteTemplate();
      });
    _window.document.querySelector("#help")?.addEventListener("click", (ev) => {
      Zotero.launchURL(
        "https://github.com/windingwind/zotero-better-notes/blob/master/docs/about-note-template.md"
      );
    });
    _window.document.querySelector("#more")?.addEventListener("click", (ev) => {
      Zotero.launchURL(
        "https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates"
      );
    });
    _window.document.querySelector("#save")?.addEventListener("click", (ev) => {
      saveSelectedTemplate();
    });
    _window.document
      .querySelector("#delete")
      ?.addEventListener("click", (ev) => {
        deleteSelectedTemplate();
      });
    _window.document
      .querySelector("#reset")
      ?.addEventListener("click", (ev) => {
        resetSelectedTemplate();
      });
    _window.document
      .querySelector("#share")
      ?.addEventListener("click", (ev) => {
        shareSelectedTemplate();
      });
    _window.document
      .querySelector("#backup")
      ?.addEventListener("click", (ev) => {
        backupTemplates();
      });
    _window.document
      .querySelector("#restore")
      ?.addEventListener("click", (ev) => {
        restoreTemplates(_window);
      });
  }
  addon.data.templateEditor.window?.focus();
}

async function refresh() {
  updateData();
  updateTable();
  updateEditor();
  await updatePreview();
}

function updateData() {
  addon.data.templateEditor.templates = addon.api.template.getTemplateKeys();
}

function updateTable(selectId?: number) {
  addon.data.templateEditor.tableHelper?.render(selectId);
}

function updateEditor() {
  const name = getSelectedTemplateName();
  const templateText = addon.api.template.getTemplateText(name);

  const header = addon.data.templateEditor.window?.document.getElementById(
    "editor-name"
  ) as HTMLInputElement;
  const text = addon.data.templateEditor.window?.document.getElementById(
    "editor-textbox"
  ) as HTMLTextAreaElement;
  const saveTemplate =
    addon.data.templateEditor.window?.document.getElementById(
      "save"
    ) as XUL.Button;
  const deleteTemplate =
    addon.data.templateEditor.window?.document.getElementById(
      "delete"
    ) as XUL.Button;
  const resetTemplate =
    addon.data.templateEditor.window?.document.getElementById(
      "reset"
    ) as XUL.Button;
  if (!name) {
    header.value = "";
    header.setAttribute("disabled", "true");
    text.value = "";
    text.setAttribute("disabled", "true");
    saveTemplate.setAttribute("disabled", "true");
    deleteTemplate.setAttribute("disabled", "true");
    deleteTemplate.hidden = false;
    resetTemplate.hidden = true;
  } else {
    header.value = name;
    if (!addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
      header.removeAttribute("disabled");
      deleteTemplate.hidden = false;
      resetTemplate.hidden = true;
    } else {
      header.setAttribute("disabled", "true");
      deleteTemplate.setAttribute("disabled", "true");
      deleteTemplate.hidden = true;
      resetTemplate.hidden = false;
    }
    text.value = templateText;
    text.removeAttribute("disabled");
    saveTemplate.removeAttribute("disabled");
    deleteTemplate.removeAttribute("disabled");
  }
}

async function updatePreview() {
  const name = getSelectedTemplateName();
  let html = (await addon.api.template.renderTemplatePreview(name))
    .replace(/&nbsp;/g, "#160;")
    .replace(/<br>/g, "<br/>")
    .replace(/<hr>/g, "<hr/>")
    .replace(/<img([^>]+)\>/g, "<img$1/>");
  const win = addon.data.templateEditor.window;
  const container = win?.document.getElementById("preview-container");
  if (container) {
    if (ztoolkit.isZotero7()) {
      container.innerHTML = html;
    } else {
      container.innerHTML = "";
      container.appendChild(
        ztoolkit.getDOMParser().parseFromString(html, "text/html").body
      );
    }
  }
}

function getSelectedTemplateName() {
  const selectedTemplate = addon.data.templateEditor.templates.find((v, i) =>
    addon.data.templateEditor.tableHelper?.treeInstance.selection.isSelected(i)
  );
  return selectedTemplate?.name || "";
}

function createTemplate() {
  const template: NoteTemplate = {
    name: `New Template: ${new Date().getTime()}`,
    text: "",
  };
  addon.api.template.setTemplate(template);
  refresh();
}

async function importNoteTemplate() {
  const ids = await itemPicker();
  const note: Zotero.Item = Zotero.Items.get(ids).filter((item: Zotero.Item) =>
    item.isNote()
  )[0];
  if (!note) {
    return;
  }
  const template: NoteTemplate = {
    name: `Template from ${note.getNoteTitle()}: ${new Date().getTime()}`,
    text: addon.api.sync.getNoteStatus(note.id)?.content || "",
  };
  addon.api.template.setTemplate(template);
  refresh();
}

function saveSelectedTemplate() {
  const name = getSelectedTemplateName();
  const header = addon.data.templateEditor.window?.document.getElementById(
    "editor-name"
  ) as HTMLInputElement;
  const text = addon.data.templateEditor.window?.document.getElementById(
    "editor-textbox"
  ) as HTMLTextAreaElement;

  if (
    addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name) &&
    header.value !== name
  ) {
    showHint(
      `Template ${name} is a system template. Modifying template name is not allowed.`
    );
    return;
  }

  const template = {
    name: header.value,
    text: text.value,
  };
  addon.api.template.setTemplate(template);
  if (name !== template.name) {
    addon.api.template.removeTemplate(name);
  }
  showHint(`Template ${template.name} saved.`);
  const selectedId =
    addon.data.templateEditor.tableHelper?.treeInstance.selection.selected
      .values()
      .next().value;
  refresh().then(() => updateTable(selectedId));
}

function deleteSelectedTemplate() {
  const name = getSelectedTemplateName();
  if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
    showHint(
      `Template ${name} is a system template. Removing system template is note allowed.`
    );
    return;
  }
  addon.api.template.removeTemplate(name);
  refresh();
}

function resetSelectedTemplate() {
  const name = getSelectedTemplateName();
  if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
    const text = addon.data.templateEditor.window?.document.getElementById(
      "editor-textbox"
    ) as HTMLTextAreaElement;
    text.value =
      addon.api.template.DEFAULT_TEMPLATES.find((t) => t.name === name)?.text ||
      "";
    showHint(`Template ${name} is reset. Please save before leaving.`);
  }
}

function shareSelectedTemplate() {
  const name = getSelectedTemplateName();
  if (!name) {
    return;
  }
  saveSelectedTemplate();
  const content = addon.api.template.getTemplateText(name);
  const yaml = `# This template is specifically for importing/sharing, using better 
# notes 'import from clipboard': copy the content and
# goto Zotero menu bar, click Edit->New Template from Clipboard.  
# Do not copy-paste this to better notes template editor directly.
name: "${name}"
content: |-
${content
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
`;
  new ztoolkit.Clipboard().addText(yaml, "text/unicode").copy();
  showHint(
    `Template ${name} is copied to clipboard. To import it, goto Zotero menu bar, click Edit->New Template from Clipboard.  `
  );
}

async function backupTemplates() {
  const time = new Date().toISOString().replace(/:/g, "-");
  const filepath = await new ztoolkit.FilePicker(
    "Save backup file",
    "save",
    [["yaml", "*.yaml"]],
    `bn-template-backup-${time}.yaml`
  ).open();
  if (!filepath) {
    return;
  }
  const keys = addon.api.template.getTemplateKeys().map((t) => t.name);
  const templates = keys.map((key) => {
    return {
      name: key,
      text: addon.api.template.getTemplateText(key),
    };
  });
  const yaml = YAML.stringify(templates);
  await Zotero.File.putContentsAsync(filepath, yaml);
}

async function restoreTemplates(win: Window) {
  const filepath = await new ztoolkit.FilePicker(
    "Open backup file",
    "open",
    [["yaml", "*.yaml"]],
    undefined,
    win,
    "text"
  ).open();
  if (!filepath) {
    return;
  }
  const yaml = (await Zotero.File.getContentsAsync(filepath)) as string;
  const templates = YAML.parse(yaml) as NoteTemplate[];
  const existingNames = addon.api.template.getTemplateKeys().map((t) => t.name);

  for (const t of templates) {
    if (existingNames.includes(t.name)) {
      const overwrite = win.confirm(
        `Template ${t.name} already exists. Overwrite?`
      );
      if (!overwrite) {
        continue;
      }
    }
    addon.api.template.setTemplate(t);
  }
  await refresh();
}
