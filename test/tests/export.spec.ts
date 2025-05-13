import { ClipboardHelper } from "zotero-plugin-toolkit";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import {
  getNoteContent,
  getNoteLatexContent,
  getNoteMarkdown,
  getNoteLatex,
  parseTemplateString,
} from "../utils/note";
import { getTempDirectory } from "../utils/io";

describe("Export", function () {
  const addon = getAddon();
  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {});

  it("api.$export.saveMD", async function () {
    const note = new Zotero.Item("note");
    note.setNote(getNoteContent());
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.md");

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: true,
      withYAMLHeader: false,
    });

    debug("Note saved to", filePath);

    const content = await Zotero.File.getContentsAsync(filePath);

    const expected = getNoteMarkdown();

    // new ClipboardHelper()
    //   .addText(parseTemplateString(content as string), "text/plain")
    //   .addText(parseTemplateString(expected), "text/html")
    //   .copy();

    assert.equal(content, expected);

    await Zotero.Items.erase(note.id);
  });

  it("api.$export.saveLatex", async function () {
    const note = new Zotero.Item("note");
    note.setNote(getNoteLatexContent());
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.tex");

    await addon.api.$export.saveLatex(filePath, note.id);

    debug("Note saved to", filePath);

    const content = await Zotero.File.getContentsAsync(filePath);

    const expected = getNoteLatex();

    assert.equal(content, expected);

    await Zotero.Items.erase(note.id);
  });
});
