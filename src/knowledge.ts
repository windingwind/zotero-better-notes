import { AddonBase, EditorMessage, OutlineType } from "./base";
import { loadTranslator, TRANSLATOR_ID_BETTER_MARKDOWN } from "./exportMD";
import { pick } from "./file_picker";

class Knowledge extends AddonBase {
  currentLine: number;
  currentNodeID: number;
  workspaceWindow: Window;
  workspaceTabId: string;
  workspaceNoteEditor: EditorInstance;
  _firstInit: boolean;
  _exportPath: string;
  _exportFileDict: object;
  _exportPromise: any;
  _pdfNoteId: number;
  _pdfPrintPromise: any;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this._firstInit = true;
    this.currentLine = -1;
    this.currentNodeID = -1;
    this._pdfNoteId = -1;
    this.workspaceNoteEditor = undefined;
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

  async openWorkspaceWindow(
    type: "window" | "tab" = "tab",
    reopen: boolean = false,
    select: boolean = true
  ) {
    if (this.getWorkspaceWindow()) {
      if (!reopen) {
        Zotero.debug("openWorkspaceWindow: focus");
        if (this.workspaceTabId) {
          Zotero_Tabs.select(this.workspaceTabId);
        } else {
          (this.getWorkspaceWindow() as Window).focus();
        }
        return;
      } else {
        Zotero.debug("openWorkspaceWindow: reopen");
        this.closeWorkspaceWindow();
      }
    }
    this._firstInit = true;
    if (type === "window") {
      Zotero.debug("openWorkspaceWindow: as window");
      this._Addon.views._initIframe = Zotero.Promise.defer();
      let win = window.open(
        "chrome://Knowledge4Zotero/content/workspace.xul",
        "_blank",
        "chrome,extrachrome,menubar,resizable,scrollbars,status,width=1000,height=600"
      );
      this.workspaceWindow = win;
      this.workspaceTabId = "";
      await this.waitWorkspaceReady();
      this.setWorkspaceNote("main");
      this.currentLine = -1;
      this._Addon.views.initKnowledgeWindow(win);
      this._Addon.views.switchView(OutlineType.treeView);
      this._Addon.views.updateOutline();
      this._Addon.views.updateAutoInsertAnnotationsMenu();
    } else {
      Zotero.debug("openWorkspaceWindow: as tab");
      this._Addon.views._initIframe = Zotero.Promise.defer();
      // Avoid sidebar show up
      Zotero_Tabs.jump(0);
      let { id, container } = Zotero_Tabs.add({
        type: "betternotes",
        title: Zotero.locale.includes("zh") ? "工作区" : "Workspace",
        index: 1,
        data: {},
        select: select,
        onClose: undefined,
      });
      this.workspaceTabId = id;
      const _iframe = window.document.createElement("browser");
      _iframe.setAttribute("class", "reader");
      _iframe.setAttribute("flex", "1");
      _iframe.setAttribute("type", "content");
      _iframe.setAttribute(
        "src",
        "chrome://Knowledge4Zotero/content/workspace.xul"
      );
      container.appendChild(_iframe);

      // @ts-ignore
      this.workspaceWindow = _iframe.contentWindow;
      await this.waitWorkspaceReady();

      this._Addon.views.hideMenuBar(this.workspaceWindow.document);

      this.currentLine = -1;
      this._Addon.views.initKnowledgeWindow(this.workspaceWindow);
      this._Addon.views.switchView(OutlineType.treeView);
      this._Addon.views.updateOutline();
    }
    // Important!
    // Due to unknown reasons, the DOMParser constructor fails after the tab is opened.
    // We restore it from the preserved object constructor.
    DOMParser = this._Addon.events._DOMParser.__proto__.constructor;
  }

