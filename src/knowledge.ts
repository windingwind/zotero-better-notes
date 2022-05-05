import { AddonBase, EditorMessage } from "./base";

const TreeModel = require("./treemodel");

class Knowledge extends AddonBase {
  currentLine: number;
  currentNodeID: number;
  workspaceWindow: Window;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.currentLine = -1;
    this.currentNodeID = -1;
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
        "chrome,extrachrome,menubar,resizable,scrollbars,status,width=1000,height=600"
      );
      this.workspaceWindow = win;
      await this.waitWorkspaceReady();
      win.addEventListener("resize", (e) => {
        this._Addon.views.setTreeViewSize();
      });
      this._Addon.views.bindTreeViewResize();
      this.setWorkspaceNote("main");
      this.currentLine = -1;
      this._Addon.views.buildOutline();
    }
  }

  async waitWorkspaceReady() {
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
    await this.waitWorkspaceReady();
    return _window.document.getElementById(`zotero-note-editor-${type}`);
  }

  async getWorkspaceEditorInstance(
    type: "main" | "preview" = "main"
  ): Promise<EditorInstance> {
    let noteEditor = (await this.getWorkspaceEditor(type)) as any;
    let t = 0;
    while (!noteEditor.getCurrentInstance() && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    return noteEditor.getCurrentInstance() as EditorInstance;
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
    if (type === "preview") {
      _window.document
        .getElementById("preview-splitter")
        .setAttribute("state", "open");
    } else {
      // Set line to default
      this.currentLine = -1;
    }
    await this.waitWorkspaceReady();
    let noteEditor: any = await this.getWorkspaceEditor(type);
    noteEditor.mode = "edit";
    noteEditor.viewMode = "library";
    noteEditor.parent = null;
    noteEditor.item = note;

    await noteEditor._initPromise;
    let t = 0;
    while (!noteEditor.getCurrentInstance() && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    await this._Addon.events.onEditorEvent(
      new EditorMessage("enterWorkspace", {
        editorInstance: noteEditor.getCurrentInstance(),
        params: type,
      })
    );
    this._Addon.views.buildOutline();
  }

  getLinesInNote(note: ZoteroItem): string[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return [];
    }
    let noteText: string = note.getNote();
    let containerIndex = noteText.search(/data-schema-version="8">/g);
    if (containerIndex != -1) {
      noteText = noteText.substring(
        containerIndex + 'data-schema-version="8">'.length,
        noteText.length - "</div>".length
      );
    }
    let noteLines: string[] = noteText.split("\n");

    const cacheStart = [/<ol>/g, /<ul>/g, /<li>/g, /<blockquote>/g, /<pre>/g];
    const cacheEnd = [
      /<\/ol>/g,
      /<\/ul>/g,
      /<\/li>/g,
      /<\/blockquote>/g,
      /<\/pre>/g,
    ];
    let parsedLines: string[] = [];
    let appendLater: boolean = false;
    let cacheStartLine = false;
    let cachedLines: string = "";
    for (let line of noteLines) {
      cacheStartLine = false;
      if (
        cachedLines ||
        cacheStart.filter((e) => {
          return line.search(e) !== -1;
        }).length > 0
      ) {
        appendLater = true;
        cachedLines += `${cachedLines.length > 0 ? "\n" : ""}${line}`;
        cacheStartLine = true;
      }
      if (
        cacheEnd.filter((e) => {
          return line.search(e) !== -1;
        }).length > 0
      ) {
        appendLater = false;
        // If already added to cache
        if (!cacheStartLine) {
          cachedLines += `\n${line}`;
        }
        line = cachedLines;
        cachedLines = "";
      }
      if (!appendLater) {
        parsedLines.push(line);
      }
    }
    return parsedLines;
  }

  setLinesToNote(note: ZoteroItem, noteLines: string[]) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return [];
    }
    let noteText: string = note.getNote();
    let containerIndex = noteText.search(/data-schema-version="8">/g);
    if (containerIndex === -1) {
      note.setNote(
        `<div data-schema-version="8">${noteLines.join("\n")}</div>`
      );
    } else {
      let noteHead = noteText.substring(0, containerIndex);
      note.setNote(
        `${noteHead}data-schema-version="8">${noteLines.join("\n")}</div>`
      );
    }

    note.saveTx();
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

  async scrollWithRefresh(lineIndex: number) {
    await Zotero.Promise.delay(500);
    let editorInstance = await this.getWorkspaceEditorInstance();
    this._Addon.views.scrollToLine(
      editorInstance,
      // Scroll to 6 lines before the inserted line
      lineIndex - 5
    );
    this._Addon.events.onEditorEvent(
      new EditorMessage("enterWorkspace", {
        editorInstance: editorInstance,
        params: "main",
      })
    );
  }

  private addLineToNote(
    note: ZoteroItem,
    text: string,
    lineIndex: number,
    newLine: boolean
  ) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    if (newLine) {
      noteLines.splice(lineIndex, 0, "<p> </p>", text);
    } else {
      noteLines.splice(lineIndex, 0, text);
    }
    this.setLinesToNote(note, noteLines);
  }

  async addSubLineToNote(
    note: ZoteroItem,
    text: string,
    lineIndex: number = -1,
    newLine: boolean = false
  ) {
    if (lineIndex < 0) {
      lineIndex =
        this.currentLine >= 0
          ? this.currentLine + 2
          : this.getLinesInNote(note).length + 1;
    }
    // let parentNode = this.getLineParentInNote(note, lineIndex);
    // if (!parentNode) {
    //   this.addLineToNote(note, text, lineIndex);
    //   return;
    // }
    // let nodes = this.getNoteTreeAsList(note);
    // let i = 0;
    // for (let node of nodes) {
    //   if (node.model.lineIndex === parentNode.model.lineIndex) {
    //     break;
    //   }
    //   i++;
    // }
    // // Get next header line index
    // i++;
    // if (i >= nodes.length) {
    //   i = nodes.length - 1;
    // }
    // Add to next line
    this.addLineToNote(note, text, lineIndex, newLine);
    await this.scrollWithRefresh(lineIndex);
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
    let linkText = linkedNote.getNoteTitle().trim();
    this.addSubLineToNote(
      targetNote,
      `<a href="zotero://note/${groupID}/${noteKey}" rel="noopener noreferrer nofollow">${
        linkText ? linkText : `zotero://note/${groupID}/${noteKey}`
      }</a>`,
      lineIndex,
      true
    );
    this._Addon.views.showProgressWindow(
      "Knowledge",
      "Link is added to workspace"
    );
  }

  async modifyLineInNote(note: ZoteroItem, text: string, lineIndex: number) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    if (lineIndex < 0 || lineIndex >= noteLines.length) {
      return;
    }
    noteLines[lineIndex] = text;
    this.setLinesToNote(note, noteLines);
    await this.scrollWithRefresh(lineIndex);
  }

  async changeHeadingLineInNote(
    note: ZoteroItem,
    rankChange: number,
    lineIndex: number
  ) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    const noteLines = this.getLinesInNote(note);
    if (lineIndex < 0 || lineIndex >= noteLines.length) {
      return;
    }
    const headerStartReg = new RegExp("<h[1-6]>");
    const headerStopReg = new RegExp("</h[1-6]>");
    let headerStart = noteLines[lineIndex].search(headerStartReg);
    if (headerStart === -1) {
      return;
    }
    let lineRank = parseInt(noteLines[lineIndex][headerStart + 2]) + rankChange;
    if (lineRank > 6) {
      lineRank = 6;
    } else if (lineRank < 1) {
      lineRank = 1;
    }
    noteLines[lineIndex] = noteLines[lineIndex]
      .replace(headerStartReg, `<h${lineRank}>`)
      .replace(headerStopReg, `</h${lineRank}>`);
    this.setLinesToNote(note, noteLines);
    await this.scrollWithRefresh(lineIndex);
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
    this.setLinesToNote(note, newLines);
  }

  getNoteTree(note: ZoteroItem = undefined): TreeModel.Node<object> {
    // See http://jnuno.com/tree-model-js
    note = note || this.getWorkspaceNote();
    if (!note) {
      return undefined;
    }
    const noteLines = this.getLinesInNote(note);
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
    let headerStartReg = new RegExp("<h[1-6]>");
    let headerStopReg = new RegExp("</h[1-6]>");
    for (let i in noteLines) {
      let currentRank = 7;
      let lineElement = noteLines[i];
      const isHeading = lineElement.search(headerStartReg) !== -1;
      const isLink = lineElement.search(/zotero:\/\/note\//g) !== -1;
      if (isHeading || isLink) {
        let name = "";
        if (isHeading) {
          const startIndex = lineElement.search(headerStartReg);
          const stopIndex = lineElement.search(headerStopReg);
          currentRank = parseInt(
            lineElement.slice(startIndex + 2, startIndex + 3)
          );
          name = lineElement.slice(startIndex + 4, stopIndex);
        } else {
          name = lineElement.slice(lineElement.search(/">/g) + 2);
          name = name.slice(0, name.search(/<\//g));
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
          // @ts-ignore
          name: name,
          lineIndex: i,
          endIndex: noteLines.length,
        });
        currentNode.addChild(lastNode);
        currentNode = lastNode;
      }
    }
    return root;
  }

  getNoteTreeAsList(
    note: ZoteroItem,
    filterRoot: boolean = true,
    filterLikn: boolean = true
  ): TreeModel.Node<object>[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    return this.getNoteTree(note).all(
      (node) =>
        (!filterRoot || node.model.lineIndex >= 0) &&
        (!filterLikn || node.model.rank <= 6)
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

  async exportNoteToFile(
    note: ZoteroItem,
    convertNoteLinks: boolean = true,
    saveFile: boolean = true,
    saveNote: boolean = false,
    saveCopy: boolean = false
  ) {
    if (convertNoteLinks) {
      let item: ZoteroItem = new Zotero.Item("note");
      item.setNote(note.getNote());
      item.saveTx();
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
      this.setLinesToNote(item, newLines);
      if (saveFile) {
        const exporter = new Zotero_File_Exporter();
        exporter.items = [item];
        await exporter.save();
      }
      if (saveCopy) {
        Zotero_File_Interface.exportItemsToClipboard(
          [item],
          Zotero.Translators.TRANSLATOR_ID_MARKDOWN_AND_RICH_TEXT
        );
        this._Addon.views.showProgressWindow("Knowledge", "Note Copied");
      }
      if (!saveNote) {
        if (saveCopy) {
          // Wait copy finish
          await Zotero.Promise.delay(500);
        }
        await Zotero.Items.erase(item.id);
      }
    } else {
      if (saveFile) {
        const exporter = new Zotero_File_Exporter();
        exporter.items = [note];
        exporter.save();
      }
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
}

export default Knowledge;
