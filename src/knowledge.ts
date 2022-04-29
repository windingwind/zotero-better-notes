const TreeModel = require("./treemodel");

class Knowledge {
  currentLine: number;
  constructor() {
    this.currentLine = 0;
  }

  getWorkspaceNote() {
    return Zotero.Items.get(
      Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
    );
  }

  getLinesInNote(note: ZoteroItem = undefined): string[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return [];
    }
    let noteText: string = note.getNote();
    let containerIndex = noteText.search(/<div data-schema-version="8">/g);
    if (containerIndex != -1) {
      noteText = noteText.substring(
        containerIndex + '<div data-schema-version="8">'.length,
        noteText.length - "</div>".length
      );
    }
    let noteLines: string[] = noteText.split("\n").filter((s) => s);
    return noteLines;
  }

  getLineParentInNote(
    note: ZoteroItem,
    lineIndex: number = -1
  ): TreeModel.Node<object> {
    if (lineIndex < 0) {
      lineIndex = this.currentLine;
    }
    let nodes = this.getNoteOutlineList(note);
    if (!nodes.length || nodes[0].model.lineIndex > lineIndex) {
      // There is no parent node
      return undefined;
    } else if (nodes[nodes.length - 1].model.lineIndex <= lineIndex) {
      return nodes[nodes.length - 1];
    } else {
      for (let i = 0; i < nodes.length - 1; i++) {
        if (
          nodes[i].model.lineIndex <= lineIndex &&
          nodes[i + 1].model.lineIndex > lineIndex
        ) {
          return nodes[i];
        }
      }
    }
  }

  addLineToNote(note: ZoteroItem, text: string, lineIndex: number) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    noteLines.splice(lineIndex, 0, text);
    note.setNote(`<div data-schema-version="8">${noteLines.join("\n")}</div>`);
    note.saveTx();
  }

  addSubLineToNote(note: ZoteroItem, text: string, lineIndex: number = -1) {
    if (lineIndex < 0) {
      lineIndex = this.currentLine;
    }
    let parentNode = this.getLineParentInNote(note, lineIndex);
    if (!parentNode) {
      this.addLineToNote(note, text, lineIndex);
      return;
    }
    let nodes = this.getNoteOutlineList(note);
    let i = 0;
    for (let node of nodes) {
      if (node.model.lineIndex === parentNode.model.lineIndex) {
        break;
      }
      i++;
    }
    // Get next header line index
    i++;
    if (i >= nodes.length) {
      i = nodes.length - 1;
    }
    // Add line before next header, which is also the end of current parent header
    this.addLineToNote(note, text, nodes[i].model.lineIndex);
  }

  addLinkToNote(note: ZoteroItem, lineIndex: number, linkedNoteID: number) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    this.addSubLineToNote(
      note,
      `<a href="zotero://note/${linkedNoteID}" rel="noopener noreferrer nofollow">${Zotero.Items.get(
        linkedNoteID
      ).getNoteTitle()}</a>`,
      lineIndex
    );
  }

  getNoteOutline(note: ZoteroItem): TreeModel.Node<object> {
    // See http://jnuno.com/tree-model-js
    note = note || this.getWorkspaceNote();
    if (!note) {
      return undefined;
    }
    let metadataContainer = this.parseNoteHTML(note);
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
      rank: 0,
      lineIndex: -1,
    });
    let currentNode = root;
    for (let i = 0; i < metadataContainer.children.length; i++) {
      let currentRank = 7;
      let lineElement = metadataContainer.children[i];
      if (lineElement.tagName[0] === "H" && lineElement.tagName.length === 2) {
        let _rank = parseInt(lineElement.tagName[1]);
        if (_rank >= 1 && _rank <= 6) {
          currentRank = _rank;
        }
        while (currentNode.model.rank >= currentRank) {
          currentNode = currentNode.parent;
        }
        currentNode.addChild(
          tree.parse({
            rank: currentRank,
            lineIndex: i,
          })
        );
      }
    }
    return root;
  }

  getNoteOutlineList(
    note: ZoteroItem,
    doFilter: boolean = true
  ): TreeModel.Node<object>[] {
    return this.getNoteOutline(note).all(
      (node) => !doFilter || node.model.lineIndex >= 0
    );
  }

  async getNoteMarkdown(note: ZoteroItem) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let items = [note];
    let markdownFormat = {
      mode: "export",
      id: Zotero.Translators.TRANSLATOR_ID_NOTE_MARKDOWN,
    };
    // let htmlFormat = {
    //   mode: "export",
    //   id: Zotero.Translators.TRANSLATOR_ID_NOTE_HTML,
    // };
    let mdText = "";
    let done = false;
    Zotero.QuickCopy.getContentFromItems(
      items,
      markdownFormat,
      (obj, worked) => {
        if (!worked) {
          Zotero.log(Zotero.getString("fileInterface.exportError"), "warning");
          return;
        }
        mdText = obj.string.replace(/\r\n/g, "\n");
        done = true;
        // Zotero.QuickCopy.getContentFromItems(
        //   items,
        //   htmlFormat,
        //   (obj2, worked) => {
        //     if (!worked) {
        //       Zotero.log(
        //         Zotero.getString("fileInterface.exportError"),
        //         "warning"
        //       );
        //       return;
        //     }
        //     console.log(obj.string.replace(/\r\n/g, "\n"));
        //     console.log("text/html", obj2.string.replace(/\r\n/g, "\n"));
        //   }
        // );
      }
    );
    let t = 0;
    while (!done && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    return mdText;
  }

  parseNoteHTML(note: ZoteroItem): Element {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return undefined;
    }
    let noteText = note.getNote();
    if (noteText.search(/<div data-schema-version/g) === -1) {
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
}

export { Knowledge };
