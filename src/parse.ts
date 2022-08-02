import { AddonBase } from "./base";
import { HTML2Markdown, Markdown2HTML } from "./convertMD";
const TreeModel = require("./treemodel");

class AddonParse extends AddonBase {
  public parseNoteTree(note: ZoteroItem): TreeModel.Node<object> {
    const noteLines = this._Addon.knowledge.getLinesInNote(note);
    let tree = new TreeModel();
    /*
    tree-model/index.js: line 40
    TreeModel.prototype.parse = function (model) {
    var i, childCount, node;
    Annotate the line 40 of:

    // if (!(model instanceof Object)) {
    //   throw new TypeError('Model must be of type object.');
    // }
    */
    let root = tree.parse({
      id: -1,
      rank: 0,
      lineIndex: -1,
      endIndex: -1,
    });
    let id = 0;
    let lastNode = root;
    let headerStartReg = new RegExp("<h[1-6]>");
    let headerStopReg = new RegExp("</h[1-6]>");
    for (let i in noteLines) {
      let currentRank = 7;
      let lineElement = noteLines[i];
      const isHeading = lineElement.search(headerStartReg) !== -1;
      const isLink = lineElement.search(/zotero:\/\/note\//g) !== -1;
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
        name = this._Addon.parse.parseLineText(lineElement);

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

      // For self inline tags, cache start as previous line and end as next line
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

      if (!selfInlineFlag && !forceInlineFlag) {
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
      } else if (forceInlineFlag) {
        nextLineCache.push(line);
      }
    }
    return parsedLines;
  }

  parseHTMLLineElement(doc: HTMLElement, lineIndex: number): Element {
    let currentLineIndex = 0;
    let currentElement: Element;

    const diveTagNames = ["OL", "UL", "LI"];
    for (const e of doc.children) {
      if (currentLineIndex > lineIndex) {
        break;
      }
      if (diveTagNames.includes(e.tagName)) {
        const innerLines = this.parseListElements(e);
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
        currentElement = e;
        // console.log(currentLineIndex, e);
      }
    }
    console.log(currentLineIndex);
    return currentElement;
  }

  async parseAnnotation(annotationItem: ZoteroItem) {
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

  async parseAnnotationHTML(note: ZoteroItem, annotations: ZoteroItem[]) {
    if (!note) {
      return;
    }
    let annotationJSONList = [];
    for (const annot of annotations) {
      const annotJson = await this._Addon.parse.parseAnnotation(annot);
      annotationJSONList.push(annotJson);
    }
    await this._Addon.knowledge.importImagesToNote(note, annotationJSONList);
    const html =
      Zotero.EditorInstanceUtilities.serializeAnnotations(
        annotationJSONList
      ).html;
    return html;
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
    e: Element,
    eleList: Element[] = undefined,
    tags: string[] = ["OL", "UL", "LI"]
  ) {
    if (!eleList) {
      eleList = [];
    }
    for (let _e of e.children) {
      if (tags.includes(_e.tagName)) {
        this.parseListElements(_e, eleList);
      } else {
        eleList.push(e);
      }
    }
    return eleList;
  }

  parseNoteHTML(note: ZoteroItem): Element {
    note = note || this._Addon.knowledge.getWorkspaceNote();
    if (!note) {
      return undefined;
    }
    let noteText = note.getNote();
    if (noteText.search(/data-schema-version/g) === -1) {
      noteText = `<div data-schema-version="8">${noteText}\n</div>`;
    }
    let parser = Components.classes[
      "@mozilla.org/xmlextras/domparser;1"
    ].createInstance(Components.interfaces.nsIDOMParser);
    let doc = parser.parseFromString(noteText, "text/html");

    let metadataContainer: Element = doc.querySelector(
      "body > div[data-schema-version]"
    );
    return metadataContainer;
  }

  parseLineText(line: string): string {
    const parser = Components.classes[
      "@mozilla.org/xmlextras/domparser;1"
    ].createInstance(Components.interfaces.nsIDOMParser);
    try {
      if (line.search(/data-schema-version/g) === -1) {
        line = `<div data-schema-version="8">${line}</div>`;
      }
      return parser
        .parseFromString(line, "text/html")
        .querySelector("body > div[data-schema-version]")
        .innerText.trim();
    } catch (e) {
      return "";
    }
  }

  parseMDToHTML(str: string): string {
    return Markdown2HTML(str);
  }

  parseHTMLToMD(str: string): string {
    return HTML2Markdown(str);
  }
}

export default AddonParse;
