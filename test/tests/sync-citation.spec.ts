import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import { getTempDirectory } from "../utils/io";

// Regression tests for #1597: citation links broke after export/sync to
// Markdown, because the export-only select link leaked back into the note and
// every subsequent export wrapped it in another (invalid, nested) `<a>`.
describe("Sync - Citation links", function () {
  const addon = getAddon();
  // The Markdown conversion runs through a worker, so give it some room.
  this.timeout(30000);

  const createdIds = new Set<number>();

  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    for (const id of createdIds) {
      try {
        await Zotero.Items.erase(id);
      } catch (e) {
        // ignore, already gone
      }
    }
    createdIds.clear();
    await resetAll();
  });

  /** A regular item that a citation can point at. */
  async function createRegularItem() {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "A Study of Citation Round-Trips");
    item.setCreator(0, {
      firstName: "Firstname",
      lastName: "Lastname",
      creatorType: "author",
    });
    item.setField("date", "2020");
    await item.saveTx();
    createdIds.add(item.id);
    return item;
  }

  /** The citation HTML a real note stores when citing `item` (as `/ic` does). */
  async function citationHTML(item: Zotero.Item) {
    return (await addon.api.convert.item2citation([item.id], [{}])) as string;
  }

  async function createNote(innerHTML: string) {
    const note = new Zotero.Item("note");
    note.setNote(`<div data-schema-version="9">${innerHTML}</div>`);
    await note.saveTx();
    createdIds.add(note.id);
    return note;
  }

  function countAnchors(str: string) {
    return (str.match(/<a[ >]/g) || []).length;
  }

  it("exports a citation as a single, non-nested link", async function () {
    const item = await createRegularItem();
    const note = await createNote(await citationHTML(item));
    const dir = await getTempDirectory();

    const md = await addon.api.convert.note2md(note, dir, {
      keepNoteLink: true,
    });

    // The citation stays clickable, as exactly one non-nested anchor.
    expect(md).to.include("zotero://select/library/items/");
    expect(countAnchors(md)).to.equal(1);
    expect(md).to.not.match(/<a[^>]*>\s*<a/);
    expect(md).to.not.include("</a></a>");
  });

  it("does not leak the export link into the note on import", async function () {
    const item = await createRegularItem();
    const note = await createNote(await citationHTML(item));
    const dir = await getTempDirectory();

    const md = await addon.api.convert.note2md(note, dir, {
      keepNoteLink: true,
    });

    // md -> note (this is what two-way sync / import does).
    const mdStatus = addon.api.sync.getMDStatusFromContent(md);
    const noteContent = await addon.api.convert.md2note(mdStatus, note, {
      isImport: true,
    });

    // Citation metadata is kept; the export-only select link and `ztype` are not.
    expect(noteContent).to.include('class="citation"');
    expect(noteContent).to.include("data-citation");
    expect(noteContent).to.not.include("zotero://select/");
    expect(noteContent).to.not.include("ztype");
  });

  it("stays stable across an export/import/export round-trip", async function () {
    const item = await createRegularItem();
    const note = await createNote(await citationHTML(item));
    const dir = await getTempDirectory();

    const md = await addon.api.convert.note2md(note, dir, {
      keepNoteLink: true,
    });
    const mdStatus = addon.api.sync.getMDStatusFromContent(md);
    const noteContent = await addon.api.convert.md2note(mdStatus, note, {
      isImport: true,
    });

    // Write the imported content back and export again.
    note.setNote(`<div data-schema-version="9">${noteContent}</div>`);
    await note.saveTx();
    const md2 = await addon.api.convert.note2md(note, dir, {
      keepNoteLink: true,
    });

    // Still a single, non-nested link after a full round-trip.
    expect(md2).to.include("zotero://select/library/items/");
    expect(countAnchors(md2)).to.equal(1);
    expect(md2).to.not.match(/<a[^>]*>\s*<a/);
    expect(md2).to.not.include("</a></a>");
  });

  it("collapses an already-nested citation link on export", async function () {
    // Simulate a note left in the broken state by a previous buggy sync: the
    // citation item already contains the select-link anchor.
    const item = await createRegularItem();
    const enc = encodeURIComponent(
      JSON.stringify({
        citationItems: [{ uris: [Zotero.URI.getItemURI(item)] }],
        properties: {},
      }),
    );
    const dirtyCitation =
      `<p><span class="citation" data-citation="${enc}">` +
      `(<span class="citation-item">` +
      `<a href="zotero://select/library/items/${item.key}">Lastname Firstname, 2020</a>` +
      `</span>)</span></p>`;
    const note = await createNote(dirtyCitation);
    const dir = await getTempDirectory();

    const md = await addon.api.convert.note2md(note, dir, {
      keepNoteLink: true,
    });

    // The pre-existing anchor is unwrapped, not wrapped again.
    expect(countAnchors(md)).to.equal(1);
    expect(md).to.not.match(/<a[^>]*>\s*<a/);
    expect(md).to.not.include("</a></a>");
  });
});
