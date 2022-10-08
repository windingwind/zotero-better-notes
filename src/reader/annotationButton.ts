/*
 * This file contains reader annotation pane code.
 */

const CryptoJS = require("crypto-js");
import Knowledge4Zotero from "../addon";
import AddonBase from "../module";
import { EditorMessage } from "../utils";

class ReaderViews extends AddonBase {
  icons: object;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.icons = {
      createNote: `<svg t="1651630304116" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="14011" width="16" height="16"><path d="M791.30324 369.7c-5 5-6.2 12.7-2.8 18.9 17.5 31.9 27.4 68.5 27.4 107.4 0 56.2-20.7 107.6-54.9 147-4.5 5.1-5.1 12.6-1.8 18.4l39.2 67.9c3.3 5.7 9.6 8.7 16.1 7.8 6-0.8 12.1-1.2 18.3-1.2 70.1 0.5 128 59.7 127.1 129.7-0.9 69.7-57.4 125.9-127.1 126.4-70.9 0.5-128.9-57.1-128.9-128 0-38.1 16.7-72.3 43.1-95.8l-37-64c-4.2-7.3-13.3-10-20.9-6.4-29.3 14.2-62.3 22.2-97.2 22.2-26.7 0-52.3-4.7-76-13.2-7.3-2.6-15.4 0.3-19.3 7l-24.9 43.1c-3.1 5.4-2.8 12.1 0.8 17.2 15 21.2 23.7 47.1 23.5 75.1-0.7 69.5-57.5 126.2-127 126.8-71.6 0.6-129.8-57.7-129.1-129.4 0.8-69.7 58-126.5 127.8-126.6 12 0 23.7 1.6 34.8 4.7 7 2 14.5-1.1 18.2-7.4l21.7-37.6c3.7-6.4 2.5-14.6-2.9-19.6-33.6-31.2-57.5-72.6-67-119.2-1.5-7.5-8-12.9-15.7-12.9h-92c-6.9 0-13.1 4.5-15.2 11.1C232.80324 590.2 184.70324 627 128.00324 627 57.00324 627-0.49676 569.2 0.00324 498.1 0.40324 427.5 58.60324 370.3 129.20324 371c54.2 0.5 100.4 34.8 118.5 82.8C250.00324 460 256.00324 464 262.60324 464h94.1c7.6 0 14.2-5.3 15.7-12.7 11-54.2 41.5-101.3 84-133.6 6.4-4.9 8.2-13.8 4.2-20.8l-2.2-3.8c-3.5-6-10.3-9-17.1-7.7-8.8 1.8-18 2.7-27.4 2.5-69.5-1-126.9-60.1-126-129.6 0.9-70.3 58.4-126.9 129-126.3 69.3 0.6 126 57 127 126.2 0.4 31.6-10.6 60.7-29.3 83.2-4.3 5.2-5 12.5-1.6 18.3l6.6 11.4c3.6 6.2 10.8 9.3 17.7 7.5 17.5-4.4 35.8-6.7 54.6-6.7 52.3 0 100.4 17.9 138.6 48 6.4 5 15.5 4.5 21.2-1.2l24.2-24.2c4.7-4.7 6-11.8 3.3-17.8-7.3-16.1-11.3-34-11.3-52.8 0-70.7 57.3-128 128-128 70.6 0 128 57.4 128 128 0 70.7-57.3 128-128 128-20.7 0-40.2-4.9-57.5-13.6-6.2-3.1-13.7-2-18.7 2.9l-28.4 28.5z" p-id="14012" fill="#ffd400"></path></svg>`,
      ocrTex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><defs><style>.cls-1{fill-opacity: 0;}.cls-2{fill:#ffd400;}</style></defs><rect class="cls-1" width="24" height="24"/><path class="cls-2" d="M9,7.1H2.33L2.14,9.56H2.4c.15-1.77.32-2.14,2-2.14a3.39,3.39,0,0,1,.59,0c.23,0,.23.16.23.41v5.77c0,.37,0,.53-1.15.53H3.61v.34c.45,0,1.56,0,2.06,0s1.64,0,2.09,0v-.34H7.32c-1.15,0-1.15-.16-1.15-.53V7.86c0-.22,0-.37.19-.41a3.9,3.9,0,0,1,.63,0c1.65,0,1.81.37,2,2.14h.27L9,7.1Z"/><path class="cls-2" d="M14.91,14.15h-.27c-.28,1.68-.53,2.48-2.41,2.48H10.78c-.52,0-.54-.08-.54-.44V13.27h1c1.06,0,1.19.35,1.19,1.28h.27v-2.9h-.27c0,.94-.13,1.28-1.19,1.28h-1V10.3c0-.36,0-.44.54-.44h1.41c1.68,0,2,.61,2.14,2.13h.27l-.3-2.46H8.14v.33H8.4c.84,0,.86.12.86.52v5.73c0,.4,0,.52-.86.52H8.14V17h6.31Z"/><path class="cls-2" d="M18.22,10.27l1.5-2.2a1.67,1.67,0,0,1,1.58-.71V7H18.69v.33c.44,0,.68.25.68.5a.37.37,0,0,1-.1.26L18,10,16.61,7.85a.46.46,0,0,1-.07-.16c0-.13.24-.32.7-.33V7c-.37,0-1.18,0-1.59,0s-1,0-1.43,0v.33h.21c.6,0,.81.08,1,.38l2,3-1.79,2.64a1.67,1.67,0,0,1-1.58.73v.34H16.7v-.34c-.5,0-.69-.31-.69-.51s0-.14.11-.26l1.55-2.3,1.73,2.62s.06.09.06.12-.24.32-.72.33v.34c.39,0,1.19,0,1.6,0s1,0,1.42,0v-.34h-.2c-.58,0-.81-.06-1-.4l-2.3-3.49Z"/></svg>`,
    };
  }

