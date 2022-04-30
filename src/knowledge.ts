import { AddonBase, EditorMessage } from "./base";

const TreeModel = require("./treemodel");

class Knowledge extends AddonBase {
  currentLine: number;
  workspaceWindow: Window;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.currentLine = 0;
  }

  getWorkspaceNote() {
    return Zotero.Items.get(
      Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
    );
  }

  getWorkspaceWindow(): Window | boolean {
    if (this.workspaceWindow && !this.workspaceWindow.closed) {
      return this.workspaceWindow;
    }
    return false;
  }

  async openWorkspaceWindow() {
    if (this.getWorkspaceWindow()) {
      (this.getWorkspaceWindow() as Window).focus();
    } else {
      let win = window.open(
        "chrome://Knowledge4Zotero/content/workspace.xul",
        "_blank",
        "chrome,extrachrome,menubar,resizable,scrollbars,status,width=900,height=600"
      );
      this.workspaceWindow = win;
      await this.waitWorkspaceRedy();
      this.setWorkspaceNote("main");
    }
  }

  async waitWorkspaceRedy() {
    let _window = this.getWorkspaceWindow() as Window;
    if (!_window) {
      return false;
    }
    let t = 0;
    while (_window.document.readyState !== "complete" && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    return t < 500;
  }

  async getWorkspaceEditor(type: "main" | "preview" = "main") {
    let _window = this.getWorkspaceWindow() as Window;
    if (!_window) {
      return;
    }
    await this.waitWorkspaceRedy();
    return _window.document.getElementById(`zotero-note-editor-${type}`);
  }

  async setWorkspaceNote(
    type: "main" | "preview" = "main",
    note: ZoteroItem = undefined
  ) {
    let _window = this.getWorkspaceWindow() as Window;
    note = note || this.getWorkspaceNote();
    if (!_window) {
      return;
    }
    await this.waitWorkspaceRedy();
    let noteEditor: any = await this.getWorkspaceEditor(type);
    let lastEditorInstance = noteEditor._editorInstance as EditorInstance;
    if (lastEditorInstance) {
      await this._Addon.events.onEditorEvent(
        new EditorMessage("leaveWorkspace", {
          editorInstance: lastEditorInstance,
          params: type,
        })
      );
    }
    noteEditor.mode = "edit";
    noteEditor.viewMode = "library";
    noteEditor.parent = null;
    noteEditor.item = note;

    await this._Addon.events.onEditorEvent(
      new EditorMessage("enterWorkspace", {
        editorInstance: noteEditor,
        params: type,
      })
    );
  }

  getLinesInNote(note: ZoteroItem): string[] {
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
    let nodes = this.getNoteTreeAsList(note);
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
    let nodes = this.getNoteTreeAsList(note);
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

  addLinkToNote(
    targetNote: ZoteroItem,
    lineIndex: number,
    linkedNoteID: number
  ) {
    targetNote = targetNote || this.getWorkspaceNote();
    if (!targetNote) {
      return;
    }
    let linkedNote = Zotero.Items.get(linkedNoteID);
    let libraryID = linkedNote.libraryID;
    let library = Zotero.Libraries.get(libraryID);
    let groupID: string;
    if (library.libraryType === "user") {
      groupID = "u";
    } else if (library.libraryType === "group") {
      groupID = `${library.id}`;
    }
    let noteKey = linkedNote.key;
    this.addSubLineToNote(
      targetNote,
      `<a href="zotero://note/${groupID}/${noteKey}" rel="noopener noreferrer nofollow">${linkedNote.getNoteTitle()}</a>`,
      lineIndex
    );
    this._Addon.views.showProgressWindow(
      "Knowledge",
      "Link is added to workspace"
    );
  }

  moveHeaderLineInNote(
    note: ZoteroItem,
    currentNode: TreeModel.Node<object>,
    targetNode: TreeModel.Node<object>,
    as: "child" | "before" | "after"
  ) {
    note = note || this.getWorkspaceNote();
    if (!note || targetNode.getPath().indexOf(currentNode) >= 0) {
      return undefined;
    }

    let currentLineRange = this.getNodeLineRangeInNoteTree(note, currentNode);
    let targetLineRange = this.getNodeLineRangeInNoteTree(note, targetNode);
    let targetIndex = 0;
    let targetRank = 1;

    let lines = this.getLinesInNote(note);

    if (as === "child") {
      targetIndex = targetLineRange[1];
      targetRank = targetNode.model.rank === 6 ? 6 : targetNode.model.rank + 1;
    } else if (as === "before") {
      targetIndex = targetLineRange[0];
      targetRank = targetNode.model.rank;
    } else if (as === "after") {
      targetIndex = targetLineRange[1];
      targetRank = targetNode.model.rank;
    }

    if (targetIndex > currentLineRange[1]) {
      targetIndex -= currentLineRange[1] - currentLineRange[0];
    }

    let rankChange = targetRank - currentNode.model.rank;

    let movedLines = lines.splice(
      currentLineRange[0],
      currentLineRange[1] - currentLineRange[0]
    );

    let headerStartReg = new RegExp("<h[1-6]>");
    let headerStopReg = new RegExp("</h[1-6]>");
    for (let i = 0; i < movedLines.length; i++) {
      let headerStart = movedLines[i].search(headerStartReg);
      if (headerStart === -1) {
        continue;
      }
      let lineRank = parseInt(movedLines[i][headerStart + 2]) + rankChange;
      if (lineRank > 6) {
        lineRank = 6;
      } else if (lineRank < 1) {
        lineRank = 1;
      }
      movedLines[i] = movedLines[i]
        .replace(headerStartReg, `<h${lineRank}>`)
        .replace(headerStopReg, `</h${lineRank}>`);
    }
    let newLines = lines
      .slice(0, targetIndex)
      .concat(movedLines, lines.slice(targetIndex));
    note.setNote(`<div data-schema-version="8">${newLines.join("\n")}</div>`);
    note.saveTx();
  }

  getNoteTree(note: ZoteroItem): TreeModel.Node<object> {
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
      id: -1,
      rank: 0,
      lineIndex: -1,
      endIndex: -1,
    });
    let id = 0;
    let currentNode = root;
    let lastNode = undefined;
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
        if (lastNode) {
          lastNode.model.endIndex = i;
        }
        lastNode = tree.parse({
          id: id++,
          rank: currentRank,
          lineIndex: i,
          endIndex: metadataContainer.children.length,
        });
        currentNode.addChild(lastNode);
        currentNode = lastNode;
      }
    }
    return root;
  }

  getNoteTreeAsList(
    note: ZoteroItem,
    doFilter: boolean = true
  ): TreeModel.Node<object>[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    return this.getNoteTree(note).all(
      (node) => !doFilter || node.model.lineIndex >= 0
    );
  }

  getNoteTreeNodeById(
    note: ZoteroItem,
    id: number,
    root: TreeModel.Node<object> = undefined
  ) {
    root = root || this.getNoteTree(note);
    return root.first(function (node) {
      return node.model.id === id;
    });
  }

  getNoteTreeNodesByRank(
    note: ZoteroItem,
    rank: number,
    root: TreeModel.Node<object> = undefined
  ) {
    root = root || this.getNoteTree(note);
    return root.all(function (node) {
      return node.model.rank === rank;
    });
  }

  getNodeLineRangeInNoteTree(
    note: ZoteroItem,
    node: TreeModel.Node<object>
  ): number[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let nodes = this.getNoteTreeAsList(note);
    let endIndex = node.model.endIndex;
    for (let i = 0; i < nodes.length; i++) {
      if (
        nodes[i].model.lineIndex >= node.model.lineIndex &&
        nodes[i].model.rank > node.model.rank
      ) {
        endIndex = nodes[i].model.endIndex;
      }
    }
    return [node.model.lineIndex, endIndex];
  }

  async getNoteExport(note: ZoteroItem, format: "markdown" | "html") {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let items = [note];
    let formatObj = {
      mode: "export",
      id:
        format === "markdown"
          ? Zotero.Translators.TRANSLATOR_ID_NOTE_MARKDOWN
          : Zotero.Translators.TRANSLATOR_ID_NOTE_HTML,
    };
    let text = "";
    let done = false;
    Zotero.QuickCopy.getContentFromItems(items, formatObj, (obj, worked) => {
      if (!worked) {
        Zotero.log(Zotero.getString("fileInterface.exportError"), "warning");
        return;
      }
      text = obj.string.replace(/\r\n/g, "\n");
      done = true;
    });
    let t = 0;
    while (!done && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    return text;
  }

  async exportNoteToFile(note: ZoteroItem, convertNoteLinks: boolean = true) {
    let exporter = new Zotero_File_Exporter();

    if (convertNoteLinks) {
      let item: ZoteroItem = new Zotero.Item("note");
      let noteLines = this.getLinesInNote(note);
      let newLines = [];
      for (let i in noteLines) {
        newLines.push(noteLines[i]);
        let linkIndex = noteLines[i].search(/zotero:\/\/note\//g);
        while (linkIndex >= 0) {
          let link = noteLines[i].substring(linkIndex);
          link = link.substring(0, link.search('"'));
          let res = await this.getNoteFromLink(link);
          if (res.item && res.item.id !== note.id) {
            Zotero.debug(`Knowledge4Zotero: Exporting sub-note ${link}`);
            newLines.push("<blockquote>");
            newLines.push(
              `<p><strong>Linked Note: <a href="${link}" rel="noopener noreferrer nofollow">${res.item.getNoteTitle()}</a></strong></p>`
            );
            let linkedLines = this.getLinesInNote(res.item);
            newLines = newLines.concat(linkedLines);
            newLines.push("</blockquote>");
          }
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/zotero:\/\/note\//g)
          );
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/<\/a>/g) + "</a>".length
          );
          linkIndex = noteLines[i].search(/zotero:\/\/note\//g);
        }
      }
      item.setNote(`<div data-schema-version="8">${newLines.join("\n")}</div>`);
      item.saveTx();
      exporter.items = [item];
      exporter.save();
      Zotero.Items.erase(item.id);
    } else {
      exporter.items = [note];
      exporter.save();
    }
  }

  async getNoteFromLink(uri: string) {
    let [groupID, noteKey] = uri.substring("zotero://note/".length).split("/");

    // User libraryID by defaultx
    let libraryID = 1;

    if (groupID !== "u") {
      // Not a user item
      let _groupID = parseInt(groupID);
      libraryID = Zotero.Groups.getLibraryIDFromGroupID(_groupID);
    }

    if (!libraryID) {
      return {
        item: false,
        infoText: "Library does not exist or access denied.",
      };
    }
    let item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, noteKey);
    if (!item || !item.isNote()) {
      return {
        item: false,
        infoText: "Note does not exist or is not a note.",
      };
    }
    return {
      item: item,
      infoText: "OK",
    };
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