  closeWorkspaceWindow() {
    if (this.getWorkspaceWindow()) {
      if (this.workspaceTabId) {
        Zotero_Tabs.close(this.workspaceTabId);
      } else {
        (this.getWorkspaceWindow() as Window).close();
      }
    }
    this.workspaceTabId = "";
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
    type: "main" | "preview" = "main",
    wait: boolean = true
  ): Promise<EditorInstance> {
    let noteEditor = (await this.getWorkspaceEditor(type)) as any;
    let t = 0;
    while (wait && !noteEditor.getCurrentInstance() && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    this.workspaceNoteEditor =
      noteEditor.getCurrentInstance() as EditorInstance;
    return this.workspaceNoteEditor;
  }

  getEditorInstance(note: ZoteroItem) {
    return (Zotero.Notes._editorInstances as EditorInstance[]).find(
      (e) => e._item.id === note.id
    );
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
    if (!noteEditor || !noteEditor.getCurrentInstance()) {
      await noteEditor.initEditor();
    }

    await noteEditor._editorInstance._initPromise;
    // Due to unknown reasons, only after the second init the editor will be correctly loaded.
    // Thus we must init it twice
    if (this._firstInit) {
      this._firstInit = false;
      await noteEditor.initEditor();
    }
    await this._Addon.events.onEditorEvent(
      new EditorMessage("enterWorkspace", {
        editorInstance: noteEditor.getCurrentInstance(),
        params: type,
      })
    );
    if (type === "main") {
      this._Addon.views.updateOutline();
      this._Addon.views.updateWordCount();
    }
  }

  getLinesInNote(note: ZoteroItem): string[] {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return [];
    }
    let noteText: string = note.getNote();
    return this._Addon.parse.parseHTMLLines(noteText);
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

  private async addLineToNote(
    note: ZoteroItem,
    text: string,
    lineIndex: number,
    forceMetadata: boolean = false
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
    Zotero.debug(text);

    const editorInstance = this.getEditorInstance(note);
    if (editorInstance && !forceMetadata) {
      // The note is opened. Add line via note editor
      console.log("Add note line via note editor");
      const _document = editorInstance._iframeWindow.document;
      const currentElement = this._Addon.parse.parseHTMLLineElement(
        _document.querySelector(".primary-editor"),
        lineIndex
      );
      const frag = _document.createDocumentFragment();
      const temp = _document.createElement("div");
      temp.innerHTML = text;
      while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
      }
      currentElement.after(frag);
      this._Addon.views.scrollToPosition(
        editorInstance,
        currentElement.offsetTop
      );
    } else {
      // The note editor does not exits yet. Fall back to modify the metadata
      console.log("Add note line via note metadata");

      // insert after current line
      lineIndex += 1;
      noteLines.splice(lineIndex, 0, text);
      this.setLinesToNote(note, noteLines);
      if (this.getWorkspaceNote().id === note.id) {
        await this.scrollWithRefresh(lineIndex);
      }
    }
  }

  _dataURLtoBlob(dataurl: string) {
    let parts = dataurl.split(",");
    let mime = parts[0].match(/:(.*?);/)[1];
    if (parts[0].indexOf("base64") !== -1) {
      let bstr = atob(parts[1]);
      let n = bstr.length;
      let u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new (Zotero.getMainWindow().Blob)([u8arr], { type: mime });
    }
    return null;
  }

  async _importImage(note: ZoteroItem, src, download = false) {
    let blob;
    if (src.startsWith("data:")) {
      blob = this._dataURLtoBlob(src);
    } else if (download) {
      let res;

      try {
        res = await Zotero.HTTP.request("GET", src, { responseType: "blob" });
      } catch (e) {
        return;
      }
      blob = res.response;
    } else {
      return;
    }

    let attachment = await Zotero.Attachments.importEmbeddedImage({
      blob,
      parentItemID: note.id,
      saveOptions: {},
    });

    return attachment.key;
  }

  async importImagesToNote(note: ZoteroItem, annotations: any) {
    for (let annotation of annotations) {
      if (annotation.image) {
        annotation.imageAttachmentKey = await this._importImage(
          note,
          annotation.image
        );
      }
      delete annotation.image;
    }
  }