  async addReaderAnnotationButton(reader: _ZoteroReaderInstance) {
    if (!reader) {
      return false;
    }
    await reader._initPromise;
    let updateCount = 0;
    const _document = reader._iframeWindow.document;
    for (const moreButton of _document.getElementsByClassName("more")) {
      if (moreButton.getAttribute("knowledgeinit") === "true") {
        updateCount += 1;
        continue;
      }
      moreButton.setAttribute("knowledgeinit", "true");
      const createNoteButton = _document.createElement("div");
      createNoteButton.setAttribute("style", "margin: 5px;");
      createNoteButton.title = "Quick Note";
      createNoteButton.innerHTML = this.icons["createNote"];

      let annotationWrapper = moreButton;
      while (!annotationWrapper.getAttribute("data-sidebar-annotation-id")) {
        annotationWrapper = annotationWrapper.parentElement;
      }
      const itemKey = annotationWrapper.getAttribute(
        "data-sidebar-annotation-id"
      );
      const libraryID = (Zotero.Items.get(reader.itemID) as Zotero.Item)
        .libraryID;
      const annotationItem = await Zotero.Items.getByLibraryAndKeyAsync(
        libraryID,
        itemKey
      );

      createNoteButton.addEventListener("click", async (e) => {
        await this.createNoteFromAnnotation(annotationItem);
        e.preventDefault();
      });
      createNoteButton.addEventListener("mouseover", (e: XUL.XULEvent) => {
        createNoteButton.setAttribute(
          "style",
          "background: #F0F0F0; margin: 5px;"
        );
      });
      createNoteButton.addEventListener("mouseout", (e: XUL.XULEvent) => {
        createNoteButton.setAttribute("style", "margin: 5px;");
      });
      moreButton.before(createNoteButton);
      if (annotationItem.annotationType === "image") {
        // Image OCR
        const ocrButton = _document.createElement("div");
        ocrButton.setAttribute("style", "margin: 5px;");
        ocrButton.innerHTML = this.icons["ocrTex"];
        ocrButton.title = "OCR LaTex";
        ocrButton.addEventListener("click", async (e) => {
          await this.OCRImageAnnotation(
            (
              ocrButton.parentElement.parentElement
                .nextSibling as HTMLImageElement
            ).src,
            annotationItem
          );

          e.preventDefault();
        });
        ocrButton.addEventListener("mouseover", (e: XUL.XULEvent) => {
          ocrButton.setAttribute("style", "background: #F0F0F0; margin: 5px;");
        });
        ocrButton.addEventListener("mouseout", (e: XUL.XULEvent) => {
          ocrButton.setAttribute("style", "margin: 5px;");
        });
        moreButton.before(ocrButton);
      }
      updateCount += 1;
    }
    return reader.annotationItemIDs.length === updateCount;
  }

  public async buildReaderAnnotationButtons() {
    Zotero.debug("Knowledge4Zotero: buildReaderAnnotationButton");
    for (const reader of Zotero.Reader._readers) {
      Zotero.debug("reader found");
      let t = 0;
      while (t < 100 && !(await this.addReaderAnnotationButton(reader))) {
        await Zotero.Promise.delay(50);
        t += 1;
      }
    }
  }

  private async createNoteFromAnnotation(annotationItem: Zotero.Item) {
    if (annotationItem.annotationComment) {
      const text = annotationItem.annotationComment;
      let link = this._Addon.NoteParse.parseLinkInText(text);

      if (link) {
        const note = (await this._Addon.NoteUtils.getNoteFromLink(link)).item;
        if (note && note.id) {
          await this._Addon.events.onEditorEvent(
            new EditorMessage("onNoteLink", {
              params: {
                item: note,
                infoText: "OK",
              },
            })
          );
          return;
        }
      }
    }

    const note: Zotero.Item = new Zotero.Item("note");
    note.libraryID = annotationItem.libraryID;
    note.parentID = annotationItem.parentItem.parentID;
    await note.saveTx();

    ZoteroPane.openNoteWindow(note.id);
    let editorInstance: Zotero.EditorInstance =
      this._Addon.WorkspaceWindow.getEditorInstance(note);
    let t = 0;
    // Wait for editor instance
    while (t < 10 && !editorInstance) {
      await Zotero.Promise.delay(500);
      t += 1;
      editorInstance = this._Addon.WorkspaceWindow.getEditorInstance(note);
    }

    const renderredTemplate =
      await this._Addon.TemplateController.renderTemplateAsync(
        "[QuickNoteV3]",
        "annotationItem, topItem, noteItem",
        [annotationItem, annotationItem.parentItem.parentItem, note]
      );
    await this._Addon.NoteUtils.addLineToNote(
      note,
      renderredTemplate,
      0,
      false,
      "before"
    );

    const tags = annotationItem.getTags();
    for (const tag of tags) {
      note.addTag(tag.tag, tag.type);
    }
    await note.saveTx();

    annotationItem.annotationComment = `${
      annotationItem.annotationComment ? annotationItem.annotationComment : ""
    }\nnote link: "${this._Addon.NoteUtils.getNoteLink(note)}"`;
    await annotationItem.saveTx();
  }

