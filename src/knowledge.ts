const TreeModel = require("./treemodel");

class Knowledge {
  currentLine: number;
  constructor(noteItem: ZoteroItem) {
    this.currentLine = 0;
    // this.createKnowledgeItem();
  }
  //   createKnowledgeItem() {
  //     return;
  //   }

  getWorkspaceNote() {
    return Zotero.Items.get(
      Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
    );
  }

  getLines(): string[] {
    let note = this.getWorkspaceNote();
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

  getLineParent(lineIndex: number = -1): TreeModel.Node<object> {
    if (lineIndex < 0) {
      lineIndex = this.currentLine;
    }
    let nodes = this.getOutlineList();
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

  addLine(text: string, lineIndex: number) {
    let note = this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let noteLines = this.getLines();
    noteLines.splice(lineIndex, 0, text);
    note.setNote(`<div data-schema-version="8">${noteLines.join("\n")}</div>`);
    note.saveTx();
  }

  addLineToParent(text: string, lineIndex: number = -1) {
    if (lineIndex < 0) {
      lineIndex = this.currentLine;
    }
    let parentNode = this.getLineParent();
    if (!parentNode) {
      this.addLine(text, lineIndex);
      return;
    }
    let nodes = this.getOutlineList();
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
    this.addLine(text, nodes[i].model.lineIndex);
  }

  addLink(lineIndex: number, noteID: number) {
    this.addLineToParent(`<a href="zotero://note/${noteID}" rel="noopener noreferrer nofollow">${Zotero.Items.get(noteID).getNoteTitle()}</a>`, lineIndex);
  }

  getOutline(): TreeModel.Node<object> {
    // See http://jnuno.com/tree-model-js
    let metadataContainer = this.parseNoteHTML();
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

  getOutlineList(doFilter: boolean = true): TreeModel.Node<object>[] {
    return this.getOutline().all(
      (node) => !doFilter || node.model.lineIndex >= 0
    );
  }

  jumpToNote(noteLinke: string) {}

  export() {}

  parseNoteHTML(): Element {
    let note = this.getWorkspaceNote();
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
