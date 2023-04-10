import { showHintWithLink } from "../../utils/hint";
import { renderNoteHTML } from "../../utils/note";
import { getFileContent, randomString } from "../../utils/str";
import { waitUtilAsync } from "../../utils/wait";

export async function saveDocx(filename: string, noteId: number) {
  const noteItem = Zotero.Items.get(noteId);
  await Zotero.File.putContentsAsync(filename, await note2docx(noteItem));
  showHintWithLink(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filename);
  });
}

async function note2docx(noteItem: Zotero.Item) {
  const renderedContent = await renderNoteHTML(noteItem);
  let htmlDoc =
    '<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"></head>\n';
  htmlDoc += renderedContent;
  htmlDoc += "\n</html>";

  let blob: ArrayBufferLike;
  const lock = Zotero.Promise.defer();
  const jobId = randomString(6, new Date().toUTCString());
  const listener = (ev: MessageEvent) => {
    if (ev.data.type === "parseDocxReturn" && ev.data.jobId === jobId) {
      blob = ev.data.message;
      lock.resolve();
    }
  };
  const worker = await getWorker();
  worker.contentWindow?.addEventListener("message", listener);
  worker.contentWindow?.postMessage(
    {
      type: "parseDocx",
      jobId,
      message: htmlDoc,
    },
    "*"
  );
  await lock.promise;
  worker.contentWindow?.removeEventListener("message", listener);
  return blob!;
}

async function getWorker() {
  if (addon.data.export.docx.worker) {
    return addon.data.export.docx.worker;
  }
  const worker = Zotero.Browser.createHiddenBrowser(
    window
  ) as HTMLIFrameElement;
  await waitUtilAsync(() => worker.contentDocument?.readyState === "complete");

  const doc = worker.contentDocument;
  ztoolkit.UI.appendElement(
    {
      tag: "script",
      properties: {
        innerHTML: await getFileContent(
          rootURI + "chrome/content/scripts/docxWorker.js"
        ),
      },
    },
    doc?.head!
  );
  addon.data.export.docx.worker = worker;
  return worker;
}
