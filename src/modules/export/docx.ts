import { showHintWithLink } from "../../utils/hint";
import { renderNoteHTML } from "../../utils/note";
import { randomString } from "../../utils/str";
import { waitUtilAsync } from "../../utils/wait";
import { config } from "../../../package.json";

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
    "*",
  );
  await lock.promise;
  worker.contentWindow?.removeEventListener("message", listener);
  destroyWorker(worker);
  return blob!;
}

async function getWorker(): Promise<HTMLIFrameElement> {
  const worker = ztoolkit.UI.createElement(document, "iframe", {
    properties: {
      src: `chrome://${config.addonRef}/content/docxExport.html`,
    },
    styles: {
      width: "0",
      height: "0",
      border: "0",
      position: "absolute",
    },
  });
  window.document.documentElement.appendChild(worker);
  await waitUtilAsync(() => worker.contentDocument?.readyState === "complete");
  return worker;
}

function destroyWorker(worker: any) {
  worker.parentNode.removeChild(worker);
  worker = null;
}
