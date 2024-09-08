import YAML = require("yamljs");
import { config } from "../../../package.json";
import { showHint } from "../../utils/hint";
import { itemPicker } from "../../utils/itemPicker";
import { getString } from "../../utils/locale";
import { waitUtilAsync } from "../../utils/wait";

export async function showTemplateEditor() {
  if (
    !addon.data.template.editor.window ||
    Components.utils.isDeadWrapper(addon.data.template.editor.window) ||
    addon.data.template.editor.window.closed
  ) {
    const windowArgs = {
      _initPromise: Zotero.Promise.defer(),
    };
    const _window = Zotero.getMainWindow().openDialog(
      `chrome://${config.addonRef}/content/templateEditor.xhtml`,
      `${config.addonRef}-templateEditor`,
      `chrome,centerscreen,resizable,status,dialog=no`,
      windowArgs,
    )!;
    addon.data.template.editor.window = _window;
    await windowArgs._initPromise.promise;
    updateData();
    addon.data.template.editor.tableHelper = new ztoolkit.VirtualizedTable(
      _window!,
    )
      .setContainerId("table-container")
      .setProp({
        id: "templates-table",
        // Do not use setLocale, as it modifies the Zotero.Intl.strings
        // Set locales directly to columns
        columns: [
          {
            dataKey: "type",
            label: "templateEditor-templateType",
            width: 60,
            fixedWidth: true,
          },
          {
            dataKey: "name",
            label: "templateEditor-templateName",
            fixedWidth: false,
          },
        ].map((column) =>
          Object.assign(column, {
            label: getString(column.label),
          }),
        ),
        showHeader: true,
        multiSelect: false,
        staticColumns: true,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => addon.data.template.editor.templates.length)
      .setProp("getRowData", getRowData)
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
        (index) => addon.data.template.editor.templates[index] || "",
      )
      .setProp("renderItem", (index, selection, oldElem, columns) => {
        let div;
        if (oldElem) {
          div = oldElem;
          div.innerHTML = "";
        } else {
          div = document.createElement("div");
          div.className = "row";
        }

        div.classList.toggle("selected", selection.isSelected(index));
        div.classList.toggle("focused", selection.focused == index);
        const rowData = getRowData(index);

        for (const column of columns) {
          const span = document.createElement("span");
          // @ts-ignore
          span.className = `cell ${column?.className}`;
          const cellData = rowData[column.dataKey as keyof typeof rowData];
          span.textContent = cellData;
          if (column.dataKey === "type") {
            span.style.backgroundColor = getRowLabelColor(cellData);
            span.style.borderRadius = "4px";
            span.style.paddingInline = "4px";
            span.style.textAlign = "center";
            span.textContent = getString(
              "templateEditor-templateDisplayType",
              cellData,
            );
          }
          div.append(span);
        }
        return div;
      })
      .render();
    _window.document
      .querySelector("#create")
      ?.addEventListener("click", (ev) => {
        createTemplate();
      });
    _window.document.querySelector("#help")?.addEventListener("click", (ev) => {
      Zotero.launchURL(
        "https://github.com/windingwind/zotero-better-notes/blob/master/docs/about-note-template.md",
      );
    });
    _window.document.querySelector("#more")?.addEventListener("click", (ev) => {
      Zotero.launchURL(
        "https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates",
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
      .querySelector("#importClipboard")
      ?.addEventListener("click", (ev) => {
        addon.hooks.onImportTemplateFromClipboard();
      });
    _window.document
      .querySelector("#importNote")
      ?.addEventListener("click", (ev) => {
        importNoteTemplate();
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
    addon.data.template.editor.window?.focus();
    const editorWin = (_window.document.querySelector("#editor") as any)
      .contentWindow;
    await waitUtilAsync(() => editorWin?.loadMonaco);
    const isDark = editorWin?.matchMedia("(prefers-color-scheme: dark)")
      .matches;
    const { monaco, editor } = await editorWin.loadMonaco({
      language: "javascript",
      theme: "vs-" + (isDark ? "dark" : "light"),
    });
    addon.data.template.editor.editor = editor;
  }
}

async function refresh() {
  updateData();
  updateTable();
  updateEditor();
  await updatePreview();
}

function getRowData(index: number) {
  const rowData = addon.data.template.editor.templates[index];
  let templateType = "unknown";
  let templateDisplayName = rowData;
  if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(rowData)) {
    templateType = "system";
    templateDisplayName = getString(
      "templateEditor-templateDisplayName",
      // Exclude the first and last character, which are '[' and ']'
      rowData.slice(1, -1),
    );
  } else if (rowData.toLowerCase().startsWith("[item]")) {
    templateType = "item";
    templateDisplayName = rowData.slice(6);
  } else if (rowData.toLowerCase().startsWith("[text]")) {
    templateType = "text";
    templateDisplayName = rowData.slice(6);
  }
  return {
    name: templateDisplayName,
    type: templateType,
  };
}

function getRowLabelColor(type: string) {
  switch (type) {
    case "system":
      return "var(--accent-yellow)";
    case "item":
      return "var(--accent-green)";
    case "text":
      return "var(--accent-azure)";
    default:
      return "var(--accent-red)";
  }
}

function updateData() {
  addon.data.template.editor.templates = addon.api.template.getTemplateKeys();
}

function updateTable(selectId?: number) {
  addon.data.template.editor.tableHelper?.render(selectId);
}

function updateEditor() {
  const name = getSelectedTemplateName();
  const templateText = addon.api.template.getTemplateText(name);

  const header = addon.data.template.editor.window?.document.getElementById(
    "editor-name",
  ) as HTMLInputElement;
  const editor = addon.data.template.editor.window?.document.getElementById(
    "editor",
  ) as HTMLIFrameElement;
  const saveTemplate =
    addon.data.template.editor.window?.document.getElementById(
      "save",
    ) as XUL.Button;
  const deleteTemplate =
    addon.data.template.editor.window?.document.getElementById(
      "delete",
    ) as XUL.Button;
  const resetTemplate =
    addon.data.template.editor.window?.document.getElementById(
      "reset",
    ) as XUL.Button;
  if (!name) {
    header.value = "";
    header.setAttribute("disabled", "true");
    editor.hidden = true;
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
    addon.data.template.editor.editor.setValue(templateText);
    editor.hidden = false;
    saveTemplate.removeAttribute("disabled");
    deleteTemplate.removeAttribute("disabled");
  }
}

async function updatePreview() {
  const name = getSelectedTemplateName();
  const html = (await addon.api.template.renderTemplatePreview(name))
    .replace(/&nbsp;/g, "#160;")
    .replace(/<br>/g, "<br/>")
    .replace(/<hr>/g, "<hr/>")
    .replace(/<img([^>]+)>/g, "<img$1/>");
  const win = addon.data.template.editor.window;
  const container = win?.document.getElementById("preview-container");
  if (container) {
    container.innerHTML = html;
  }
}

function getSelectedTemplateName() {
  const selectedTemplate = addon.data.template.editor.templates.find(
    (v, i) =>
      addon.data.template.editor.tableHelper?.treeInstance.selection.isSelected(
        i,
      ),
  );
  return selectedTemplate || "";
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
    item.isNote(),
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
  const header = addon.data.template.editor.window?.document.getElementById(
    "editor-name",
  ) as HTMLInputElement;

  if (
    addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name) &&
    header.value !== name
  ) {
    showHint(
      `Template ${name} is a system template. Modifying template name is not allowed.`,
    );
    return;
  }

  const template = {
    name: header.value,
    text: addon.data.template.editor.editor.getValue() as string,
  };
  if (
    template.text.includes(
      "# This template is specifically for importing/sharing",
    )
  ) {
    const useImport = addon.data.template.editor.window?.confirm(
      getString("alert-templateEditor-shouldImport"),
    );
    if (useImport) {
      addon.hooks.onImportTemplateFromClipboard(template.text);
      refresh();
      return;
    }
  }

  addon.api.template.setTemplate(template);
  if (name !== template.name) {
    addon.api.template.removeTemplate(name);
  }
  showHint(`Template ${template.name} saved.`);
  const selectedId =
    addon.data.template.editor.tableHelper?.treeInstance.selection.selected
      .values()
      .next().value;
  refresh().then(() => updateTable(selectedId));
}

function deleteSelectedTemplate() {
  const name = getSelectedTemplateName();
  if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
    showHint(
      `Template ${name} is a system template. Removing system template is note allowed.`,
    );
    return;
  }
  addon.api.template.removeTemplate(name);
  refresh();
}

function resetSelectedTemplate() {
  const name = getSelectedTemplateName();
  if (addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(name)) {
    addon.data.template.editor.editor.setValue(
      addon.api.template.DEFAULT_TEMPLATES.find((t) => t.name === name)?.text ||
        "",
    );
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
  new ztoolkit.Clipboard().addText(yaml, "text/plain").copy();
  showHint(
    `Template ${name} is copied to clipboard. To import it, goto Zotero menu bar, click Edit->New Template from Clipboard.  `,
  );
}

async function backupTemplates() {
  const time = new Date().toISOString().replace(/:/g, "-");
  const filepath = await new ztoolkit.FilePicker(
    "Save backup file",
    "save",
    [["yaml", "*.yaml"]],
    `bn-template-backup-${time}.yaml`,
  ).open();
  if (!filepath) {
    return;
  }
  const keys = addon.api.template.getTemplateKeys();
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
    "text",
  ).open();
  if (!filepath) {
    return;
  }
  const yaml = (await Zotero.File.getContentsAsync(filepath)) as string;
  const templates = YAML.parse(yaml) as NoteTemplate[];
  const existingNames = addon.api.template.getTemplateKeys();

  for (const t of templates) {
    if (existingNames.includes(t.name)) {
      const overwrite = win.confirm(
        `Template ${t.name} already exists. Overwrite?`,
      );
      if (!overwrite) {
        continue;
      }
    }
    addon.api.template.setTemplate(t);
  }
  await refresh();
}
