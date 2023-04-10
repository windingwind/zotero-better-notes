import { config } from "../../../package.json";
import { showHint } from "../../utils/hint";
import { renderNoteHTML } from "../../utils/note";
import { waitUtilAsync } from "../../utils/wait";

export async function savePDF(noteId: number) {
  const html = await renderNoteHTML(Zotero.Items.get(noteId));
  const win = window.openDialog(
    `chrome://${config.addonRef}/content/pdfPrinter.html`,
    `${config.addonRef}-imageViewer`,
    `chrome,centerscreen,resizable,status,width=900,height=650,dialog=no`
  )!;
  await waitUtilAsync(() => win.document.readyState === "complete");
  win.document.querySelector(".markdown-body")!.innerHTML = html;
  const printPromise = Zotero.Promise.defer();
  disablePrintFooterHeader();
  win.addEventListener("mouseover", (ev) => {
    win.close();
    printPromise.resolve();
  });
  win.print();
  await printPromise.promise;
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
