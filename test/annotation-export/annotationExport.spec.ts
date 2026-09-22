import { config } from "../../package.json";

describe("Annotation address export in Zotero", function () {
  this.timeout(30000);
  let restoreDialogs: (() => void) | undefined;
  afterEach(() => restoreDialogs?.());

  it("copies real highlights/underlines, persists comments and resolves PDF links", async function () {
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Export test article");
    parent.setField("date", "2026");
    parent.setCreators([
      { firstName: "A", lastName: "Kim", creatorType: "author" },
      { firstName: "B", lastName: "Lee", creatorType: "author" },
      { firstName: "C", lastName: "Park", creatorType: "author" },
    ]);
    await parent.saveTx();
    const attachment = new Zotero.Item("attachment");
    attachment.libraryID = parent.libraryID;
    attachment.parentID = parent.id;
    attachment.attachmentLinkMode = Zotero.Attachments.LINK_MODE_LINKED_FILE;
    attachment.attachmentContentType = "application/pdf";
    attachment.attachmentPath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "export-test.pdf",
    );
    await attachment.saveTx();
    const annotation = new Zotero.Item("annotation");
    annotation.libraryID = attachment.libraryID;
    annotation.parentID = attachment.id;
    annotation.annotationType = "highlight";
    annotation.annotationText =
      "Generative Electrolyte Solvent and Formulation Discovery";
    annotation.annotationComment = "测试注释 <b>重点</b>\n第二行";
    annotation.annotationColor = "#ffd400";
    annotation.annotationPageLabel = "2288";
    annotation.annotationSortIndex = "00000|000000|00000";
    annotation.annotationPosition = JSON.stringify({
      pageIndex: 0,
      rects: [[10, 10, 100, 30]],
    });
    await annotation.saveTx();

    // Use the handler registered by the built plugin, not a bundled copy.
    const listener = (Zotero.Reader as any)._registeredListeners.find(
      (entry: any) =>
        entry.pluginID === config.addonID &&
        entry.type === "createAnnotationContextMenu",
    );
    assert.exists(listener);
    const pref = `${config.prefsPrefix}.annotationExport.includeComment`;
    Zotero.Prefs.set(pref, false, true);
    const sandbox = new Cu.Sandbox("https://example.com", { wantXrays: false });
    const readerIDs = Cu.waiveXrays(
      Cu.evalInSandbox(JSON.stringify([annotation.key]), sandbox),
    );
    const menu = () => {
      const entries: any[] = [];
      listener.handler({
        reader: { _item: attachment },
        params: { ids: readerIDs },
        append: (...group: any[]) => entries.push(...group),
      });
      return entries;
    };
    // Match ReaderInstance._customEventHandler: export callbacks into the reader
    // compartment, then invoke there rather than directly from privileged tests.
    const mainWindow = Zotero.getMainWindow();
    const originalOpenDialog = mainWindow.openDialog;
    let dialogAttempts = 0;
    mainWindow.openDialog = (() => {
      dialogAttempts++;
      throw new Error("Reader export must not open a native dialog");
    }) as typeof mainWindow.openDialog;
    restoreDialogs = () => {
      mainWindow.openDialog = originalOpenDialog;
    };
    const runCommand = (index: number) => {
      sandbox.entries = Cu.cloneInto(menu(), sandbox, {
        wrapReflectors: true,
        cloneFunctions: true,
      });
      Cu.evalInSandbox(`entries[${index}].onCommand()`, sandbox);
    };
    assert.equal(menu().length, 2);
    assert.equal(menu()[1].checked, false);
    runCommand(0);
    await Zotero.Promise.delay(250);
    const text = Zotero.Utilities.Internal.getClipboard("text/plain")!;
    assert.include(text, annotation.annotationText);
    assert.include(text, "2026, p. 2288");
    assert.include(text, `zotero://select/library/items/${parent.key}`);
    const pdfLink = `zotero://open-pdf/library/items/${attachment.key}?page=1&annotation=${annotation.key}`;
    assert.include(text, pdfLink);
    assert.notInclude(text, "测试注释");
    runCommand(1);
    assert.isTrue(Zotero.Prefs.get(pref, true));
    assert.isTrue(menu()[1].checked);
    annotation.annotationType = "underline";
    await annotation.saveTx();
    runCommand(0);
    await Zotero.Promise.delay(250);
    assert.include(
      Zotero.Utilities.Internal.getClipboard("text/plain"),
      "测试注释 重点\n第二行",
    );
    const html = Zotero.Utilities.Internal.getClipboard("text/html")!;
    const doc = new DOMParser().parseFromString(html, "text/html");
    assert.equal(doc.querySelectorAll("a").length, 2);
    assert.equal(doc.querySelectorAll("a")[1].getAttribute("href"), pdfLink);
    assert.include(doc.body.textContent, "测试注释 重点\n第二行");
    assert.equal(
      dialogAttempts,
      0,
      "export with and without comments must not open native windows",
    );
    // Verify that the emitted key resolves to the annotation in the actual DB.
    assert.equal(
      Zotero.Items.getByLibraryAndKey(attachment.libraryID, annotation.key)
        .parentID,
      attachment.id,
    );
    // Exercise Zotero's actual URI router, intercepting only the file opener.
    await IOUtils.writeUTF8(attachment.attachmentPath, "%PDF-1.4\n");
    const originalOpen = Zotero.FileHandlers.open;
    let opened: any;
    try {
      Zotero.FileHandlers.open = async (item, options) => {
        opened = { itemID: item.id, options };
        return true;
      };
      const extension = (Services.io.getProtocolHandler("zotero") as any)
        .wrappedJSObject._extensions["zotero://open-pdf"];
      await extension.doAction(Services.io.newURI(pdfLink));
      assert.equal(opened.itemID, attachment.id);
      assert.equal(opened.options.location.pageIndex, 0);
      assert.equal(opened.options.location.annotationID, annotation.key);
    } finally {
      Zotero.FileHandlers.open = originalOpen;
    }
    Zotero.Prefs.clear(pref, true);
  });
});
