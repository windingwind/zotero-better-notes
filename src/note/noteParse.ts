/*
 * This file realizes note parse (md, html, rich-text).
 */

import AddonBase from "../module";
import { HTML2Markdown, Markdown2HTML } from "./convertMD";
import TurndownService = require("turndown");
const turndownPluginGfm = require("turndown-plugin-gfm");
import TreeModel = require("tree-model");
const asciidoctor = require("asciidoctor")();
const seedrandom = require("seedrandom");

class NoteParse extends AddonBase {
  private getDOMParser(): DOMParser {
    if (Zotero.platformMajorVersion > 60) {
      return new DOMParser();
    } else {
      return Components.classes[
        "@mozilla.org/xmlextras/domparser;1"
      ].createInstance(Components.interfaces.nsIDOMParser);
    }
  }

  // A seedable version of Zotero.Utilities.randomString
  private randomString(len: number, chars: string, seed: string) {
    if (!chars) {
      chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    }
    if (!len) {
      len = 8;
    }
    let randomstring = "";
    const random: Function = seedrandom(seed);
    for (let i = 0; i < len; i++) {
      const rnum = Math.floor(random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
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
    let containerIndex = html.search(/data-schema-version="8">/g);
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
      let json = await Zotero.Annotations.toJSON(annotationItem);
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

  async parseAnnotationHTML(
    note: Zotero.Item,
    annotations: Zotero.Item[],
    ignoreComment: boolean = false
  ) {
    if (!note) {
      return;
    }
    let annotationJSONList = [];
    for (const annot of annotations) {
      const annotJson = await this._Addon.NoteParse.parseAnnotation(annot);
      if (ignoreComment && annotJson.comment) {
        annotJson.comment = "";
      }
      annotationJSONList.push(annotJson);
    }
    await this._Addon.NoteUtils.importImagesToNote(note, annotationJSONList);
    const html =
      Zotero.EditorInstanceUtilities.serializeAnnotations(
        annotationJSONList
      ).html;
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

    let parser = this.getDOMParser();
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
    let parser = this.getDOMParser();
    let doc = parser.parseFromString(noteText, "text/html");

    let metadataContainer: HTMLElement = doc.querySelector(
      "body > div[data-schema-version]"
    );
    return metadataContainer;
  }

  parseLineText(line: string): string {
    const parser = this.getDOMParser();
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

  parseMDToHTML(str: string): string {
    return Markdown2HTML(str.replace(/\u00A0/gu, " "));
  }

  parseHTMLToMD(str: string): string {
    return HTML2Markdown(str);
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

  // A realization of Markdown Note.js translator
  async parseNoteToMD(
    noteItem: Zotero.Item,
    options: { wrapCitation?: boolean } = {}
  ) {
    const parser = this.getDOMParser();
    const doc = parser.parseFromString(noteItem.getNote() || "", "text/html");
    Components.utils.import("resource://gre/modules/osfile.jsm");
    doc.querySelectorAll("span").forEach(function (span) {
      if (span.style.textDecoration === "line-through") {
        let s = doc.createElement("s");
        s.append(...span.childNodes);
        span.replaceWith(s);
      }
    });

    // Turndown wants pre content inside additional code block
    doc.querySelectorAll("pre").forEach(function (pre) {
      let code = doc.createElement("code");
      code.append(...pre.childNodes);
      pre.append(code);
    });

    // Insert a PDF link for highlight and image annotation nodes
    doc
      .querySelectorAll('span[class="highlight"], img[data-annotation]')
      .forEach((node) => {
        Zotero.debug(node.outerHTML);
        try {
          var annotation = JSON.parse(
            decodeURIComponent(node.getAttribute("data-annotation"))
          );
        } catch (e) {
          Zotero.debug(e);
        }

        if (annotation) {
          // annotation.uri was used before note-editor v4
          let uri = annotation.attachmentURI || annotation.uri;
          let position = annotation.position;
          Zotero.debug("----Debug Link----");
          Zotero.debug(annotation);
          if (typeof uri === "string" && typeof position === "object") {
            Zotero.debug(uri);
            let openURI;
            let uriParts = uri.split("/");
            let libraryType = uriParts[3];
            let key = uriParts[uriParts.length - 1];
            Zotero.debug(key);
            if (libraryType === "users") {
              openURI = "zotero://open-pdf/library/items/" + key;
            }
            // groups
            else {
              let groupID = uriParts[4];
              openURI = "zotero://open-pdf/groups/" + groupID + "/items/" + key;
            }

            openURI +=
              "?page=" +
              (position.pageIndex + 1) +
              (annotation.annotationKey
                ? "&annotation=" + annotation.annotationKey
                : "");

            let a = doc.createElement("a");
            a.href = openURI;
            a.append("pdf");
            let fragment = doc.createDocumentFragment();
            fragment.append(" (", a, ") ");

            if (options.wrapCitation) {
              const citationKey = annotation.annotationKey
                ? annotation.annotationKey
                : this.randomString(
                    8,
                    Zotero.Utilities.allowedKeyChars,
                    Zotero.Utilities.Internal.md5(
                      node.getAttribute("data-annotation")
                    )
                  );
              Zotero.Utilities.Internal.md5(
                node.getAttribute("data-annotation")
              );
              const beforeCitationDecorator = doc.createElement("span");
              beforeCitationDecorator.innerHTML = `&lt;!-- bn::${citationKey} --&gt;`;
              const afterCitationDecorator = doc.createElement("span");
              afterCitationDecorator.innerHTML = `&lt;!-- bn::${citationKey} --&gt;`;
              node.before(beforeCitationDecorator);
              fragment.append(afterCitationDecorator);
            }

            let nextNode = node.nextElementSibling;
            if (nextNode && nextNode.classList.contains("citation")) {
              nextNode.parentNode.insertBefore(fragment, nextNode.nextSibling);
            } else {
              node.parentNode.insertBefore(fragment, node.nextSibling);
            }
          }
        }
      });

    console.log(doc);

    for (const img of doc.querySelectorAll("img[data-attachment-key]")) {
      let imgKey = img.getAttribute("data-attachment-key");

      const attachmentItem = await Zotero.Items.getByLibraryAndKeyAsync(
        noteItem.libraryID,
        imgKey
      );
      Zotero.debug(attachmentItem);

      let oldFile = String(await attachmentItem.getFilePathAsync());
      Zotero.debug(oldFile);
      let ext = oldFile.split(".").pop();
      let newAbsPath = this._Addon.NoteUtils.formatPath(
        `${this._Addon.NoteExport._exportPath}/${imgKey}.${ext}`
      );
      Zotero.debug(newAbsPath);
      let newFile = oldFile;
      try {
        // Don't overwrite
        if (await OS.File.exists(newAbsPath)) {
          newFile = newAbsPath.replace(/\\/g, "/");
        } else {
          newFile = Zotero.File.copyToUnique(oldFile, newAbsPath).path;
          newFile = newFile.replace(/\\/g, "/");
        }
        newFile = `attachments/${newFile.split(/\//).pop()}`;
      } catch (e) {
        Zotero.debug(e);
      }
      Zotero.debug(newFile);

      img.setAttribute("src", newFile ? newFile : oldFile);
      img.setAttribute("alt", "image");
    }

    // Transform citations to links
    doc.querySelectorAll('span[class="citation"]').forEach(function (span) {
      try {
        var citation = JSON.parse(
          decodeURIComponent(span.getAttribute("data-citation"))
        );
      } catch (e) {}

      if (citation && citation.citationItems && citation.citationItems.length) {
        let uris = [];
        for (let citationItem of citation.citationItems) {
          let uri = citationItem.uris[0];
          if (typeof uri === "string") {
            let uriParts = uri.split("/");
            let libraryType = uriParts[3];
            let key = uriParts[uriParts.length - 1];
            Zotero.debug(key);
            if (libraryType === "users") {
              uris.push("zotero://select/library/items/" + key);
            }
            // groups
            else {
              let groupID = uriParts[4];
              uris.push("zotero://select/groups/" + groupID + "/items/" + key);
            }
          }
        }

        let items = Array.from(span.querySelectorAll(".citation-item")).map(
          (x) => x.textContent
        );
        // Fallback to pre v5 note-editor schema that was serializing citations as plain text i.e.:
        // <span class="citation" data-citation="...">(Jang et al., 2005, p. 14; Kongsgaard et al., 2009, p. 790)</span>
        if (!items.length) {
          items = span.textContent.slice(1, -1).split("; ");
        }

        span.innerHTML =
          "(" +
          items
            .map((item, i) => {
              return `<a href="${uris[i]}">${item}</a>`;
            })
            .join("; ") +
          ")";
      }
    });
    // Overwrite escapes
    const escapes: [RegExp, string][] = [
      // [/\\/g, '\\\\'],
      // [/\*/g, '\\*'],
      // [/^-/g, "\\-"],
      [/^\+ /g, "\\+ "],
      [/^(=+)/g, "\\$1"],
      [/^(#{1,6}) /g, "\\$1 "],
      [/`/g, "\\`"],
      [/^~~~/g, "\\~~~"],
      // [/^>/g, "\\>"],
      // [/_/g, "\\_"],
      [/^(\d+)\. /g, "$1\\. "],
    ];
    if (Zotero.Prefs.get("Knowledge4Zotero.convertSquare")) {
      escapes.push([/\[/g, "\\["]);
      escapes.push([/\]/g, "\\]"]);
    }
    TurndownService.prototype.escape = function (string) {
      return escapes.reduce(function (accumulator, escape) {
        return accumulator.replace(escape[0], escape[1]);
      }, string);
    };
    // Initialize Turndown Service
    let turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      emDelimiter: "*",
      codeBlockStyle: "fenced",
    });
    turndownService.use(turndownPluginGfm.gfm);
    // Add math block rule
    turndownService.addRule("mathBlock", {
      filter: function (node) {
        return node.nodeName === "PRE" && node.className === "math";
      },

      replacement: function (content, node, options) {
        return (
          "\n\n$$\n" + node.firstChild.textContent.slice(2, -2) + "\n$$\n\n"
        );
      },
    });
    turndownService.addRule("inlineLinkCustom", {
      filter: function (node, options) {
        return (
          options.linkStyle === "inlined" &&
          node.nodeName === "A" &&
          node.getAttribute("href").length > 0
        );
      },

      replacement: (content, node: HTMLElement, options) => {
        var href = node.getAttribute("href");
        const cleanAttribute = (attribute) =>
          attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
        var title = cleanAttribute(node.getAttribute("title"));
        if (title) title = ' "' + title + '"';
        if (href.search(/zotero:\/\/note\/\w+\/\w+\//g) !== -1) {
          // A note link should be converted if it is in the _exportFileDict
          const noteInfo = this._Addon.NoteExport._exportFileInfo.find((i) =>
            href.includes(i.link)
          );
          if (noteInfo) {
            href = `./${noteInfo.filename}`;
          }
        }
        return "[" + content + "](" + href + title + ")";
      },
    });

    if (Zotero.Prefs.get("Knowledge4Zotero.exportHighlight")) {
      turndownService.addRule("backgroundColor", {
        filter: function (node, options) {
          return node.nodeName === "SPAN" && node.style["background-color"];
        },

        replacement: function (content, node) {
          return `<span style="background-color: ${
            (node as HTMLElement).style["background-color"]
          }">${content}</span>`;
        },
      });
    }

    const parsedMD = turndownService.turndown(doc.body);
    console.log(parsedMD);
    return parsedMD;
  }
}

export default NoteParse;
