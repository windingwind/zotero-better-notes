import { ClipboardHelper, wait } from "zotero-plugin-toolkit";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import {
  getNoteContent,
  getNoteMarkdown,
  parseTemplateString,
} from "../utils/note";
import { getTempDirectory } from "../utils/io";
import { waitForItemModifyEvent, waitForNoteWindow } from "../utils/wait";

describe("Import", function () {
  const addon = getAddon();
  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {});

  it("api.$import.fromMD", async function () {
    const note = new Zotero.Item("note");
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.md");

    await Zotero.File.putContentsAsync(filePath, getNoteMarkdown());

    debug("Note saved to", filePath);

    let itemModifyPromise = waitForItemModifyEvent(note.id);

    await addon.api.$import.fromMD(filePath, {
      noteId: note.id,
      ignoreVersion: true,
    });

    await itemModifyPromise;

    const win = await addon.hooks.onOpenNote(note.id, "window");

    // Wait for the editor to be ready
    await wait.waitUtilAsync(() => {
      return !!addon.api.editor.getEditorInstance(note.id);
    });

    itemModifyPromise = waitForItemModifyEvent(note.id);
    const editor = addon.api.editor.getEditorInstance(note.id);
    assert.exists(editor);

    addon.api.editor.insert(editor, "<p>temp</p<", "start");
    const start = addon.api.editor.getPositionAtLine(editor, 0, "start");
    const end = addon.api.editor.getPositionAtLine(editor, 0, "end");
    addon.api.editor.del(editor, start, end);

    editor?.saveSync();

    await itemModifyPromise;

    win?.close();

    const content = note.getNote();
    const expected = getNoteContent()
      // Exception: This will be merged into a single line, due to `li` tag behavior
      .replace(
        `<p>Item 2</p>
<p>Continuation of item 2 without proper indentation.</p>`,
        "Item 2Continuation of item 2 without proper indentation.",
      );

    // new ClipboardHelper()
    //   .addText(parseTemplateString(content), "text/plain")
    //   .addText(parseTemplateString(expected), "text/html")
    //   .copy();

    assert.equal(content, expected);

    // Cleanup
    await Zotero.Items.erase(note.id);
  });
});
