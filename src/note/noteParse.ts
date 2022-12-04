/*
 * This file realizes note parse (md, html, rich-text).
 */

import TreeModel = require("tree-model");
const asciidoctor = require("asciidoctor")();
import YAML = require("yamljs");
import AddonBase from "../module";
import Knowledge4Zotero from "../addon";
import { getDOMParser } from "../utils";
import { NodeMode } from "../sync/syncUtils";

class NoteParse extends AddonBase {
  tools: any;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  public parseNoteTree(
    note: Zotero.Item,
    parseLink: boolean = true
  ): TreeModel.Node<object> {
    const noteLines = this._Addon.NoteUtils.getLinesInNote(note);
    let tree = new TreeModel();
    let root = tree.parse({
      id: -1,
      rank: 0,
      lineIndex: -1,
      endIndex: -1,
    });
    let id = 0;
    let lastNode = root;
    let headerStartReg = new RegExp("<h[1-6]");
    let headerStopReg = new RegExp("</h[1-6]>");
    for (let i in noteLines) {
      let currentRank = 7;
      let lineElement = noteLines[i];
      const isHeading = lineElement.search(headerStartReg) !== -1;
      const isLink =
        parseLink && lineElement.search(/zotero:\/\/note\//g) !== -1;
      if (isHeading || isLink) {
        let name = "";
        let link = "";
        if (isHeading) {
          const startIndex = lineElement.search(headerStartReg);
          currentRank = parseInt(
            lineElement.slice(startIndex + 2, startIndex + 3)
          );
        } else {
          link = lineElement.slice(lineElement.search(/href="/g) + 6);
          link = link.slice(0, link.search(/"/g));
        }
        name = this._Addon.NoteParse.parseLineText(lineElement);

        // Find parent node
        let parentNode = lastNode;
        while (parentNode.model.rank >= currentRank) {
          parentNode = parentNode.parent;
        }

        const currentNode = tree.parse({
          id: id++,
          rank: currentRank,
          name: name,
          lineIndex: parseInt(i),
          endIndex: noteLines.length - 1,
          link: link,
        });
        parentNode.addChild(currentNode);
        const currentIndex = parentNode.children.indexOf(currentNode);
        if (currentIndex > 0) {
          const previousNode = parentNode.children[currentIndex - 1];
          // Traverse the previous node tree and set the end index
          previousNode.walk((node) => {
            if (node.model.endIndex > parseInt(i) - 1) {
              node.model.endIndex = parseInt(i) - 1;
            }
            return true;
          });
          previousNode.model.endIndex = parseInt(i) - 1;
        }
        lastNode = currentNode;
      }
    }
    return root;
  }
  public parseHTMLLines(html: string): string[] {
    let containerIndex = html.search(/data-schema-version="[0-9]*">/g);
    if (containerIndex != -1) {
      html = html.substring(
        containerIndex + 'data-schema-version="8">'.length,
        html.length - "</div>".length
      );
    }
    let noteLines = html.split("\n").filter((e) => e);

    // A cache for temporarily stored lines
    let previousLineCache = [];
    let nextLineCache = [];

    const forceInline = ["table", "blockquote", "pre"];
    const selfInline = ["ol", "ul", "li"];
    let forceInlineStack = [];
    let forceInlineFlag = false;
    let selfInlineFlag = false;

    const parsedLines = [];
    for (let line of noteLines) {
      // restore self inline flag
      selfInlineFlag = false;

      // For force inline tags, set flag to append lines to current line
      for (const tag of forceInline) {
        const startReg = `<${tag}`;
        const isStart = line.includes(startReg);
        const endReg = `</${tag}>`;
        const isEnd = line.includes(endReg);
        if (isStart && !isEnd) {
          forceInlineStack.push(tag);
          forceInlineFlag = true;
          break;
        }
        if (isEnd) {
          forceInlineStack.pop();
          // Exit force inline mode if the stack is empty
          if (forceInlineStack.length === 0) {
            forceInlineFlag = false;
          }
          break;
        }
      }

      if (forceInlineFlag) {
        nextLineCache.push(line);
      } else {
        // For self inline tags, cache start as previous line and end as next line
        for (const tag of selfInline) {
          const isStart = line.includes(`<${tag}`);
          const isEnd = line.includes(`</${tag}>`);
          if (isStart && !isEnd) {
            selfInlineFlag = true;
            nextLineCache.push(line);
            break;
          }
          if (!isStart && isEnd) {
            selfInlineFlag = true;
            previousLineCache.push(line);
            break;
          }
        }

        if (!selfInlineFlag) {
          // Append cache to previous line
          if (previousLineCache.length) {
            parsedLines[parsedLines.length - 1] += `\n${previousLineCache.join(
              "\n"
            )}`;
            previousLineCache = [];
          }
          let nextLine = "";
          // Append cache to next line
          if (nextLineCache.length) {
            nextLine = nextLineCache.join("\n");
            nextLineCache = [];
          }
          if (nextLine) {
            nextLine += "\n";
          }
          nextLine += `${line}`;
          parsedLines.push(nextLine);
        }
      }
    }
    return parsedLines;
  }

  parseHTMLElements(doc: HTMLElement): Element[] {
    let currentLineIndex = 0;
    let currentElement: Element;
    let elements: Element[] = [];

    const diveTagNames = ["OL", "UL", "LI"];
    for (const e of doc.children) {
      if (diveTagNames.includes(e.tagName)) {
        const innerLines = this.parseListElements(e as HTMLElement);
        currentLineIndex += innerLines.length;
        currentElement = innerLines[innerLines.length - 1];
        elements = elements.concat(innerLines);
      } else {
        currentLineIndex += 1;
        currentElement = e;
        elements.push(e);
      }
    }
    return elements;
  }

  parseHTMLLineElement(doc: HTMLElement, lineIndex: number): HTMLElement {
    let currentLineIndex = 0;
    let currentElement: HTMLElement;

    const diveTagNames = ["OL", "UL", "LI"];
    for (const e of doc.children) {
      if (currentLineIndex > lineIndex) {
        break;
      }
      if (diveTagNames.includes(e.tagName)) {
        const innerLines = this.parseListElements(e as HTMLElement);
        if (currentLineIndex + innerLines.length > lineIndex) {
          // The target line is inside the line list
          for (const _e of innerLines) {
            if (currentLineIndex <= lineIndex) {
              currentLineIndex += 1;
              currentElement = _e;
              // console.log(currentLineIndex, _e);
            }
          }
        } else {
          currentLineIndex += innerLines.length;
          currentElement = innerLines[innerLines.length - 1];
        }
      } else {
        currentLineIndex += 1;
        currentElement = e as HTMLElement;
        // console.log(currentLineIndex, e);
      }
    }
    console.log(currentLineIndex);
    return currentElement;
  }

  async parseAnnotation(annotationItem: Zotero.Item) {
    try {
      if (!annotationItem || !annotationItem.isAnnotation()) {
        return null;
      }
      let json: AnnotationJson = await Zotero.Annotations.toJSON(
        annotationItem
      );
      json.id = annotationItem.key;
      json.attachmentItemID = annotationItem.parentItem.id;
      delete json.key;
      for (let key in json) {
        json[key] = json[key] || "";
      }
      json.tags = json.tags || [];
      return json;
    } catch (e) {
      Zotero.logError(e);
      return null;
    }
  }

  // Zotero.EditorInstanceUtilities.serializeAnnotations
  serializeAnnotations(
    annotations: AnnotationJson[],
    skipEmbeddingItemData: boolean = false,
    skipCitation: boolean = false
  ) {
    let storedCitationItems = [];
    let html = "";
    for (let annotation of annotations) {
      let attachmentItem = Zotero.Items.get(annotation.attachmentItemID);
      if (!attachmentItem) {
        continue;
      }

      if (
        (!annotation.text &&
          !annotation.comment &&
          !annotation.imageAttachmentKey) ||
        annotation.type === "ink"
      ) {
        continue;
      }

      let citationHTML = "";
      let imageHTML = "";
      let highlightHTML = "";
      let quotedHighlightHTML = "";
      let commentHTML = "";

      let storedAnnotation: any = {
        attachmentURI: Zotero.URI.getItemURI(attachmentItem),
        annotationKey: annotation.id,
        color: annotation.color,
        pageLabel: annotation.pageLabel,
        position: annotation.position,
      };

      // Citation
      let parentItem = skipCitation
        ? undefined
        : attachmentItem.parentID && Zotero.Items.get(attachmentItem.parentID);
      if (parentItem) {
        let uris = [Zotero.URI.getItemURI(parentItem)];
        let citationItem: any = {
          uris,
          locator: annotation.pageLabel,
        };

        // Note: integration.js` uses `Zotero.Cite.System.prototype.retrieveItem`,
        // which produces a little bit different CSL JSON
        let itemData = Zotero.Utilities.Item.itemToCSLJSON(parentItem);
        if (!skipEmbeddingItemData) {
          citationItem.itemData = itemData;
        }

        let item = storedCitationItems.find((item) =>
          item.uris.some((uri) => uris.includes(uri))
        );
        if (!item) {
          storedCitationItems.push({ uris, itemData });
        }

        storedAnnotation.citationItem = citationItem;
        let citation = {
          citationItems: [citationItem],
          properties: {},
        };

        let citationWithData = JSON.parse(JSON.stringify(citation));
        citationWithData.citationItems[0].itemData = itemData;
        let formatted =
          Zotero.EditorInstanceUtilities.formatCitation(citationWithData);
        citationHTML = `<span class="citation" data-citation="${encodeURIComponent(
          JSON.stringify(citation)
        )}">${formatted}</span>`;
      }

      // Image
      if (annotation.imageAttachmentKey) {
        // // let imageAttachmentKey = await this._importImage(annotation.image);
        // delete annotation.image;

        // Normalize image dimensions to 1.25 of the print size
        let rect = annotation.position.rects[0];
        let rectWidth = rect[2] - rect[0];
        let rectHeight = rect[3] - rect[1];
        // Constants from pdf.js
        const CSS_UNITS = 96.0 / 72.0;
        const PDFJS_DEFAULT_SCALE = 1.25;
        let width = Math.round(rectWidth * CSS_UNITS * PDFJS_DEFAULT_SCALE);
        let height = Math.round((rectHeight * width) / rectWidth);
        imageHTML = `<img data-attachment-key="${
          annotation.imageAttachmentKey
        }" width="${width}" height="${height}" data-annotation="${encodeURIComponent(
          JSON.stringify(storedAnnotation)
        )}"/>`;
      }

      // Text
      if (annotation.text) {
        let text = Zotero.EditorInstanceUtilities._transformTextToHTML.call(
          Zotero.EditorInstanceUtilities,
          annotation.text.trim()
        );
        highlightHTML = `<span class="highlight" data-annotation="${encodeURIComponent(
          JSON.stringify(storedAnnotation)
        )}">${text}</span>`;
        quotedHighlightHTML = `<span class="highlight" data-annotation="${encodeURIComponent(
          JSON.stringify(storedAnnotation)
        )}">${Zotero.getString(
          "punctuation.openingQMark"
        )}${text}${Zotero.getString("punctuation.closingQMark")}</span>`;
      }

      // Note
      if (annotation.comment) {
        commentHTML = Zotero.EditorInstanceUtilities._transformTextToHTML.call(
          Zotero.EditorInstanceUtilities,
          annotation.comment.trim()
        );
      }

      let template;
      if (annotation.type === "highlight") {
        template = Zotero.Prefs.get("annotations.noteTemplates.highlight");
      } else if (annotation.type === "note") {
        template = Zotero.Prefs.get("annotations.noteTemplates.note");
      } else if (annotation.type === "image") {
        template = "<p>{{image}}<br/>{{citation}} {{comment}}</p>";
      }

      Zotero.debug("Using note template:");
      Zotero.debug(template);

      template = template.replace(
        /(<blockquote>[^<>]*?)({{highlight}})([\s\S]*?<\/blockquote>)/g,
        (match, p1, p2, p3) => p1 + "{{highlight quotes='false'}}" + p3
      );

      let vars = {
        color: annotation.color || "",
        // Include quotation marks by default, but allow to disable with `quotes='false'`
        highlight: (attrs) =>
          attrs.quotes === "false" ? highlightHTML : quotedHighlightHTML,
        comment: commentHTML,
        citation: citationHTML,
        image: imageHTML,
        tags: (attrs) =>
          (
            (annotation.tags && annotation.tags.map((tag) => tag.name)) ||
            []
          ).join(attrs.join || " "),
      };

      let templateHTML = Zotero.Utilities.Internal.generateHTMLFromTemplate(
        template,
        vars
      );
      // Remove some spaces at the end of paragraph
      templateHTML = templateHTML.replace(/([\s]*)(<\/p)/g, "$2");
      // Remove multiple spaces
      templateHTML = templateHTML.replace(/\s\s+/g, " ");
      html += templateHTML;
    }
    return { html, citationItems: storedCitationItems };
  }

  async parseAnnotationHTML(
    note: Zotero.Item, // If you are sure there are no image annotations, note is not required.
    annotations: Zotero.Item[],
    ignoreComment: boolean = false,
    skipCitation: boolean = false
  ) {
    let annotationJSONList: AnnotationJson[] = [];
    for (const annot of annotations) {
      const annotJson = await this._Addon.NoteParse.parseAnnotation(annot);
      if (ignoreComment && annotJson.comment) {
        annotJson.comment = "";
      }
      annotationJSONList.push(annotJson);
    }
    await this._Addon.NoteUtils.importImagesToNote(note, annotationJSONList);
    const html = this.serializeAnnotations(
      annotationJSONList,
      false,
      skipCitation
    ).html;
    return html;
  }

  async parseCitationHTML(citationIds: number[]) {
    let html = "";
    let items = await Zotero.Items.getAsync(citationIds);
    for (let item of items) {
      if (
        item.isNote() &&
        !(await Zotero.Notes.ensureEmbeddedImagesAreAvailable(item)) &&
        !Zotero.Notes.promptToIgnoreMissingImage()
      ) {
        return null;
      }
    }

    for (let item of items) {
      if (item.isRegularItem()) {
        let itemData = Zotero.Utilities.Item.itemToCSLJSON(item);
        let citation = {
          citationItems: [
            {
              uris: [Zotero.URI.getItemURI(item)],
              itemData,
            },
          ],
          properties: {},
        };
        let formatted = Zotero.EditorInstanceUtilities.formatCitation(citation);
        html += `<p><span class="citation" data-citation="${encodeURIComponent(
          JSON.stringify(citation)
        )}">${formatted}</span></p>`;
      }
    }
    return html;
  }

  async parseNoteStyleHTML(item: Zotero.Item, lineCount: number = 5) {
    if (!item.isNote()) {
      throw new Error("Item is not a note");
    }
    let note = `<div data-schema-version="8">${this.parseHTMLLines(
      item.getNote()
    )
      .slice(0, lineCount)
      .join("\n")}</div>`;
    console.log(this.parseHTMLLines(item.getNote()).slice(0, lineCount));

    let parser = getDOMParser();
    let doc = parser.parseFromString(note, "text/html");

    // Make sure this is the new note
    let metadataContainer = doc.querySelector(
      "body > div[data-schema-version]"
    );
    if (metadataContainer) {
      // Load base64 image data into src
      let nodes = doc.querySelectorAll(
        "img[data-attachment-key]"
      ) as NodeListOf<HTMLElement>;
      for (let node of nodes) {
        node.remove();
      }

      nodes = doc.querySelectorAll("span[style]") as NodeListOf<HTMLElement>;
      for (let node of nodes) {
        // Browser converts #RRGGBBAA hex color to rgba function, and we convert it to rgb function,
        // because word processors don't understand colors with alpha channel
        if (
          node.style.backgroundColor &&
          node.style.backgroundColor.startsWith("rgba")
        ) {
          node.style.backgroundColor =
            node.style.backgroundColor
              .replace("rgba", "rgb")
              .split(",")
              .slice(0, 3)
              .join(",") + ")";
        }
      }
    }
    return doc.body.innerHTML;
  }

  parseLinkInText(text: string): string {
    // Must end with "
    const linkIndex = text.search(/zotero:\/\/note\//g);
    if (linkIndex === -1) {
      return "";
    }
    let link = text.substring(linkIndex);
    link = link.substring(0, link.search('"'));
    return link;
  }

  parseLinkIndexInText(text: string): [number, number] {
    // Must end with "
    const linkIndex = text.search(/zotero:\/\/note\//g);
    if (linkIndex === -1) {
      return [-1, -1];
    }
    let link = text.substring(linkIndex);
    return [linkIndex, linkIndex + link.search('"')];
  }

  parseParamsFromLink(uri: string) {
    uri = uri.split("//").pop();
    const extraParams = {};
    uri
      .split("?")
      .pop()
      .split("&")
      .forEach((p) => {
        extraParams[p.split("=")[0]] = p.split("=")[1];
      });
    uri = uri.split("?")[0];
    let params: any = {
      libraryID: "",
      noteKey: 0,
    };
    Object.assign(params, extraParams);
    const router = new Zotero.Router(params);
    router.add("note/:libraryID/:noteKey", function () {
      if (params.libraryID === "u") {
        params.libraryID = Zotero.Libraries.userLibraryID;
      } else {
        params.libraryID = Zotero.Groups.getLibraryIDFromGroupID(
          params.libraryID
        );
      }
    });
    router.run(uri);
    return params;
  }

  parseListElements(
    e: HTMLElement,
    eleList: HTMLElement[] = undefined,
    tags: string[] = ["OL", "UL", "LI"]
  ) {
    if (!eleList) {
      eleList = [];
    }
    for (let _e of e.children) {
      if (tags.includes(_e.tagName)) {
        this.parseListElements(_e as HTMLElement, eleList);
      } else {
        eleList.push(e);
      }
    }
    return eleList;
  }

  parseNoteHTML(note: Zotero.Item): HTMLElement {
    if (!note) {
      return undefined;
    }
    let noteText = note.getNote();
    if (noteText.search(/data-schema-version/g) === -1) {
      noteText = `<div data-schema-version="8">${noteText}\n</div>`;
    }
    let parser = getDOMParser();
    let doc = parser.parseFromString(noteText, "text/html");

    let metadataContainer: HTMLElement = doc.querySelector(
      "body > div[data-schema-version]"
    );
    return metadataContainer;
  }

  parseLineText(line: string): string {
    const parser = getDOMParser();
    try {
      if (line.search(/data-schema-version/g) === -1) {
        line = `<div data-schema-version="8">${line}</div>`;
      }
      return (
        parser
          .parseFromString(line, "text/html")
          .querySelector("body > div[data-schema-version]") as HTMLElement
      ).innerText.trim();
    } catch (e) {
      return "";
    }
  }

  async parseMDToHTML(str: string): Promise<string> {
    return await this._Addon.SyncUtils.md2note(str.replace(/\u00A0/gu, " "));
  }

  async parseHTMLToMD(str: string): Promise<string> {
    return await this._Addon.SyncUtils.note2md(str);
  }

  parseAsciiDocToHTML(str: string): string {
    return asciidoctor.convert(str);
  }

  parseNoteToFreemind(
    noteItem: Zotero.Item,
    options: { withContent?: boolean } = { withContent: true }
  ) {
    const root = this.parseNoteTree(noteItem, false);
    const textNodeForEach = (e: Node, callbackfn: Function) => {
      if (e.nodeType === document.TEXT_NODE) {
        callbackfn(e);
        return;
      }
      e.childNodes.forEach((_e) => textNodeForEach(_e, callbackfn));
    };
    const html2Escape = (sHtml: string) => {
      return sHtml.replace(/[<>&"]/g, function (c) {
        return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
      });
    };
    let lines = [];
    if (options.withContent) {
      const instance = this._Addon.WorkspaceWindow.getEditorInstance(noteItem);
      const editorCopy = this._Addon.EditorViews.getEditorElement(
        instance._iframeWindow.document
      ).cloneNode(true) as HTMLElement;
      textNodeForEach(editorCopy, (e: Text) => {
        e.data = html2Escape(e.data);
      });
      lines = this.parseHTMLElements(editorCopy as HTMLElement);
    }
    const convertClosingTags = (htmlStr: string) => {
      const regConfs = [
        {
          reg: /<br[^>]*?>/g,
          cbk: (str) => "<br></br>",
        },
        {
          reg: /<img[^>]*?>/g,
          cbk: (str: string) => {
            return `<img ${str.match(/src="[^"]+"/g)}></img>`;
          },
        },
      ];
      for (const regConf of regConfs) {
        htmlStr = htmlStr.replace(regConf.reg, regConf.cbk);
      }
      return htmlStr;
    };
    const convertNode = (node: TreeModel.Node<object>) => {
      mmXML += `<node ID="${node.model.id}" TEXT="${html2Escape(
        node.model.name || noteItem.getNoteTitle()
      )}"><hook NAME="AlwaysUnfoldedNode" />`;
      if (
        options.withContent &&
        node.model.lineIndex >= 0 &&
        node.model.endIndex >= 0
      ) {
        mmXML += `<richcontent TYPE="NOTE" CONTENT-TYPE="xml/"><html><head></head><body>${convertClosingTags(
          lines
            .slice(
              node.model.lineIndex,
              node.hasChildren()
                ? node.children[0].model.lineIndex
                : node.model.endIndex + 1
            )
            .map((e) => e.outerHTML)
            .join("\n")
        )}</body></html></richcontent>`;
      }
      if (node.hasChildren()) {
        node.children.forEach((child: TreeModel.Node<object>) => {
          convertNode(child);
        });
      }
      mmXML += "</node>";
    };
    let mmXML = '<map version="freeplane 1.9.0">';
    convertNode(root);
    mmXML += "</map>";
    console.log(mmXML);
    return mmXML;
  }

  async parseNoteToMD(
    noteItem: Zotero.Item,
    options: {
      withMeta?: boolean;
      skipSavingImages?: boolean;
      backend?: "turndown" | "unified";
    } = {}
  ) {
    const noteStatus = this._Addon.SyncUtils.getNoteStatus(noteItem);
    const rehype = this._Addon.SyncUtils.note2rehype(noteStatus.content);
    console.log(rehype);
    this._Addon.SyncUtils.processN2MRehypeHighlightNodes(
      this._Addon.SyncUtils.getN2MRehypeHighlightNodes(rehype),
      NodeMode.direct
    );
    this._Addon.SyncUtils.processN2MRehypeCitationNodes(
      this._Addon.SyncUtils.getN2MRehypeCitationNodes(rehype),
      NodeMode.direct
    );
    this._Addon.SyncUtils.processN2MRehypeNoteLinkNodes(
      this._Addon.SyncUtils.getN2MRehypeNoteLinkNodes(rehype),
      this._Addon.NoteExport._exportFileInfo,
      NodeMode.direct
    );
    await this._Addon.SyncUtils.processN2MRehypeImageNodes(
      this._Addon.SyncUtils.getN2MRehypeImageNodes(rehype),
      noteItem.libraryID,
      this._Addon.NoteExport._exportPath,
      options.skipSavingImages,
      true,
      NodeMode.direct
    );
    console.log("rehype", rehype);
    const remark = await this._Addon.SyncUtils.rehype2remark(rehype);
    console.log("remark", remark);
    let md = this._Addon.SyncUtils.remark2md(remark);

    if (options.withMeta) {
      let yamlFrontMatter = `---\n${YAML.stringify(
        {
          version: noteItem._version,
          // "data-citation-items": JSON.parse(
          //   decodeURIComponent(
          //     doc
          //       .querySelector("div[data-citation-items]")
          //       .getAttribute("data-citation-items")
          //   )
          // ),
        },
        10
      )}\n---`;
      md = `${yamlFrontMatter}\n${md}`;
    }
    console.log(md);
    return md;
  }

  async parseMDToNote(
    mdStatus: MDStatus,
    noteItem: Zotero.Item,
    isImport: boolean = false
  ) {
    // let editorInstance =
    //   this._Addon.WorkspaceWindow.getEditorInstance(noteItem);
    // if (!editorInstance) {
    //   ZoteroPane.openNoteWindow(noteItem.id);
    //   editorInstance = this._Addon.WorkspaceWindow.getEditorInstance(noteItem);
    //   let t = 0;
    //   // Wait for editor instance
    //   while (t < 10 && !editorInstance) {
    //     await Zotero.Promise.delay(500);
    //     t += 1;
    //     editorInstance =
    //       this._Addon.WorkspaceWindow.getEditorInstance(noteItem);
    //   }
    // }
    // if (!editorInstance) {
    //   Zotero.debug("BN:Import: failed to open note.");
    //   return;
    // }
    console.log("md", mdStatus);
    const remark = this._Addon.SyncUtils.md2remark(mdStatus.content);
    console.log("remark", remark);
    const _rehype = await this._Addon.SyncUtils.remark2rehype(remark);
    console.log("_rehype", _rehype);
    const _note = this._Addon.SyncUtils.rehype2note(_rehype);
    console.log("_note", _note);
    const rehype = this._Addon.SyncUtils.note2rehype(_note);
    console.log("rehype", rehype);
    // Import highlight to note meta
    // Annotations don't need to be processed.
    // Image annotations are imported with normal images.
    // const annotationNodes = getM2NRehypeAnnotationNodes(mdRehype);
    // for (const node of annotationNodes) {
    //   try {
    //     // {
    //     //   "attachmentURI": "http://zotero.org/users/uid/items/itemkey",
    //     //   "annotationKey": "4FLVQRDG",
    //     //   "color": "#5fb236",
    //     //   "pageLabel": "2503",
    //     //   "position": {
    //     //     "pageIndex": 0,
    //     //     "rects": [
    //     //       [
    //     //         101.716,
    //     //         298.162,
    //     //         135.469,
    //     //         307.069
    //     //       ]
    //     //     ]
    //     //   },
    //     //   "citationItem": {
    //     //     "uris": [
    //     //       "http://zotero.org/users/uid/items/itemkey"
    //     //     ],
    //     //     "locator": "2503"
    //     //   }
    //     // }
    //     const dataAnnotation = JSON.parse(
    //       decodeURIComponent(node.properties.dataAnnotation)
    //     );
    //     const id = dataAnnotation.citationItems.map((c) =>
    //       Zotero.URI.getURIItemID(dataAnnotation.attachmentURI)
    //     );
    //     const html = await this.parseAnnotationHTML(noteItem, []);
    //     const newNode = note2rehype(html);
    //     // root -> p -> span(cite, this is what we actually want)
    //     replace(node, (newNode.children[0] as any).children[0]);
    //   } catch (e) {
    //     Zotero.debug(e);
    //     console.log(e);
    //     continue;
    //   }
    // }
    // Check if image already belongs to note

    this._Addon.SyncUtils.processM2NRehypeHighlightNodes(
      this._Addon.SyncUtils.getM2NRehypeHighlightNodes(rehype)
    );
    await this._Addon.SyncUtils.processM2NRehypeCitationNodes(
      this._Addon.SyncUtils.getM2NRehypeCitationNodes(rehype),
      isImport
    );
    this._Addon.SyncUtils.processM2NRehypeNoteLinkNodes(
      this._Addon.SyncUtils.getM2NRehypeNoteLinkNodes(rehype)
    );
    await this._Addon.SyncUtils.processM2NRehypeImageNodes(
      this._Addon.SyncUtils.getM2NRehypeImageNodes(rehype),
      noteItem,
      mdStatus.filedir,
      isImport
    );
    console.log(rehype);
    const noteContent = this._Addon.SyncUtils.rehype2note(rehype);
    return noteContent;
  }

  async parseNoteForDiff(noteItem: Zotero.Item) {
    const noteStatus = this._Addon.SyncUtils.getNoteStatus(noteItem);
    const rehype = this._Addon.SyncUtils.note2rehype(noteStatus.content);
    await this._Addon.SyncUtils.processM2NRehypeCitationNodes(
      this._Addon.SyncUtils.getM2NRehypeCitationNodes(rehype),
      true
    );
    // Prse content like ciations
    return this._Addon.SyncUtils.rehype2note(rehype);
  }
}

export default NoteParse;
