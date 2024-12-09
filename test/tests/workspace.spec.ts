import { BasicTool } from "zotero-plugin-toolkit";
import { waitForNoteWindow, waitForTabSelectEvent } from "../utils/wait";
import { resetAll } from "../utils/status";

describe("Workspace", function () {
  const tool = new BasicTool();

  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    await resetAll();
  });

  it("should open note in tab", async function () {
    const note = new Zotero.Item("note");
    await note.saveTx();

    const promise = waitForTabSelectEvent();

    // An example of how to debug the test
    debug("Calling viewItems");

    tool.getGlobal("ZoteroPane").viewItems([note]);
    await promise;

    const selectedID = tool.getGlobal("Zotero_Tabs").selectedID;
    const selectedTab = tool.getGlobal("Zotero_Tabs")._getTab(selectedID);

    expect(selectedTab.tab.data.itemID).to.be.equal(note.id);
  });

  it("should open note in window if shift key is pressed", async function () {
    const note = new Zotero.Item("note");
    await note.saveTx();

    const promise = waitForNoteWindow();

    tool.getGlobal("ZoteroPane").viewItems([note], { shiftKey: true });
    const win = await promise;

    expect(win).to.be.not.null;

    const editor = win!.document.querySelector(
      "#zotero-note-editor",
    ) as EditorElement;

    expect(editor).to.be.not.null;

    expect(editor.item?.id).to.be.equal(note.id);
  });
});
