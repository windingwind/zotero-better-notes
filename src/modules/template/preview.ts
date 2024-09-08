import YAML = require("yamljs");
import { getNoteLink } from "../../utils/link";

export { renderTemplatePreview };

async function renderTemplatePreview(
  templateName: string,
  inputItems?: Zotero.Item[],
): Promise<string> {
  let html: string = generateWarning("Preview not available");
  if (!inputItems) {
    inputItems = ZoteroPane.getSelectedItems();
  }
  try {
    if (templateName.toLowerCase().startsWith("[text]")) {
      html = await addon.api.template.runTextTemplate(templateName, {
        dryRun: true,
      });
    } else if (templateName.toLowerCase().startsWith("[item]")) {
      if (inputItems.length === 0) {
        return messages.noItem;
      }
      const data = inputItems?.map((item) => item.id);
      html = await addon.api.template.runItemTemplate(templateName, {
        itemIds: data,
        dryRun: true,
      });
    } else if (templateName.includes("ExportMDFileName")) {
      // noteItem
      const data = inputItems?.find((item) => item.isNote());
      if (!data) {
        html = messages.noNoteItem;
      } else {
        html = await addon.api.template.runTemplate(
          templateName,
          "noteItem",
          [data],
          {
            dryRun: true,
          },
        );
      }
    } else if (templateName.includes("ExportMDFileHeader")) {
      // noteItem
      const data = inputItems?.find((item) => item.isNote());
      if (!data) {
        html = messages.noNoteItem;
      } else {
        const raw = await addon.api.template.runTemplate(
          templateName,
          "noteItem",
          [data],
          {
            dryRun: true,
          },
        );
        const header = Object.assign({}, JSON.parse(raw), {
          version: data.version,
          libraryID: data.libraryID,
          itemKey: data.key,
        });
        html = `<pre>${YAML.stringify(header, 10)}</pre>`;
      }
    } else if (templateName.includes("ExportMDFileContent")) {
      // noteItem
      const data = inputItems?.find((item) => item.isNote());
      if (!data) {
        html = messages.noNoteItem;
      } else {
        html = `<pre>${await addon.api.convert.note2md(
          data,
          Zotero.getTempDirectory().path,
          { withYAMLHeader: false, skipSavingImages: true, keepNoteLink: true },
        )}</pre>`;
      }
    } else if (templateName.includes("QuickInsert")) {
      // link, linkText, subNoteItem, noteItem
      const data = inputItems?.find((item) => item.isNote());
      if (!data) {
        html = messages.noNoteItem;
      } else {
        const link = getNoteLink(data);
        const linkText = data.getNoteTitle().trim() || link;
        const subNoteItem = data;
        const noteItem = new Zotero.Item("note");
        html = await addon.api.template.runTemplate(
          templateName,
          "link, linkText, subNoteItem, noteItem",
          [link, linkText, subNoteItem, noteItem],
          {
            dryRun: true,
          },
        );
      }
    } else if (templateName.includes("QuickBackLink")) {
      // link, linkText, subNoteItem, noteItem
      const data = inputItems?.find((item) => item.isNote());
      if (!data) {
        html = messages.noNoteItem;
      } else {
        const link = getNoteLink(data);
        const noteItem = new Zotero.Item("note");
        const linkText = noteItem.getNoteTitle().trim() || "Workspace Note";
        const subNoteItem = data;
        html = await addon.api.template.runTemplate(
          templateName,
          "link, linkText, subNoteItem, noteItem",
          [link, linkText, subNoteItem, noteItem],
          {
            dryRun: true,
          },
        );
      }
    } else if (templateName.includes("QuickImport")) {
      // link, noteItem
      const data = inputItems?.find((item) => item.isNote());
      if (!data) {
        html = messages.noNoteItem;
      } else {
        const link = getNoteLink(data);
        const noteItem = new Zotero.Item("note");
        html = await addon.api.template.runTemplate(
          templateName,
          "link, noteItem",
          [link, noteItem],
          {
            dryRun: true,
          },
        );
      }
    } else if (templateName.includes("QuickNote")) {
      // annotationItem, topItem, noteItem
      html = generateWarning(
        `Preview not available for template ${templateName}`,
      );
    } else {
      html = generateWarning(
        `Preview not available for template ${templateName}`,
      );
    }
  } catch (err: any) {
    html = generateWarning(`Error: ${err.message || "Unknown error"}`);
  }

  return html;
}

function generateWarning(message: string): string {
  return `<p style="color: red;">${message}</p>`;
}

const messages = {
  noItem: generateWarning(
    "No item selected. Please select an item in the library.",
  ),
  noNoteItem: generateWarning(
    "No NOTE item selected. Please select a NOTE item in the library.",
  ),
};