  private async OCRImageAnnotation(src: string, annotationItem: Zotero.Item) {
    /*
        message.content = {
          params: { src: string, annotationItem: Zotero.Item }
        }
      */
    let result: string;
    let success: boolean;
    const engine = Zotero.Prefs.get("Knowledge4Zotero.OCREngine");
    if (engine === "mathpix") {
      const xhr = await Zotero.HTTP.request(
        "POST",
        "https://api.mathpix.com/v3/text",
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            app_id: Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appid"),
            app_key: Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appkey"),
          },
          body: JSON.stringify({
            src: src,
            math_inline_delimiters: ["$", "$"],
            math_display_delimiters: ["$$", "$$"],
            rm_spaces: true,
          }),
          responseType: "json",
        }
      );
      console.log(xhr);
      if (xhr && xhr.status && xhr.status === 200 && xhr.response.text) {
        result = xhr.response.text;
        success = true;
      } else {
        result =
          xhr.status === 200 ? xhr.response.error : `${xhr.status} Error`;
        success = false;
      }
    } else if (engine === "xunfei") {
      /**
       * 1.Doc：https://www.xfyun.cn/doc/words/formula-discern/API.html
       * 2.Error code：https://www.xfyun.cn/document/error-code
       * @author iflytek
       */

      const config = {
        hostUrl: "https://rest-api.xfyun.cn/v2/itr",
        host: "rest-api.xfyun.cn",
        appid: Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APPID"),
        apiSecret: Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APISecret"),
        apiKey: Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APIKey"),
        uri: "/v2/itr",
      };

      let date = new Date().toUTCString();
      let postBody = getPostBody();
      let digest = getDigest(postBody);

      const xhr = await Zotero.HTTP.request("POST", config.hostUrl, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json,version=1.0",
          Host: config.host,
          Date: date,
          Digest: digest,
          Authorization: getAuthStr(date, digest),
        },
        body: JSON.stringify(postBody),
        responseType: "json",
      });

      if (xhr?.response?.code === 0) {
        result = xhr.response.data.region
          .filter((r) => r.type === "text")
          .map((r) => r.recog.content)
          .join(" ")
          .replace(/ifly-latex-(begin)?(end)?/g, "$");
        console.log(xhr);
        success = true;
      } else {
        result =
          xhr.status === 200
            ? `${xhr.response.code} ${xhr.response.message}`
            : `${xhr.status} Error`;
        success = false;
      }

      function getPostBody() {
        let digestObj = {
          common: {
            app_id: config.appid,
          },
          business: {
            ent: "teach-photo-print",
            aue: "raw",
          },
          data: {
            image: src.split(",").pop(),
          },
        };
        return digestObj;
      }

      function getDigest(body) {
        return (
          "SHA-256=" +
          CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(JSON.stringify(body)))
        );
      }

      function getAuthStr(date, digest) {
        let signatureOrigin = `host: ${config.host}\ndate: ${date}\nPOST ${config.uri} HTTP/1.1\ndigest: ${digest}`;
        let signatureSha = CryptoJS.HmacSHA256(
          signatureOrigin,
          config.apiSecret
        );
        let signature = CryptoJS.enc.Base64.stringify(signatureSha);
        let authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`;
        return authorizationOrigin;
      }
    } else if (engine === "bing") {
      const xhr = await Zotero.HTTP.request(
        "POST",
        "https://www.bing.com/cameraexp/api/v1/getlatex",
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: src.split(",").pop(),
            inputForm: "Image",
            clientInfo: { platform: "edge" },
          }),
          responseType: "json",
        }
      );
      if (xhr && xhr.status && xhr.status === 200 && !xhr.response.isError) {
        result = xhr.response.latex
          ? `$${xhr.response.latex}$`
          : xhr.response.ocrText;
        success = true;
      } else {
        result =
          xhr.status === 200
            ? xhr.response.errorMessage
            : `${xhr.status} Error`;
        success = false;
      }
    } else {
      result = "OCR Engine Not Found";
      success = false;
    }
    if (success) {
      annotationItem.annotationComment = `${
        annotationItem.annotationComment
          ? `${annotationItem.annotationComment}\n`
          : ""
      }${result}`;
      await annotationItem.saveTx();
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes OCR",
        `OCR Result: ${result}`
      );
    } else {
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes OCR",
        result,
        "fail"
      );
    }
  }
}

export default ReaderViews;
