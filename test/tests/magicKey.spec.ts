import { wait } from "zotero-plugin-toolkit";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";

describe("MagicKey", function () {
  const addon = getAddon();
  const commandID = "test.magicKeyCommand";

  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    addon.api.editor.unregisterMagicKeyCommand(commandID);
    await resetAll();
  });

  it("api.editor.registerMagicKeyCommand", async function () {
    const note = new Zotero.Item("note");
    note.setNote("<p>Magic key test</p>");
    await note.saveTx();

    await Zotero.getActiveZoteroPane().selectItem(note.id);
    await wait.waitUtilAsync(
      () => !!addon.api.editor.getEditorInstance(note.id),
    );
    const editor = addon.api.editor.getEditorInstance(note.id)!;
    await editor._initPromise;

    let executedWith: Zotero.EditorInstance | undefined;
    const registered = addon.api.editor.registerMagicKeyCommand({
      id: commandID,
      title: "Test Magic Command",
      searchParts: ["tmc", "testMagicCommand"],
      handler: (ed: Zotero.EditorInstance) => {
        executedWith = ed;
      },
    });
    assert.equal(registered, commandID);

    // Duplicate IDs are rejected
    assert.isFalse(
      addon.api.editor.registerMagicKeyCommand({
        id: commandID,
        title: "Duplicate",
        handler: () => {},
      }),
    );

    const win = editor._iframeWindow as any;
    const doc = win.document as Document;

    // The palette anchors to the DOM selection, so the editor must be focused
    editor.focus();
    await wait.waitUtilAsync(() => !!win.getSelection()?.anchorNode);

    openCommandPalette(editor);
    await wait.waitUtilAsync(
      () => !!doc.querySelector(".command-palette .popup-item"),
    );

    const item = findPaletteItem(doc, "Test Magic Command");
    assert.exists(item);

    item!.dispatchEvent(
      new win.MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    await wait.waitUtilAsync(() => !!executedWith);
    assert.equal(executedWith, editor);
    assert.notExists(doc.querySelector(".command-palette"));

    // Unregistering removes the command from the palette
    assert.isTrue(addon.api.editor.unregisterMagicKeyCommand(commandID));

    await wait.waitUtilAsync(() => !!win.getSelection()?.anchorNode);
    openCommandPalette(editor);
    await wait.waitUtilAsync(
      () => !!doc.querySelector(".command-palette .popup-item"),
    );
    assert.notExists(findPaletteItem(doc, "Test Magic Command"));
  });
});

function openCommandPalette(editor: Zotero.EditorInstance) {
  const win = editor._iframeWindow as any;
  const pmDOM = win.document.querySelector(".primary-editor") as HTMLElement;
  pmDOM.dispatchEvent(
    new win.KeyboardEvent("keydown", {
      key: "/",
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function findPaletteItem(doc: Document, title: string) {
  return (
    Array.from(
      doc.querySelectorAll(".command-palette .popup-item"),
    ) as HTMLElement[]
  ).find((el) => el.querySelector(".popup-item-title")?.textContent === title);
}
