import { config } from "../../../package.json";
import { showHint } from "../../utils/hint";
import { renderNoteHTML } from "../../utils/note";

export async function savePDF(noteId: number) {
  const html = await renderNoteHTML(Zotero.Items.get(noteId));
  disablePrintFooterHeader();

  const { HiddenBrowser } = ChromeUtils.importESModule(
    "chrome://zotero/content/HiddenBrowser.mjs",
  );
  const browser = new HiddenBrowser({
    useHiddenFrame: false,
  });

  await browser.load(
    `chrome://${config.addonRef}/content/printTemplate.xhtml`,
    {
      requireSuccessfulStatus: true,
    },
  );
  await browser.waitForDocument();

  browser.contentWindow.postMessage(
    { type: "print", html, style: Zotero.Prefs.get("note.css") || "" },
    "*",
  );

  browser.print();

  showHint("Note Saved as PDF");
}

function disablePrintFooterHeader() {
  Zotero.Prefs.resetBranch([], "print");
  Zotero.Prefs.set("print.print_footercenter", "", true);
  Zotero.Prefs.set("print.print_footerleft", "", true);
  Zotero.Prefs.set("print.print_footerright", "", true);
  Zotero.Prefs.set("print.print_headercenter", "", true);
  Zotero.Prefs.set("print.print_headerleft", "", true);
  Zotero.Prefs.set("print.print_headerright", "", true);
}
