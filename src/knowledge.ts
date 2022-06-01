import { AddonBase, EditorMessage, OutlineType } from "./base";

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

  getWorkspaceNote(): ZoteroItem {
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
      this._Addon.views._initIframe = Zotero.Promise.defer();
      let win = window.open(
        "chrome://Knowledge4Zotero/content/workspace.xul",
        "_blank",
        "chrome,extrachrome,menubar,resizable,scrollbars,status,width=1000,height=600"
      );
      this.workspaceWindow = win;
      await this.waitWorkspaceReady();
      this.setWorkspaceNote("main");
      this.currentLine = -1;
      this._Addon.views.initKnowledgeWindow(win);
      this._Addon.views.switchView(OutlineType.treeView);
      this._Addon.views.updateOutline();
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
    this._Addon.views.updateOutline();
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
    let noteLines = noteText.split("\n").filter((e) => e);

    let tagStack = [];
    let toPush = [];
    let toRemove = 0;

    let nextAppend = false;

    const forceInline = ["table", "blockquote", "pre", "li"];
    const selfInline = ["ol", "ul"];

    const parsedLines = [];
    for (let line of noteLines) {
      for (const tag of forceInline) {
        const startReg = `<${tag}>`;
        const endReg = `</${tag}>`;
        const startIdx = line.search(startReg);
        const endIdx = line.search(endReg);
        if (startIdx !== -1 && endIdx === -1) {
          toPush.push(tag);
        } else if (endIdx !== -1) {
          toRemove += 1;
        }
      }

      if (tagStack.filter((e) => forceInline.indexOf(e) !== -1).length === 0) {
        let nextLoop = false;
        for (const tag of selfInline) {
          const startReg = new RegExp(`<${tag}>`);
          const endReg = new RegExp(`</${tag}>`);
          const startIdx = line.search(startReg);
          const endIdx = line.search(endReg);
          if (startIdx !== -1 && endIdx === -1) {
            nextAppend = true;
            nextLoop = true;
            parsedLines.push(line);
            break;
          }
          if (endIdx !== -1) {
            parsedLines[parsedLines.length - 1] += `\n${line}`;
            nextLoop = true;
            break;
          }
        }
        if (nextLoop) {
          continue;
        }
      }

      if (tagStack.length === 0 && !nextAppend) {
        parsedLines.push(line);
      } else {
        parsedLines[parsedLines.length - 1] += `\n${line}`;
        nextAppend = false;
      }

      if (toPush.length > 0) {
        tagStack = tagStack.concat(toPush);
        toPush = [];
      }
      while (toRemove > 0) {
        tagStack.pop();
        toRemove -= 1;
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
      lineIndex - 1
    );
    this._Addon.events.onEditorEvent(
      new EditorMessage("enterWorkspace", {
        editorInstance: editorInstance,
        params: "main",
      })
    );
  }

  private async addLineToNote(
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
    if (lineIndex < 0) {
      lineIndex =
        this.getWorkspaceNote().id === note.id && this.currentLine >= 0
          ? this.currentLine
          : noteLines.length;
    } else if (lineIndex >= noteLines.length) {
      lineIndex = noteLines.length;
    }
    Zotero.debug(
      `insert to ${lineIndex}, it used to be ${noteLines[lineIndex]}`
    );
    // Force links not to appear in one line
    if (lineIndex > 0 && noteLines[lineIndex - 1].search(/<a href/g) !== -1) {
      text = `<p> </p>\n${text}`;
    }
    if (
      lineIndex < noteLines.length &&
      noteLines[lineIndex].search(/<a href/g)
    ) {
      text = `${text}\n<p> </p>`;
    }
    noteLines.splice(lineIndex, 0, text);
    this.setLinesToNote(note, noteLines);
    await this.scrollWithRefresh(lineIndex);
  }

  async addLinesToNote(
    note: ZoteroItem,
    newLines: string[],
    lineIndex: number
  ) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    if (lineIndex < 0) {
      lineIndex =
        this.getWorkspaceNote().id === note.id && this.currentLine >= 0
          ? this.currentLine
          : noteLines.length;
    } else if (lineIndex >= noteLines.length) {
      lineIndex = noteLines.length;
    }
    this.setLinesToNote(
      note,
      noteLines.slice(0, lineIndex).concat(newLines, noteLines.slice(lineIndex))
    );
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
    if (!linkedNote.isNote()) {
      this._Addon.views.showProgressWindow("Better Notes", "Not a note item");
      return;
    }
    const link = this.getNoteLink(linkedNote);
    const linkText = linkedNote.getNoteTitle().trim();
    let _newLine: string = "";
    const templateText = this._Addon.template.getTemplateText("[QuickInsert]");
    try {
      _newLine = new Function(
        "link, subNoteItem, noteItem",
        "return `" + templateText + "`"
      )(link, linkedNote, targetNote);
    } catch (e) {
      alert(e);
    }
    this.addLineToNote(targetNote, _newLine, lineIndex, true);
    this._Addon.views.showProgressWindow(
      "Better Notes",
      "Link is added to workspace"
    );
  }

  getNoteLink(note: ZoteroItem) {
    let libraryID = note.libraryID;
    let library = Zotero.Libraries.get(libraryID);
    let groupID: string;
    if (library.libraryType === "user") {
      groupID = "u";
    } else if (library.libraryType === "group") {
      groupID = `${library.id}`;
    }
    let noteKey = note.key;
    return `zotero://note/${groupID}/${noteKey}/`;
  }

  getAnnotationLink(annotation: ZoteroItem) {
    let position = JSON.parse(annotation.annotationPosition);
    let openURI: string;

    const attachment = annotation.parentItem;
    let libraryID = attachment.libraryID;
    let library = Zotero.Libraries.get(libraryID);
    if (library.libraryType === "user") {
      openURI = `zotero://open-pdf/library/items/${attachment.key}`;
    } else if (library.libraryType === "group") {
      openURI = `zotero://open-pdf/groups/${library.id}/items/${attachment.key}`;
    }

    openURI +=
      "?page=" +
      (position.pageIndex + 1) +
      (annotation.key ? "&annotation=" + annotation.key : "");

    return openURI;
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

    let targetIndex = 0;
    let targetRank = 1;

    let lines = this.getLinesInNote(note);

    if (as === "child") {
      targetIndex = targetNode.model.endIndex;
      targetRank = targetNode.model.rank === 6 ? 6 : targetNode.model.rank + 1;
    } else if (as === "before") {
      targetIndex = targetNode.model.lineIndex;
      targetRank =
        targetNode.model.rank === 7
          ? targetNode.parent.model.rank === 6
            ? 6
            : targetNode.parent.model.rank + 1
          : targetNode.model.rank;
    } else if (as === "after") {
      targetIndex = targetNode.model.endIndex;
      targetRank =
        targetNode.model.rank === 7
          ? targetNode.parent.model.rank === 6
            ? 6
            : targetNode.parent.model.rank + 1
          : targetNode.model.rank;
    }

    let rankChange = targetRank - currentNode.model.rank;

    Zotero.debug(`move to ${targetIndex}`);

    let movedLines = lines.splice(
      currentNode.model.lineIndex,
      currentNode.model.endIndex - currentNode.model.lineIndex
    );

    let headerReg = /<\/?h[1-6]>/g;
    for (const i in movedLines) {
      movedLines[i] = movedLines[i].replace(headerReg, (e) => {
        let rank = parseInt(e.slice(-2, -1));
        rank += rankChange;
        if (rank > 6) {
          rank = 6;
        }
        if (rank < 1) {
          rank = 1;
        }
        return `${e.slice(0, -2)}${rank}>`;
      });
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
        name = this.parseLineText(lineElement);

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
          endIndex: noteLines.length,
          link: link,
        });
        parentNode.addChild(currentNode);
        const currentIndex = parentNode.children.indexOf(currentNode);
        if (currentIndex > 0) {
          const previousNode = parentNode.children[currentIndex - 1];
          // Traverse the previous node tree and set the end index
          previousNode.walk((node) => {
            if (node.model.endIndex > parseInt(i)) {
              node.model.endIndex = parseInt(i);
            }
            return true;
          });
          previousNode.model.endIndex = parseInt(i);
        }
        lastNode = currentNode;
      }
    }
    return root;
  }

  getNoteTreeAsList(
    note: ZoteroItem,
    filterRoot: boolean = true,
    filterLink: boolean = true
  ): TreeModel.Node<object>[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    return this.getNoteTree(note).all(
      (node) =>
        (!filterRoot || node.model.lineIndex >= 0) &&
        (!filterLink || node.model.rank <= 6)
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

  async exportNoteToFile(
    note: ZoteroItem,
    convertNoteLinks: boolean = true,
    convertNoteImages: boolean = true,
    saveFile: boolean = true,
    saveNote: boolean = false,
    saveCopy: boolean = false
  ) {
    if (!saveFile && !saveNote && !saveCopy) {
      return;
    }
    note = note || this.getWorkspaceNote();
    const noteID = await ZoteroPane_Local.newNote();
    const newNote = Zotero.Items.get(noteID);
    const rootNoteIds = [note.id];

    const convertResult = await this.convertNoteLines(
      note,
      rootNoteIds,
      convertNoteLinks,
      convertNoteImages
    );

    this.setLinesToNote(newNote, convertResult.lines);
    Zotero.debug(convertResult.subNotes);

    await Zotero.DB.executeTransaction(async () => {
      for (const subNote of convertResult.subNotes) {
        await Zotero.Notes.copyEmbeddedImages(subNote, newNote);
      }
    });
    if (saveFile) {
      const exporter = new Zotero_File_Exporter();
      exporter.items = [newNote];
      await exporter.save();
    }
    if (saveCopy) {
      if (!convertNoteLinks) {
        Zotero_File_Interface.exportItemsToClipboard(
          [newNote],
          Zotero.Translators.TRANSLATOR_ID_MARKDOWN_AND_RICH_TEXT
        );
        this._Addon.views.showProgressWindow("Better Notes", "Note Copied");
      } else {
        alert(
          "Select all in the new note window and copy-paste to other applications."
        );
        ZoteroPane.openNoteWindow(newNote.id);
        alert(
          "Waiting for paste finish...\nImages may not be copied correctly if OK is pressed before paste."
        );
      }
    }
    if (!saveNote) {
      const _w: Window = ZoteroPane.findNoteWindow(newNote.id);
      if (_w) {
        _w.close();
      }
      await Zotero.Items.erase(newNote.id);
    } else {
      ZoteroPane.openNoteWindow(newNote.id);
    }
  }

  async convertImage(line: string, newLines: string[], sourceNote: ZoteroItem) {
    const imageReg = new RegExp("<img");
    const imageBrReg = new RegExp("<br>");
    const imageKeyReg = new RegExp(`data-attachment-key="`);
    const imageAnnotationReg = new RegExp(`data-annotation="`);

    const imageIndex = line.search(imageReg);
    if (imageIndex !== -1) {
      const lineStart = line.slice(0, imageIndex);
      const imageLine = line.slice(imageIndex);
      const lineEnd = imageLine.slice(imageLine.search(imageBrReg));
      const attachmentKeyIndex = imageLine.search(imageKeyReg);
      const annotationIndex = imageLine.search(imageAnnotationReg);

      if (attachmentKeyIndex !== -1) {
        let attachmentKey = imageLine.slice(
          attachmentKeyIndex + imageKeyReg.source.length
        );
        attachmentKey = attachmentKey.slice(0, attachmentKey.search(/"/g));
        const attachmentItem = await Zotero.Items.getByLibraryAndKeyAsync(
          sourceNote.libraryID,
          attachmentKey
        );
        let attachmentURL = await attachmentItem.getFilePathAsync();
        if (attachmentURL) {
          Zotero.debug("convert image");
          // const imageData = await editorInstance._getDataURL(
          //   attachmentItem
          // );
          Zotero.debug(line);
          Zotero.debug(lineStart);
          Zotero.debug(lineEnd);
          if (Zotero.isMac) {
            attachmentURL = "file://" + attachmentURL;
          }
          newLines.push(`<p>!<a href="${attachmentURL}">image</a></p>`);

          // Export annotation link
          if (annotationIndex !== -1) {
            let annotationContentRaw = imageLine.slice(
              annotationIndex + imageAnnotationReg.source.length
            );
            annotationContentRaw = annotationContentRaw.slice(
              0,
              annotationContentRaw.search('"')
            );
            if (annotationContentRaw) {
              Zotero.debug("convert image annotation");
              Zotero.debug(annotationContentRaw);
              try {
                let annotation = JSON.parse(
                  decodeURIComponent(annotationContentRaw)
                );
                if (annotation) {
                  // annotation.uri was used before note-editor v4
                  let uri = annotation.attachmentURI || annotation.uri;
                  let position = annotation.position;
                  if (typeof uri === "string" && typeof position === "object") {
                    let annotationURL;
                    let uriParts = uri.split("/");
                    let libraryType = uriParts[3];
                    let key = uriParts[6];
                    if (libraryType === "users") {
                      annotationURL = "zotero://open-pdf/library/items/" + key;
                    }
                    // groups
                    else {
                      let groupID = uriParts[4];
                      annotationURL =
                        "zotero://open-pdf/groups/" + groupID + "/items/" + key;
                    }

                    annotationURL +=
                      "?page=" +
                      (position.pageIndex + 1) +
                      (annotation.annotationKey
                        ? "&annotation=" + annotation.annotationKey
                        : "");
                    newLines.push(`<p><a href="${annotationURL}">pdf</a></p>`);
                  }
                }
              } catch (e) {
                Zotero.debug(e);
              }
            }
          }
          newLines.push(`${lineStart}${lineEnd}`);
          return true;
        }
      }
    }
    return false;
  }

  async convertNoteLines(
    currentNote: ZoteroItem,
    rootNoteIds: number[],
    convertNoteLinks: boolean = true,
    convertNoteImages: boolean = true
  ): Promise<{ lines: string[]; subNotes: ZoteroItem[] }> {
    Zotero.debug(`convert note ${currentNote.id}`);

    let subNotes = [];
    const [..._rootNoteIds] = rootNoteIds;
    _rootNoteIds.push(currentNote.id);
    let newLines = [];
    const noteLines = this.getLinesInNote(currentNote);
    for (let i in noteLines) {
      // Embed Image
      if (convertNoteImages) {
        const hasImage = await this.convertImage(
          noteLines[i],
          newLines,
          currentNote
        );
        if (hasImage) {
          continue;
        }
      }
      newLines.push(noteLines[i]);
      // Convert Link
      if (convertNoteLinks) {
        let link = this.getLinkFromText(noteLines[i]);
        while (link) {
          Zotero.debug("convert link");
          let res = await this.getNoteFromLink(link);
          const subNote = res.item;
          if (subNote && _rootNoteIds.indexOf(subNote.id) === -1) {
            Zotero.debug(`Knowledge4Zotero: Exporting sub-note ${link}`);
            const convertResult = await this.convertNoteLines(
              subNote,
              _rootNoteIds,
              convertNoteLinks,
              convertNoteImages
            );
            const subNoteLines = convertResult.lines;
            let _newLine: string = "";
            const templateText =
              this._Addon.template.getTemplateText("[QuickImport]");
            try {
              _newLine = new Function(
                "subNoteLines, subNoteItem, noteItem",
                "return `" + templateText + "`"
              )(subNoteLines, subNote, currentNote);
            } catch (e) {
              alert(e);
              continue;
            }
            newLines.push(_newLine);
            subNotes.push(subNote);
            subNotes = subNotes.concat(convertResult.subNotes);
          }
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/zotero:\/\/note\//g)
          );
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/<\/a>/g) + "</a>".length
          );
          link = this.getLinkFromText(noteLines[i]);
        }
      }
    }
    Zotero.debug(subNotes);
    return { lines: newLines, subNotes: subNotes };
  }

  getLinkFromText(text: string) {
    // Must end with "
    const linkIndex = text.search(/zotero:\/\/note\//g);
    if (linkIndex === -1) {
      return "";
    }
    let link = text.substring(linkIndex);
    link = link.substring(0, link.search('"'));
    return link;
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
}

export default Knowledge;
