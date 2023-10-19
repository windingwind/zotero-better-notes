import { config } from "../../../package.json";
import { showHint } from "../../utils/hint";
import { renderNoteHTML } from "../../utils/note";

export async function savePDF(noteId: number) {
  const html = await renderNoteHTML(Zotero.Items.get(noteId));
  disablePrintFooterHeader();
  const args = {
    _initPromise: Zotero.Promise.defer(),
    browser: undefined as any,
    url: `chrome://${config.addonRef}/content/printTemplate.xhtml`,
  };
  const win = window.openDialog(
    `chrome://${config.addonRef}/content/printWrapper.xhtml`,
    `${config.addonRef}-printWrapper`,
    `chrome,centerscreen,resizable,status,width=900,height=650,dialog=no`,
    args,
  )!;
  await args._initPromise.promise;
  args.browser?.contentWindow.postMessage({ type: "print", html }, "*");
  win.print();
  showHint("Note Saved as PDF");
}

function disablePrintFooterHeader() {
  // @ts-ignore
  Zotero.Prefs.resetBranch([], "print");
  Zotero.Prefs.set("print.print_footercenter", "", true);
  Zotero.Prefs.set("print.print_footerleft", "", true);
  Zotero.Prefs.set("print.print_footerright", "", true);
  Zotero.Prefs.set("print.print_headercenter", "", true);
  Zotero.Prefs.set("print.print_headerleft", "", true);
  Zotero.Prefs.set("print.print_headerright", "", true);
}
