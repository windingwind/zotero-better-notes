import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { getNoteLink, getNoteLinkParams } from "../utils/link";
import { addLineToNote } from "../utils/note";

export function registerReaderInitializer() {
  ztoolkit.ReaderInstance.register(
    "initialized",
    `${config.addonRef}-annotationButtons`,
    initializeReaderAnnotationButton
  );
  // Force re-initialize
  Zotero.Reader._readers.forEach((r) => {
    initializeReaderAnnotationButton(r);
  });
}

export function unregisterReaderInitializer() {
  Zotero.Reader._readers.forEach((r) => {
    unInitializeReaderAnnotationButton(r);
  });
}

export async function checkReaderAnnotationButton(items: Zotero.Item[]) {
  const hitSet = new Set<number>();
  let t = 0;
  const period = 100;
  const wait = 5000;
  while (items.length > hitSet.size && t < wait) {
    for (const instance of Zotero.Reader._readers) {
      const hitItems = await initializeReaderAnnotationButton(instance);
      hitItems.forEach((item) => hitSet.add(item.id));
    }
    await Zotero.Promise.delay(period);
    t += period;
  }
}

async function initializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance
): Promise<Zotero.Item[]> {
  if (!instance) {
    return [];
  }
  await instance._initPromise;
  await instance._waitForReader();
  const _document = instance._iframeWindow?.document;
  if (!_document) {
    return [];
  }
  const hitItems: Zotero.Item[] = [];
  for (const moreButton of _document.querySelectorAll(".more")) {
    if (moreButton.getAttribute("_betternotesInitialized") === "true") {
      continue;
    }
    moreButton.setAttribute("_betternotesInitialized", "true");

    let annotationWrapper = moreButton;
    while (!annotationWrapper.getAttribute("data-sidebar-annotation-id")) {
      annotationWrapper = annotationWrapper.parentElement!;
    }
    const itemKey =
      annotationWrapper.getAttribute("data-sidebar-annotation-id") || "";
    if (!instance.itemID) {
      continue;
    }
    const libraryID = Zotero.Items.get(instance.itemID).libraryID;
    const annotationItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      libraryID,
      itemKey
    )) as Zotero.Item;

    if (!annotationItem) {
      continue;
    }

    hitItems.push(annotationItem);

    const annotationButtons: TagElementProps[] = [
      {
        tag: "div",
        classList: ["icon"],
        properties: {
          innerHTML: ICONS.readerQuickNote,
        },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              createNoteFromAnnotation(
                annotationItem,
                (e as MouseEvent).shiftKey ? "standalone" : "auto"
              );
              e.preventDefault();
            },
          },
          {
            type: "mouseover",
            listener: (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#F0F0F0";
            },
          },
          {
            type: "mouseout",
            listener: (e) => {
              (e.target as HTMLElement).style.removeProperty(
                "background-color"
              );
            },
          },
        ],
        enableElementRecord: true,
      },
    ];

    if (annotationItem.annotationType === "image") {
      annotationButtons.push({
        tag: "div",
        classList: ["icon"],
        properties: {
          innerHTML: ICONS.readerOCR,
        },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              // TODO: OCR
              e.preventDefault();
            },
          },
          {
            type: "mouseover",
            listener: (e) => {
              (e.target as HTMLElement).style.backgroundColor = "#F0F0F0";
            },
          },
          {
            type: "mouseout",
            listener: (e) => {
              (e.target as HTMLElement).style.removeProperty(
                "background-color"
              );
            },
          },
        ],
        enableElementRecord: true,
      });
    }

    ztoolkit.UI.insertElementBefore(
      {
        tag: "fragment",
        children: annotationButtons,
      },
      moreButton
    );
  }
  return hitItems;
}

async function unInitializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance
): Promise<void> {
  if (!instance) {
    return;
  }
  await instance._initPromise;
  await instance._waitForReader();
  const _document = instance._iframeWindow?.document;
  if (!_document) {
    return;
  }
  for (const moreButton of _document.querySelectorAll(".more")) {
    if (moreButton.getAttribute("_betternotesInitialized") === "true") {
      moreButton.removeAttribute("_betternotesInitialized");
    }
  }
}

async function createNoteFromAnnotation(
  annotationItem: Zotero.Item,
  openMode: "standalone" | "auto" = "auto"
) {
  const annotationTags = annotationItem.getTags().map((_) => _.tag);
  const linkRegex = new RegExp("^zotero://note/(.*)$");
  for (const tag of annotationTags) {
    if (linkRegex.test(tag)) {
      const linkParams = getNoteLinkParams(tag);
      if (linkParams.noteItem) {
        addon.hooks.onOpenNote(linkParams.noteItem.id, openMode, {
          lineIndex: linkParams.lineIndex || undefined,
        });
        return;
      } else {
        annotationItem.removeTag(tag);
        await annotationItem.saveTx();
      }
    }
  }

  const note: Zotero.Item = new Zotero.Item("note");
  note.libraryID = annotationItem.libraryID;
  note.parentID = annotationItem.parentItem!.parentID;
  await note.saveTx();

  // await waitUtilAsync(() => Boolean(getEditorInstance(note.id)));

  const renderredTemplate = await addon.api.template.runTemplate(
    "[QuickNoteV5]",
    "annotationItem, topItem, noteItem",
    [annotationItem, annotationItem.parentItem!.parentItem, note]
  );
  await addLineToNote(note, renderredTemplate);

  const tags = annotationItem.getTags();
  for (const tag of tags) {
    note.addTag(tag.tag, tag.type);
  }
  await note.saveTx();

  ZoteroPane.openNoteWindow(note.id);

  annotationItem.addTag(getNoteLink(note)!);
  await annotationItem.saveTx();
}

