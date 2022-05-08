import { AddonBase, EditorMessage } from "./base";

class AddonEvents extends AddonBase {
  notifierCallback: object;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<string>,
        extraData: object
      ) => {
        if (event === "modify" && type === "item") {
          if (
            ids.indexOf(Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) >=
            0
          ) {
            Zotero.debug("Knowledge4Zotero: main knowledge modify check.");
            this._Addon.views.buildOutline();
          }
        }
        if (
          (event == "select" &&
            type == "tab" &&
            extraData[ids[0]].type == "reader") ||
          (event === "add" &&
            type === "item" &&
            Zotero.Items.get(ids).filter((item) => {
              return item.isAnnotation();
            }).length > 0) ||
          (event === "close" && type === "tab") ||
          (event === "open" && type === "file")
        ) {
          Zotero.debug("Knowledge4Zotero: buildReaderAnnotationButton");
          this.onEditorEvent(
            new EditorMessage("buildReaderAnnotationButton", {})
          );
        }
      },
    };
  }

  public async onInit() {
    Zotero.debug("Knowledge4Zotero: init called");
    await Zotero.uiReadyPromise;
    this._Addon.views.addOpenWorkspaceButton();
    this._Addon.views.addNewKnowledgeButton();
    this.addEditorInstanceListener();
    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "item",
      "tab",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      function (e) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
    if (!Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
      this.onEditorEvent(new EditorMessage("openUserGuide", {}));
    }
    this.resetState();
  }

  public addEditorInstanceListener() {
    Zotero.Notes._registerEditorInstance = Zotero.Notes.registerEditorInstance;
    Zotero.Notes.registerEditorInstance = (instance: EditorInstance) => {
      Zotero.Notes._registerEditorInstance(instance);
      this.onEditorEvent(
        new EditorMessage("addNoteInstance", {
          editorInstance: instance,
        })
      );
    };
  }

  public async addEditorEventListener(
    instance: EditorInstance,
    event: string,
    message: EditorMessage
  ) {
    await instance._initPromise;
    let editor: Element = this._Addon.views.getEditor(
      instance._iframeWindow.document
    );
    editor.addEventListener(event, (e: XULEvent) => {
      message.content.event = e;
      message.content.editorInstance = instance;
      this.onEditorEvent(message);
    });
  }

  public async addEditorDocumentEventListener(
    instance: EditorInstance,
    event: string,
    message: EditorMessage
  ) {
    await instance._initPromise;
    let doc: Document = instance._iframeWindow.document;

    doc.addEventListener(event, (e: XULEvent) => {
      message.content.event = e;
      message.content.editorInstance = instance;
      this.onEditorEvent(message);
    });
  }

  public async onEditorEvent(message: EditorMessage) {
    Zotero.debug(`Knowledge4Zotero: onEditorEvent\n${message.type}`);
    if (message.type === "openUserGuide") {
      /*
        message.content = {}
      */
      window.open(
        "chrome://Knowledge4Zotero/content/wizard.xul",
        "_blank",
        // margin=44+44/32+10+10+53, final space is 700*500
        "chrome,extrachrome,centerscreen,width=650,height=608"
      );
    } else if (message.type === "openWorkspace") {
      /*
        message.content = {}
      */
      await this._Addon.knowledge.openWorkspaceWindow();
    } else if (message.type === "createWorkspace") {
      /*
        message.content = {}
      */
      const res = confirm(
        `Will create a new note under collection '${ZoteroPane_Local.getSelectedCollection().getName()}' and set it the main note. Continue?`
      );
      if (!res) {
        return;
      }
      const header = prompt("Enter new note header:");
      const noteID = await ZoteroPane_Local.newNote();
      Zotero.Items.get(noteID).setNote(
        `<div data-schema-version="8"><h1>${header}</h1>\n</div>`
      );
      await this.onEditorEvent(
        new EditorMessage("setMainKnowledge", {
          params: { itemID: noteID },
        })
      );
      await this._Addon.knowledge.openWorkspaceWindow();
    } else if (message.type === "selectMainKnowledge") {
      /*
        message.content = {}
      */
      const io = {
        // Not working
        singleSelection: true,
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut;
      if (ids.length === 0) {
        this._Addon.views.showProgressWindow("Knowledge", "No note selected.");
        return;
      } else if (ids.length > 1) {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          "Please select a note item."
        );
        return;
      }

      const note = Zotero.Items.get(ids[0]);
      if (note && note.isNote()) {
        this.onEditorEvent(
          new EditorMessage("setMainKnowledge", {
            params: { itemID: note.id, enableConfirm: false },
          })
        );
      } else {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          "Not a valid note item."
        );
      }
    } else if (message.type === "setMainKnowledge") {
      /*
        message.content = {
          params: {itemID, enableConfirm}
        }
      */
      Zotero.debug("Knowledge4Zotero: setMainKnowledge");
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      let itemID = message.content.params.itemID;
      const item = Zotero.Items.get(itemID);
      if (itemID === mainKnowledgeID) {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          "Already a main Note."
        );
        return;
      } else if (!item.isNote()) {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          "Not a valid note item."
        );
      } else {
        if (Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
          if (message.content.params.enableConfirm) {
            let confirmChange = confirm(
              "Will change current Knowledge Workspace. Confirm?"
            );
            if (!confirmChange) {
              return;
            }
          }
        }
        Zotero.Prefs.set("Knowledge4Zotero.mainKnowledgeID", itemID);
        await this._Addon.knowledge.openWorkspaceWindow();
        await this._Addon.knowledge.setWorkspaceNote("main");
        this._Addon.views.showProgressWindow(
          "Knowledge",
          `Set main Note to: ${item.getNoteTitle()}`
        );
      }
    } else if (message.type === "addNoteInstance") {
      /*
        message.content = {
          editorInstance,
        }
      */
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      await message.content.editorInstance._initPromise;

      message.content.editorInstance._knowledgeUIInitialized = false;

      let isMainKnowledge =
        message.content.editorInstance._item.id === mainKnowledgeID;

      Zotero.debug(`Knowledge4Zotero: main Knowledge`);
      await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-start",
        isMainKnowledge ? "isMainKnowledge" : "notMainKnowledge",
        isMainKnowledge ? "Edit the main Note in Workspace" : "Open Workspace",
        "openWorkspace",
        "start"
      );
      const addLinkDropDown: Element = await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-addlink",
        "addToKnowledge",
        "Add link of current note to the main note",
        "addToKnowledge",
        "middle"
      );
      addLinkDropDown.addEventListener("mouseover", async (e) => {
        if (addLinkDropDown.getElementsByClassName("popup").length > 0) {
          return;
        }
        const buttonParam = [];
        const nodes = this._Addon.knowledge.getNoteTreeAsList(undefined);
        for (let node of nodes) {
          buttonParam.push({
            id: `knowledge-addlink-popup-${node.model.endIndex}`,
            text: node.model.name,
            rank: node.model.rank,
            eventType: "addToKnowledgeLine",
          });
        }
        const popup: Element = await this._Addon.views.addEditorPopup(
          message.content.editorInstance,
          "knowledge-addlink-popup",
          // [{ id: ''; icon: string; eventType: string }],
          buttonParam,
          addLinkDropDown
        );
        addLinkDropDown.addEventListener("mouseleave", (e) => {
          popup.remove();
        });
        addLinkDropDown.addEventListener("click", (e) => {
          popup.remove();
        });
      });
      await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-end",
        "export",
        "Export with linked notes",
        "export",
        "end"
      );
      if (!message.content.editorInstance._knowledgeSelectionInitialized) {
        this.addEditorDocumentEventListener(
          message.content.editorInstance,
          "selectionchange",
          new EditorMessage("noteEditorSelectionChange", {})
        );
        message.content.editorInstance._knowledgeSelectionInitialized = true;
      }
      // Title indent
      const _window = message.content.editorInstance._iframeWindow;
      const style = _window.document.createElement("style");
      style.innerHTML = `
        h2 {text-indent: 10px}
        h3 {text-indent: 20px}
        h4 {text-indent: 30px}
        h5 {text-indent: 40px}
        h6 {text-indent: 50px}
      `;
      _window.document.body.append(style);
      message.content.editorInstance._knowledgeUIInitialized = true;
    } else if (message.type === "enterWorkspace") {
      /*
        message.content = {
          editorInstance,
          params: "main" | "preview"
        }
      */
      const _window = message.content.editorInstance._iframeWindow;
      let t = 0;
      while (
        !message.content.editorInstance._knowledgeUIInitialized &&
        t < 500
      ) {
        t += 1;
        await Zotero.Promise.delay(10);
      }
      if (message.content.params === "main") {
        // This is a main knowledge, hide all buttons except the export button and add title
        const middle = _window.document.getElementById(
          "knowledge-tools-middle"
        );
        middle.innerHTML = "";
        const header = _window.document.createElement("div");
        header.setAttribute("title", "This is a Main Note");
        header.innerHTML = "Main Note";
        header.setAttribute("style", "font-size: medium");
        middle.append(header);
      } else {
        // This is a preview knowledge, hide openWorkspace button add show close botton
        this._Addon.views.changeEditorButtonView(
          _window.document.getElementById("knowledge-start"),
          "openAttachment",
          "Open Note Attachments",
          "openAttachment"
        );
        this._Addon.views.changeEditorButtonView(
          _window.document.getElementById("knowledge-end"),
          "close",
          "Close Preview",
          "closePreview"
        );
      }
    } else if (message.type === "addToKnowledge") {
      /*
        message.content = {
          editorInstance
        }
      */
      Zotero.debug("Knowledge4Zotero: addToKnowledge");
      this._Addon.knowledge.addLinkToNote(
        undefined,
        // -1 for automatically insert to current selected line or end of note
        -1,
        message.content.editorInstance._item.id
      );
    } else if (message.type === "addToKnowledgeLine") {
      /*
        message.content = {
          editorInstance,
          event,
          type
        }
      */
      //  if(message.content.)
      Zotero.debug("Knowledge4Zotero: addToKnowledgeLine");
      Zotero.debug(message.content.event.target.id);
      const idSplit = message.content.event.target.id.split("-");
      const lineIndex = parseInt(idSplit[idSplit.length - 1]);
      this._Addon.knowledge.addLinkToNote(
        undefined,
        lineIndex,
        message.content.editorInstance._item.id
      );
    } else if (message.type === "clickOutlineHeading") {
      /*
        message.content = {
          event: {itemData}
        }
      */
      let editorInstance =
        await this._Addon.knowledge.getWorkspaceEditorInstance();
      // Set node id
      this._Addon.knowledge.currentNodeID = parseInt(
        (message.content.event as any).itemData.id
      );
      this._Addon.views.scrollToLine(
        editorInstance,
        // Scroll to 6 lines before the inserted line
        (message.content.event as any).itemData.lineIndex - 5
      );
    } else if (message.type === "moveOutlineHeading") {
      /*
        message.content = {
          params: {
            fromID, toID, type: "before" | "after"
          }
        }
      */
      let tree = this._Addon.knowledge.getNoteTree();
      let fromNode = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        message.content.params.fromID,
        tree
      );
      let toNode = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        message.content.params.toID,
        tree
      );
      Zotero.debug(fromNode.model);
      Zotero.debug(toNode.model);
      this._Addon.knowledge.moveHeaderLineInNote(
        undefined,
        fromNode,
        toNode,
        message.content.params.type
      );
      this._Addon.views.buildOutline();
    } else if (message.type === "closePreview") {
      /*
        message.content = {
          editorInstance
        }
      */
      const _window = this._Addon.knowledge.getWorkspaceWindow() as Window;
      _window.document
        .getElementById("preview-splitter")
        .setAttribute("state", "collapsed");
    } else if (message.type === "onNoteLink") {
      /*
        message.content = {
          params: {
            item: ZoteroItem | boolean,
            infoText: string
          }
        }
      */
      if (!message.content.params.item) {
        Zotero.debug(`Knowledge4Zotero: ${message.content.params.infoText}`);
      }
      Zotero.debug(
        `Knowledge4Zotero: onNoteLink ${message.content.params.item.id}`
      );
      let _window = this._Addon.knowledge.getWorkspaceWindow();
      if (_window) {
        if (
          message.content.params.item.id !==
          Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
        ) {
          this._Addon.knowledge.setWorkspaceNote(
            "preview",
            message.content.params.item
          );
        }
        (_window as Window).focus();
      } else {
        ZoteroPane.openNoteWindow(message.content.params.item.id);
      }
    } else if (message.type === "noteEditorSelectionChange") {
      if (
        message.content.editorInstance._item.id ===
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      ) {
        // Update current line index
        let selection =
          message.content.editorInstance._iframeWindow.document.getSelection();
        let focusNode = selection.focusNode as XUL.Element;
        if (!focusNode) {
          return;
        }

        function getChildIndex(node) {
          return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
        }

        // Make sure this is a direct child node of editor
        try {
          while (
            !focusNode.parentElement.className ||
            focusNode.parentElement.className.indexOf("primary-editor") === -1
          ) {
            focusNode = focusNode.parentNode as XUL.Element;
          }
        } catch (e) {
          return;
        }

        let currentLineIndex = getChildIndex(focusNode);

        const tableElements = Array.prototype.filter.call(
          Array.prototype.slice.call(
            focusNode.parentElement.childNodes,
            0,
            currentLineIndex
          ),
          (e) => {
            return e.tagName === "UL" || e.tagName === "OL";
          }
        );

        for (const tableElement of tableElements) {
          currentLineIndex += tableElement.childElementCount - 1;
        }

        const tagName = focusNode.tagName;
        if (tagName === "UL" || tagName === "OL") {
          let liElement = selection.focusNode as XUL.Element;
          while (liElement.tagName !== "LI") {
            liElement = liElement.parentElement;
          }
          currentLineIndex += getChildIndex(liElement);
        }
        Zotero.debug(`Knowledge4Zotero: line ${currentLineIndex} selected.`);
        this._Addon.knowledge.currentLine = currentLineIndex;
      }
    } else if (message.type === "export") {
      /*
        message.content = {
          editorInstance
        }
      */
      const io = {
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XULWindow).openDialog(
        "chrome://Knowledge4Zotero/content/export.xul",
        "",
        "chrome,centerscreen,width=300,height=150",
        io
      );
      await io.deferred.promise;

      const options = io.dataOut;
      await this._Addon.knowledge.exportNoteToFile(
        message.content.editorInstance._item,
        true,
        options.exportFile,
        options.exportNote,
        options.exportCopy
      );
    } else if (message.type === "openAttachment") {
      /*
        message.content = {
          editorInstance
        }
      */
      const note = message.content.editorInstance._item;
      let successCount = 0;
      let failCount = 0;
      if (note.parentItem) {
        for (const attchment of Zotero.Items.get(
          note.parentItem.getAttachments()
        ).filter((item: ZoteroItem) => {
          return item.isPDFAttachment();
        })) {
          Zotero.debug(attchment);
          try {
            Zotero.debug("Launching PDF without page number");
            let zp = Zotero.getActiveZoteroPane();
            if (zp) {
              zp.viewAttachment([attchment.id]);
            }
            Zotero.Notifier.trigger("open", "file", attchment.id);
            successCount += 1;
          } catch (e) {
            Zotero.debug("Knowledge4Zotero: Open attachment failed:");
            Zotero.debug(attchment);
            failCount += 1;
          }
        }
      }
      if (successCount === 0) {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          failCount
            ? "Error occurred on opening attachemnts."
            : "No attachment found.",
          "fail"
        );
      }
    } else if (message.type === "buildReaderAnnotationButton") {
      /*
        message.content = {}
      */
      for (const reader of Zotero.Reader._readers) {
        Zotero.debug("reader found");
        let t = 0;
        while (
          t < 100 &&
          !(await this._Addon.views.addReaderAnnotationButton(reader))
        ) {
          await Zotero.Promise.delay(50);
          t += 1;
        }
      }
    } else if (message.type === "addAnnotationNote") {
      /*
        message.content = {
          params: { annotations: Reader JSON type, annotationItem }
        }
      */
      const annotations = message.content.params.annotations;
      const annotationItem: ZoteroItem = message.content.params.annotationItem;

      if (annotationItem.annotationComment) {
        const text = annotationItem.annotationComment;
        let link = text.substring(text.search(/zotero:\/\/note\//g));
        link = link.substring(0, link.search('"'));

        if (link) {
          const note = (await this._Addon.knowledge.getNoteFromLink(link)).item;
          if (note && note.id) {
            Zotero.debug(note);
            ZoteroPane.openNoteWindow(note.id);
            return;
          }
        }
      }

      const note: ZoteroItem = new Zotero.Item("note");
      note.parentID = Zotero.Items.get(
        annotations[0].attachmentItemID
      ).parentID;
      if (annotationItem.annotationComment) {
        note.setNote(
          `<div data-schema-version="8"><p>${annotationItem.annotationComment}</p>\n</div>`
        );
      }
      await note.saveTx();
      let libraryID = note.libraryID;
      let library = Zotero.Libraries.get(libraryID);
      let groupID: string;
      if (library.libraryType === "user") {
        groupID = "u";
      } else if (library.libraryType === "group") {
        groupID = `${library.id}`;
      }
      let noteKey = note.key;
      annotationItem.annotationComment = `${
        annotationItem.annotationComment ? annotationItem.annotationComment : ""
      }\nnote link: "zotero://note/${groupID}/${noteKey}/"`;
      await annotationItem.saveTx();
      ZoteroPane.openNoteWindow(note.id);
      let t = 0;
      while (t < 100 && !ZoteroPane.findNoteWindow(note.id)) {
        await Zotero.Promise.delay(50);
        t += 1;
      }
      const _window = ZoteroPane.findNoteWindow(note.id);

      const noteEditor = _window.document.getElementById("zotero-note-editor");

      t = 0;
      while (!noteEditor.getCurrentInstance() && t < 500) {
        t += 1;
        await Zotero.Promise.delay(10);
      }
      const editorInstance = noteEditor.getCurrentInstance();
      editorInstance.focus();
      await editorInstance.insertAnnotations(annotations);
    } else {
      Zotero.debug(`Knowledge4Zotero: message not handled.`);
    }
  }

  private resetState(): void {
    // Reset preferrence state.
  }
}

export default AddonEvents;
