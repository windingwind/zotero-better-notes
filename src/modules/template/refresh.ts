import YAML = require("yamljs");
import { htmlUnescape } from "../../utils/str";

export { refreshTemplatesInNote };

async function refreshTemplatesInNote(editor: Zotero.EditorInstance) {
  const lines = addon.api.note.getLinesInNote(editor._item);
  let startIndex = -1;
  const matchedIndexPairs: { from: number; to: number }[] = [];

  function isTemplateWrapperStart(index: number) {
    return (
      index < lines.length - 1 &&
      lines[index].trim() === "<hr>" &&
      lines[index + 1].trim().startsWith("<pre>") &&
      lines[index + 1].includes("template: ")
    );
  }

  function isTemplateWrapperEnd(index: number) {
    return startIndex >= 0 && lines[index].trim() === "<hr>";
  }

  for (let i = 0; i < lines.length; i++) {
    // Match: 1. current line is <hr>; 2. next line is <pre> and contains template key; 3. then contains any number of lines; until end with <hr> line
    if (isTemplateWrapperStart(i)) {
      startIndex = i;
      continue;
    }
    if (isTemplateWrapperEnd(i)) {
      matchedIndexPairs.push({ from: startIndex, to: i });
      startIndex = -1;
    }
  }

  let indexOffset = 0;
  for (const { from, to } of matchedIndexPairs) {
    const yamlContent = htmlUnescape(
      lines[from + 1].replace("<pre>", "").replace("</pre>", ""),
      { excludeLineBreak: true },
    );
    const { template, items } = YAML.parse(yamlContent) as {
      template: string;
      items?: string[];
    };
    let html = "";
    if (template.toLowerCase().startsWith("[item]")) {
      html = await addon.api.template.runItemTemplate(template, {
        targetNoteId: editor._item.id,
        itemIds: items
          ?.map((id) => {
            const [libraryID, key] = id.split("/");
            return Zotero.Items.getIDFromLibraryAndKey(Number(libraryID), key);
          })
          .filter((id) => !!id) as number[],
      });
    } else {
      html = await addon.api.template.runTextTemplate(template, {
        targetNoteId: editor._item.id,
      });
    }
    const currentLineCount = addon.api.editor.getLineCount(editor);
    addon.api.editor.del(
      editor,
      addon.api.editor.getPositionAtLine(editor, from + indexOffset, "start"),
      addon.api.editor.getPositionAtLine(editor, to + indexOffset + 1, "start"),
    );
    const position = addon.api.editor.getPositionAtLine(
      editor,
      from + indexOffset,
      "start",
    );
    addon.api.editor.insert(editor, html, position);

    const newLineCount = addon.api.editor.getLineCount(editor);
    indexOffset -= currentLineCount - newLineCount;
  }
}
