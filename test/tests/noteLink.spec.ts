import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";

/**
 * Regression tests for https://github.com/windingwind/zotero-better-notes/issues/1596
 *
 * `zotero://note` links that target a location inside a note (`?line=N`,
 * `?section=<name>`) used to open the note but never scroll to the target,
 * because the protocol handler called `onOpenNote` without `forceTakeover`
 * (early-returning through the plain `ZoteroPane.openNote`) and because the
 * resolved `tab` mode never forwarded the target to `scrollEditorTo`.
 */
describe("Note link navigation (#1596)", function () {
  const addon = getAddon();
  this.timeout(30000);

  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    await resetAll();
  });

  /** The `zotero://note` extension installed by `registerNoteLinkProxyHandler`. */
  function getNoteLinkExtension() {
    // @ts-ignore - internal Zotero protocol handler registry
    return Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
      "zotero://note"
    ];
  }

  async function createNote(innerHTML = "") {
    const note = new Zotero.Item("note");
    note.setNote(`<div data-schema-version="9">${innerHTML}</div>`);
    await note.saveTx();
    return note;
  }

  /** Poll until `condition` is truthy or `timeout` ms elapse. */
  async function waitUntil(condition: () => boolean, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return true;
      await Zotero.Promise.delay(100);
    }
    return false;
  }

  it("forwards the navigation target and forceTakeover through the zotero://note handler", async function () {
    const note = await createNote("<h1>Introduction</h1><h1>Section 1</h1>");

    const ext = getNoteLinkExtension();
    expect(ext, "zotero://note handler should be registered").to.exist;

    // Intercept onOpenNote to inspect what the handler passes downstream.
    const originalOpenNote = addon.hooks.onOpenNote;
    const calls: Array<[number, string, any]> = [];
    // @ts-ignore - stub for the test
    addon.hooks.onOpenNote = (...args: [number, string, any]) => {
      calls.push(args);
    };

    try {
      await ext.doAction({
        spec: `zotero://note/u/${note.key}/?section=${encodeURIComponent(
          "Section 1",
        )}`,
      });
    } finally {
      addon.hooks.onOpenNote = originalOpenNote;
    }

    expect(calls.length).to.equal(1);
    const [noteId, , options] = calls[0];
    expect(noteId).to.equal(note.id);
    expect(options.sectionName).to.equal("Section 1");
    // The regression: without forceTakeover, onOpenNote drops the target and
    // opens the note at the top.
    expect(options.forceTakeover).to.equal(true);
  });

  it("scrolls the tab editor to the target line", async function () {
    const note = await createNote(
      "<h1>Introduction</h1><p>a</p><p>b</p><h1>Section 1</h1><p>c</p>",
    );

    const originalScroll = addon.api.editor.scroll;
    const scrollCalls: Array<{ noteId?: number; lineIndex: number }> = [];
    // @ts-ignore - spy for the test
    addon.api.editor.scroll = (editor: any, lineIndex: number) => {
      scrollCalls.push({ noteId: editor?._item?.id, lineIndex });
    };

    try {
      await addon.hooks.onOpenNote(note.id, "tab", {
        forceTakeover: true,
        lineIndex: 3,
      });
      const called = await waitUntil(() =>
        scrollCalls.some((c) => c.noteId === note.id),
      );
      expect(called, "editor.scroll should be called for the opened note").to.be
        .true;
    } finally {
      addon.api.editor.scroll = originalScroll;
    }

    const call = scrollCalls.find((c) => c.noteId === note.id);
    expect(call?.lineIndex).to.equal(3);
  });

  it("scrolls the tab editor to the target section", async function () {
    const note = await createNote(
      "<h1>Introduction</h1><p>a</p><p>b</p><h1>Section 1</h1><p>c</p>",
    );

    const originalScrollToSection = addon.api.editor.scrollToSection;
    const sectionCalls: Array<{ noteId?: number; sectionName: string }> = [];
    // @ts-ignore - spy for the test
    addon.api.editor.scrollToSection = async (
      editor: any,
      sectionName: string,
    ) => {
      sectionCalls.push({ noteId: editor?._item?.id, sectionName });
    };

    try {
      await addon.hooks.onOpenNote(note.id, "tab", {
        forceTakeover: true,
        sectionName: "Section 1",
      });
      const called = await waitUntil(() =>
        sectionCalls.some((c) => c.noteId === note.id),
      );
      expect(
        called,
        "editor.scrollToSection should be called for the opened note",
      ).to.be.true;
    } finally {
      addon.api.editor.scrollToSection = originalScrollToSection;
    }

    const call = sectionCalls.find((c) => c.noteId === note.id);
    expect(call?.sectionName).to.equal("Section 1");
  });
});