  async addAnnotationsToNote(
    note: ZoteroItem,
    annotations: ZoteroItem[],
    lineIndex: number
  ) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    const html = await this._Addon.parse.parseAnnotationHTML(note, annotations);
    this.addLineToNote(note, html, lineIndex);
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

    const linkTemplate = this._Addon.template.renderTemplate(
      "[QuickInsert]",
      "link, subNoteItem, noteItem",
      [link, linkedNote, targetNote]
    );

    this.addLineToNote(targetNote, linkTemplate, lineIndex);

    const backLinkTemplate = this._Addon.template.renderTemplate(
      "[QuickBackLink]",
      "subNoteItem, noteItem",
      [linkedNote, targetNote],
      false
    );

    if (backLinkTemplate) {
      this.addLineToNote(linkedNote, backLinkTemplate, -1);
    }

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

  async modifyLineInNote(
    note: ZoteroItem,
    text: string | Function,
    lineIndex: number,
    forceMetadata: boolean = false
  ) {
    note = note || this.getWorkspaceNote();
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    if (lineIndex < 0 || lineIndex >= noteLines.length) {
      return;
    }
    if (typeof text === "string") {
      noteLines[lineIndex] = text;
    } else if (typeof text === "function") {
      noteLines[lineIndex] = text(noteLines[lineIndex]);
    }
    const editorInstance = this.getEditorInstance(note);
    if (editorInstance && !forceMetadata) {
      // The note is opened. Add line via note editor
      console.log("Modify note line via note editor");
      const _document = editorInstance._iframeWindow.document;
      const currentElement: HTMLElement =
        this._Addon.parse.parseHTMLLineElement(
          _document.querySelector(".primary-editor"),
          lineIndex
        );
      const frag = _document.createDocumentFragment();
      const temp = _document.createElement("div");
      temp.innerHTML = noteLines[lineIndex];
      while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
      }
      currentElement.replaceWith(frag);
      this._Addon.views.scrollToPosition(
        editorInstance,
        currentElement.offsetTop
      );
    } else {
      this.setLinesToNote(note, noteLines);
      await this.scrollWithRefresh(lineIndex);
    }
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
    this.modifyLineInNote(
      note,
      noteLines[lineIndex]
        .replace(headerStartReg, `<h${lineRank}>`)
        .replace(headerStopReg, `</h${lineRank}>`),
      lineIndex
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
    return this._Addon.parse.parseNoteTree(note);
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

  getLineParentNode(
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
    this._Addon.views.scrollToLine(editorInstance, lineIndex);
    this._Addon.events.onEditorEvent(
      new EditorMessage("enterWorkspace", {
        editorInstance: editorInstance,
        params: "main",
      })
    );
  }

  async exportNoteToFile(
    note: ZoteroItem,
    convertNoteLinks: boolean = true,
    saveFile: boolean = true,
    saveNote: boolean = false,
    saveCopy: boolean = false,
    savePDF: boolean = false
  ) {
    if (!saveFile && !saveNote && !saveCopy && !savePDF) {
      return;
    }
    this._exportFileDict = [];

    note = note || this.getWorkspaceNote();
    let newNote: ZoteroItem;
    if (convertNoteLinks || saveNote) {
      const noteID = await ZoteroPane_Local.newNote();
      newNote = Zotero.Items.get(noteID);
      const rootNoteIds = [note.id];

      const convertResult = await this.convertNoteLines(
        note,
        rootNoteIds,
        convertNoteLinks
      );

      this.setLinesToNote(newNote, convertResult.lines);
      Zotero.debug(convertResult.subNotes);

      await Zotero.DB.executeTransaction(async () => {
        await Zotero.Notes.copyEmbeddedImages(note, newNote);
        for (const subNote of convertResult.subNotes) {
          await Zotero.Notes.copyEmbeddedImages(subNote, newNote);
        }
      });
    } else {
      newNote = note;
    }

    if (saveFile) {
      await loadTranslator(TRANSLATOR_ID_BETTER_MARKDOWN);

      const filename = await pick(
        Zotero.getString("fileInterface.export"),
        "save",
        [["MarkDown File(*.md)", "*.md"]],
        `${newNote.getNoteTitle()}.md`
      );
      if (filename) {
        this._exportPath =
          Zotero.File.pathToFile(filename).parent.path + "/attachments";
        // Convert to unix format
        this._exportPath = this._exportPath.replace(/\\/g, "/");

        Components.utils.import("resource://gre/modules/osfile.jsm");

        const hasImage = newNote.getNote().includes("<img");
        if (hasImage) {
          await Zotero.File.createDirectoryIfMissingAsync(
            OS.Path.join(...this._exportPath.split(/\//))
          );
        }

        const translator = new Zotero.Translate.Export();
        translator.setItems([newNote]);
        translator.setLocation(Zotero.File.pathToFile(filename));
        translator.setTranslator(TRANSLATOR_ID_BETTER_MARKDOWN);
        translator.translate();
        this._Addon.views.showProgressWindow(
          "Better Notes",
          `Note Saved to ${filename}`
        );
      }
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
    if (savePDF) {
      console.log(newNote);
      let _w: Window;
      let t = 0;
      this._pdfNoteId = newNote.id;
      this._pdfPrintPromise = Zotero.Promise.defer();
      ZoteroPane.selectItem(note.id);
      do {
        ZoteroPane.openNoteWindow(newNote.id);
        _w = ZoteroPane.findNoteWindow(newNote.id);
        console.log(_w);
        await Zotero.Promise.delay(10);
        t += 1;
      } while (!_w && t < 500);
      ZoteroPane.selectItem(note.id);
      _w.resizeTo(900, 650);
      const checkPrint = () => {
        try {
          const editor: any = _w.document.querySelector("#zotero-note-editor");
          const instance: EditorInstance = editor.getCurrentInstance();
          console.log(instance._iframeWindow.document.title);
          if (instance._iframeWindow.document.title === "Printed") {
            this._pdfPrintPromise.resolve();
            return;
          }
        } catch (e) {}
        setTimeout(checkPrint, 300);
      };
      checkPrint();
      await this._pdfPrintPromise.promise;
      console.log("print finish detected");
      const closeFlag = _w.confirm(
        "Printing finished. Do you want to close the preview window?"
      );
      if (closeFlag) {
        _w.close();
      }
    }
    if (!saveNote) {
      if (newNote.id !== note.id) {
        const _w: Window = ZoteroPane.findNoteWindow(newNote.id);
        if (_w) {
          _w.close();
        }
        await Zotero.Items.erase(newNote.id);
      }
    } else {
      ZoteroPane.openNoteWindow(newNote.id);
    }
  }

  async exportNotesToFile(
    notes: ZoteroItem[],
    useEmbed: boolean,
    useSync: boolean = false
  ) {
    Components.utils.import("resource://gre/modules/osfile.jsm");
    this._exportFileDict = [];
    const filepath = await pick(
      Zotero.getString(useSync ? "sync.sync" : "fileInterface.export") +
        " MarkDown",
      "folder"
    );

    if (!filepath) {
      return;
    }

    await loadTranslator(TRANSLATOR_ID_BETTER_MARKDOWN);

    this._exportPath = Zotero.File.pathToFile(filepath).path + "/attachments";
    // Convert to unix format
    this._exportPath = this._exportPath.replace(/\\/g, "/");

    notes = notes.filter((n) => n && n.getNote);

    if (useEmbed) {
      for (const note of notes) {
        let newNote: ZoteroItem;
        if (this._Addon.parse.parseLinkInText(note.getNote())) {
          const noteID = await ZoteroPane_Local.newNote();
          newNote = Zotero.Items.get(noteID);
          const rootNoteIds = [note.id];

          const convertResult = await this.convertNoteLines(
            note,
            rootNoteIds,
            true
          );

          this.setLinesToNote(newNote, convertResult.lines);
          Zotero.debug(convertResult.subNotes);

          await Zotero.DB.executeTransaction(async () => {
            await Zotero.Notes.copyEmbeddedImages(note, newNote);
            for (const subNote of convertResult.subNotes) {
              await Zotero.Notes.copyEmbeddedImages(subNote, newNote);
            }
          });
        } else {
          newNote = note;
        }

        let filename = `${
          Zotero.File.pathToFile(filepath).path
        }/${this._getFileName(note)}`;
        filename = filename.replace(/\\/g, "/");

        await this._export(newNote, filename, newNote.id !== note.id);
      }
    } else {
      // Export every linked note as a markdown file
      // Find all linked notes that need to be exported
      let allNoteIds: number[] = [].concat(notes.map((n) => n.id));
      for (const note of notes) {
        const linkMatches = note
          .getNote()
          .match(/zotero:\/\/note\/\w+\/\w+\//g);
        if (!linkMatches) {
          continue;
        }
        const subNoteIds = (
          await Promise.all(
            linkMatches.map(async (link) => this.getNoteFromLink(link))
          )
        )
          .filter((res) => res.item)
          .map((res) => res.item.id);
        allNoteIds = allNoteIds.concat(subNoteIds);
      }
      allNoteIds = Array.from(new Set(allNoteIds));
      console.log(allNoteIds);
      const allNoteItems: ZoteroItem[] = Zotero.Items.get(allNoteIds);
      const noteLinkDict = allNoteItems.map((_note) => {
        return {
          link: this.getNoteLink(_note),
          id: _note.id,
          note: _note,
          filename: this._getFileName(_note),
        };
      });
      this._exportFileDict = noteLinkDict;

      for (const noteInfo of noteLinkDict) {
        let exportPath = `${Zotero.File.pathToFile(filepath).path}/${
          noteInfo.filename
        }`;
        await this._export(noteInfo.note, exportPath, false);
        if (useSync) {
          this._Addon.sync.updateNoteSyncStatus(
            noteInfo.note,
            Zotero.File.pathToFile(filepath).path,
            noteInfo.filename
          );
        }
      }
    }
  }

  async syncNotesToFile(notes: ZoteroItem[], filepath: string) {
    this._exportPath = Zotero.File.pathToFile(filepath).path + "/attachments";
    // Convert to unix format
    this._exportPath = this._exportPath.replace(/\\/g, "/");

    // Export every linked note as a markdown file
    // Find all linked notes that need to be exported
    let allNoteIds: number[] = [].concat(notes.map((n) => n.id));
    for (const note of notes) {
      const linkMatches = note.getNote().match(/zotero:\/\/note\/\w+\/\w+\//g);
      if (!linkMatches) {
        continue;
      }
      const subNoteIds = (
        await Promise.all(
          linkMatches.map(async (link) => this.getNoteFromLink(link))
        )
      )
        .filter((res) => res.item)
        .map((res) => res.item.id);
      allNoteIds = allNoteIds.concat(subNoteIds);
    }
    allNoteIds = new Array(...new Set(allNoteIds));
    // console.log(allNoteIds);
    const allNoteItems: ZoteroItem[] = Zotero.Items.get(allNoteIds);
    const noteLinkDict = allNoteItems.map((_note) => {
      return {
        link: this.getNoteLink(_note),
        id: _note.id,
        note: _note,
        filename: this._getFileName(_note),
      };
    });
    this._exportFileDict = noteLinkDict;

    for (const note of notes) {
      const syncInfo = this._Addon.sync.getNoteSyncStatus(note);
      let exportPath = `${decodeURIComponent(
        syncInfo.path
      )}/${decodeURIComponent(syncInfo.filename)}`;
      await this._export(note, exportPath, false);
      this._Addon.sync.updateNoteSyncStatus(note);
    }
  }

  private async _export(
    note: ZoteroItem,
    filename: string,
    deleteAfterExport: boolean
  ) {
    const hasImage = note.getNote().includes("<img");
    if (hasImage) {
      await Zotero.File.createDirectoryIfMissingAsync(
        OS.Path.join(...this._exportPath.split(/\//))
      );
    }

    filename = filename.replace(/\\/g, "/");
    filename = OS.Path.join(...filename.split(/\//));
    if (!Zotero.isWin && filename.charAt(0) !== "/") {
      filename = "/" + filename;
    }
    const translator = new Zotero.Translate.Export();
    translator.setItems([note]);
    translator.setLocation(Zotero.File.pathToFile(filename));
    translator.setTranslator(TRANSLATOR_ID_BETTER_MARKDOWN);
    this._exportPromise = Zotero.Promise.defer();
    translator.translate();
    await this._exportPromise.promise;
    this._Addon.views.showProgressWindow(
      "Better Notes",
      `Note Saved to ${filename}`
    );
    if (deleteAfterExport) {
      const _w: Window = ZoteroPane.findNoteWindow(note.id);
      if (_w) {
        _w.close();
      }
      await Zotero.Items.erase(note.id);
    }
  }

  private _getFileName(noteItem: ZoteroItem) {
    return this._Addon.template.renderTemplate(
      "[ExportMDFileName]",
      "noteItem",
      [noteItem]
    );
  }

  async convertNoteLines(
    currentNote: ZoteroItem,
    rootNoteIds: number[],
    convertNoteLinks: boolean = true
  ): Promise<{ lines: string[]; subNotes: ZoteroItem[] }> {
    Zotero.debug(`convert note ${currentNote.id}`);

    let subNotes = [];
    const [..._rootNoteIds] = rootNoteIds;
    _rootNoteIds.push(currentNote.id);

    let newLines = [];
    const noteLines = this.getLinesInNote(currentNote);
    for (let i in noteLines) {
      newLines.push(noteLines[i]);
      // Convert Link
      if (convertNoteLinks) {
        let link = this._Addon.parse.parseLinkInText(noteLines[i]);
        while (link) {
          const linkIndex = noteLines[i].indexOf(link);
          const params = this._Addon.parse.parseParamsFromLink(link);
          if (
            params.ignore ||
            // Ignore links that are not in <a>
            !noteLines[i].slice(linkIndex - 8, linkIndex).includes("href")
          ) {
            Zotero.debug("ignore link");
            noteLines[i] = noteLines[i].substring(
              noteLines[i].search(/zotero:\/\/note\//g)
            );
            noteLines[i] = noteLines[i].substring(
              noteLines[i].search(/<\/a>/g) + "</a>".length
            );
            link = this._Addon.parse.parseLinkInText(noteLines[i]);
            continue;
          }
          Zotero.debug("convert link");
          let res = await this.getNoteFromLink(link);
          const subNote = res.item;
          if (subNote && _rootNoteIds.indexOf(subNote.id) === -1) {
            Zotero.debug(`Knowledge4Zotero: Exporting sub-note ${link}`);
            const convertResult = await this.convertNoteLines(
              subNote,
              _rootNoteIds,
              convertNoteLinks
            );
            const subNoteLines = convertResult.lines;

            const templateText = await this._Addon.template.renderTemplateAsync(
              "[QuickImport]",
              "subNoteLines, subNoteItem, noteItem",
              [subNoteLines, subNote, currentNote]
            );
            newLines.push(templateText);
            subNotes.push(subNote);
            subNotes = subNotes.concat(convertResult.subNotes);
          }
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/zotero:\/\/note\//g)
          );
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/<\/a>/g) + "</a>".length
          );
          link = this._Addon.parse.parseLinkInText(noteLines[i]);
        }
      }
    }
    Zotero.debug(subNotes);
    return { lines: newLines, subNotes: subNotes };
  }

  async getNoteFromLink(uri: string) {
    const params = this._Addon.parse.parseParamsFromLink(uri);
    if (!params.libraryID) {
      return {
        item: false,
        infoText: "Library does not exist or access denied.",
      };
    }
    Zotero.debug(params);
    let item = await Zotero.Items.getByLibraryAndKeyAsync(
      params.libraryID,
      params.noteKey
    );
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
}

export default Knowledge;