// async function OCRImageAnnotation(src: string, annotationItem: Zotero.Item) {
//   /*
//       message.content = {
//         params: { src: string, annotationItem: Zotero.Item }
//       }
//     */
//   let result: string;
//   let success: boolean;
//   const engine = Zotero.Prefs.get("Knowledge4Zotero.OCREngine");
//   if (engine === "mathpix") {
//     const xhr = await Zotero.HTTP.request(
//       "POST",
//       "https://api.mathpix.com/v3/text",
//       {
//         headers: {
//           "Content-Type": "application/json; charset=utf-8",
//           app_id: Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appid"),
//           app_key: Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appkey"),
//         },
//         body: JSON.stringify({
//           src: src,
//           math_inline_delimiters: ["$", "$"],
//           math_display_delimiters: ["$$", "$$"],
//           rm_spaces: true,
//         }),
//         responseType: "json",
//       }
//     );
//     this._Addon.toolkit.Tool.log(xhr);
//     if (xhr && xhr.status && xhr.status === 200 && xhr.response.text) {
//       result = xhr.response.text;
//       success = true;
//     } else {
//       result = xhr.status === 200 ? xhr.response.error : `${xhr.status} Error`;
//       success = false;
//     }
//   } else if (engine === "xunfei") {
//     /**
//      * 1.Doc：https://www.xfyun.cn/doc/words/formula-discern/API.html
//      * 2.Error code：https://www.xfyun.cn/document/error-code
//      * @author iflytek
//      */

//     const config = {
//       hostUrl: "https://rest-api.xfyun.cn/v2/itr",
//       host: "rest-api.xfyun.cn",
//       appid: Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APPID"),
//       apiSecret: Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APISecret"),
//       apiKey: Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APIKey"),
//       uri: "/v2/itr",
//     };

//     let date = new Date().toUTCString();
//     let postBody = getPostBody();
//     let digest = getDigest(postBody);

//     const xhr = await Zotero.HTTP.request("POST", config.hostUrl, {
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "application/json,version=1.0",
//         Host: config.host,
//         Date: date,
//         Digest: digest,
//         Authorization: getAuthStr(date, digest),
//       },
//       body: JSON.stringify(postBody),
//       responseType: "json",
//     });

//     if (xhr?.response?.code === 0) {
//       result = xhr.response.data.region
//         .filter((r) => r.type === "text")
//         .map((r) => r.recog.content)
//         .join(" ")
//         .replace(/ifly-latex-(begin)?(end)?/g, "$");
//       this._Addon.toolkit.Tool.log(xhr);
//       success = true;
//     } else {
//       result =
//         xhr.status === 200
//           ? `${xhr.response.code} ${xhr.response.message}`
//           : `${xhr.status} Error`;
//       success = false;
//     }

//     function getPostBody() {
//       let digestObj = {
//         common: {
//           app_id: config.appid,
//         },
//         business: {
//           ent: "teach-photo-print",
//           aue: "raw",
//         },
//         data: {
//           image: src.split(",").pop(),
//         },
//       };
//       return digestObj;
//     }

//     function getDigest(body) {
//       return (
//         "SHA-256=" +
//         CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(JSON.stringify(body)))
//       );
//     }

//     function getAuthStr(date, digest) {
//       let signatureOrigin = `host: ${config.host}\ndate: ${date}\nPOST ${config.uri} HTTP/1.1\ndigest: ${digest}`;
//       let signatureSha = CryptoJS.HmacSHA256(signatureOrigin, config.apiSecret);
//       let signature = CryptoJS.enc.Base64.stringify(signatureSha);
//       let authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`;
//       return authorizationOrigin;
//     }
//   } else if (engine === "bing") {
//     const xhr = await Zotero.HTTP.request(
//       "POST",
//       "https://www.bing.com/cameraexp/api/v1/getlatex",
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           data: src.split(",").pop(),
//           inputForm: "Image",
//           clientInfo: { platform: "edge" },
//         }),
//         responseType: "json",
//       }
//     );
//     if (xhr && xhr.status && xhr.status === 200 && !xhr.response.isError) {
//       result = xhr.response.latex
//         ? `$${xhr.response.latex}$`
//         : xhr.response.ocrText;
//       success = true;
//     } else {
//       result =
//         xhr.status === 200 ? xhr.response.errorMessage : `${xhr.status} Error`;
//       success = false;
//     }
//   } else {
//     result = "OCR Engine Not Found";
//     success = false;
//   }
//   if (success) {
//     annotationItem.annotationComment = `${
//       annotationItem.annotationComment
//         ? `${annotationItem.annotationComment}\n`
//         : ""
//     }${result}`;
//     await annotationItem.saveTx();
//     this._Addon.ZoteroViews.showProgressWindow(
//       "Better Notes OCR",
//       `OCR Result: ${result}`
//     );
//   } else {
//     this._Addon.ZoteroViews.showProgressWindow(
//       "Better Notes OCR",
//       result,
//       "fail"
//     );
//   }
// }
