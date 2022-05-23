import { link } from "fs";
import { AddonBase, EditorMessage, NoteTemplate } from "./base";

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
            this._Addon.views.updateOutline();
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
    if (!Zotero.Notes._knowledgeInit) {
      Zotero.Notes._knowledgeInit = true;
      Zotero.Notes._registerEditorInstance =
        Zotero.Notes.registerEditorInstance;
      Zotero.Notes.registerEditorInstance = (instance: EditorInstance) => {
        Zotero.Notes._registerEditorInstance(instance);
        this.onEditorEvent(
          new EditorMessage("addNoteInstance", {
            editorInstance: instance,
          })
        );
      };
    }
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
          "Better Notes",
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
          "Better Notes",
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
          "Better Notes",
          "Already a main Note."
        );
        return;
      } else if (!item.isNote()) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
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
          "Better Notes",
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

      const noteItem: ZoteroItem = Zotero.Items.get(
        message.content.editorInstance._item.id
      );
      if (!noteItem.isNote()) {
        return;
      }

      let isMainKnowledge =
        message.content.editorInstance._item.id === mainKnowledgeID;

      Zotero.debug(`Knowledge4Zotero: main Knowledge`);
      await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-start",
        isMainKnowledge ? "isMainKnowledge" : "notMainKnowledge",
        isMainKnowledge ? "Edit the Main Note in Workspace" : "Open Workspace",
        "openWorkspace",
        "start"
      );
      const addLinkDropDown: Element = await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-addlink",
        "addToKnowledge",
        "Add Link of Current Note to Main Note",
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
      let topItem = noteItem.parentItem;
      while (topItem && !topItem.isRegularItem()) {
        topItem = topItem.parentItem;
      }
      if (topItem) {
        const addCitationButton: Element =
          await this._Addon.views.addEditorButton(
            message.content.editorInstance,
            "knowledge-addcitation",
            "addCitation",
            "Insert Note's Parent Citation",
            "addCitation",
            "middle"
          );
        addCitationButton.addEventListener("click", async (e) => {
          let format = Zotero.QuickCopy.getFormatFromURL(
            Zotero.QuickCopy.lastActiveURL
          );
          format = Zotero.QuickCopy.unserializeSetting(format);
          const cite = Zotero.QuickCopy.getContentFromItems(
            [topItem],
            format,
            null,
            0
          );
          this._Addon.knowledge.addLineToNote(noteItem, cite.html, -1);
        });
      }

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

        // Link popup listener
        const container =
          _window.document.getElementsByClassName("relative-container")[0];
        const containerObserver = new MutationObserver(async (mutations) => {
          for (const mut of mutations) {
            for (const node of mut.addedNodes) {
              // wait for ui ready
              await Zotero.Promise.delay(20);
              const linkElement = (node as Element).getElementsByTagName(
                "a"
              )[0];
              if (!linkElement) {
                return;
              }
              const linkObserver = new MutationObserver(async (linkMuts) => {
                this._Addon.views.updateEditorPopupButtons(
                  _window,
                  linkElement.getAttribute("href")
                );
              });
              linkObserver.observe(linkElement, { attributes: true });
              this._Addon.views.updateEditorPopupButtons(
                _window,
                linkElement.getAttribute("href")
              );
            }
          }
        });
        containerObserver.observe(container, {
          childList: true,
        });
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
      Zotero.debug("Knowledge4Zotero: addToKnowledgeLine");
      Zotero.debug(message.content.event.target.id);
      const idSplit = message.content.event.target.id.split("-");
      const lineIndex = parseInt(idSplit[idSplit.length - 1]);
      this._Addon.knowledge.addLinkToNote(
        undefined,
        lineIndex,
        message.content.editorInstance._item.id
      );
    } else if (message.type === "jumpNode") {
      /*
        message.content = {
          params: {id, lineIndex}
        }
      */
      Zotero.debug(message.content.params);
      let editorInstance =
        await this._Addon.knowledge.getWorkspaceEditorInstance();
      // Set node id
      this._Addon.knowledge.currentNodeID = parseInt(message.content.params.id);
      this._Addon.views.updateEditCommand();
      this._Addon.views.scrollToLine(
        editorInstance,
        // Scroll to 1 lines before the inserted line
        message.content.params.lineIndex - 1
      );
    } else if (message.type === "moveNode") {
      /*
        message.content = {
          params: {
            fromID, toID, moveType: "before" | "child"
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
      Zotero.debug(message.content.params.moveType);
      this._Addon.knowledge.moveHeaderLineInNote(
        undefined,
        fromNode,
        toNode,
        message.content.params.moveType
      );
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
    } else if (message.type === "addHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      const text = prompt(`Enter new heading to Insert:`);
      this._Addon.knowledge.openWorkspaceWindow();
      if (text.trim()) {
        if (this._Addon.knowledge.currentNodeID < 0) {
          // Add a new H1
          this._Addon.knowledge.addLineToNote(
            undefined,
            `<h1>${text}</h1>`,
            -1
          );
          return;
        }
        let node = this._Addon.knowledge.getNoteTreeNodeById(
          undefined,
          this._Addon.knowledge.currentNodeID
        );
        this._Addon.knowledge.addLineToNote(
          undefined,
          `<h${node.model.rank}>${text}</h${node.model.rank}>`,
          node.model.endIndex
        );
      }
    } else if (message.type === "indentHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      if (this._Addon.knowledge.currentNodeID < 0) {
        return;
      }
      let node = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        this._Addon.knowledge.currentNodeID
      );
      if (node.model.rank === 7) {
        return;
      }
      if (node.model.rank === 6) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Cannot decrease a level 6 Heading."
        );
        return;
      }
      this._Addon.knowledge.changeHeadingLineInNote(
        undefined,
        1,
        node.model.lineIndex
      );
    } else if (message.type === "unindentHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      if (this._Addon.knowledge.currentNodeID < 0) {
        return;
      }
      let node = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        this._Addon.knowledge.currentNodeID
      );
      if (node.model.rank === 7) {
        return;
      }
      if (node.model.rank === 1) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Cannot raise a level 1 Heading."
        );
        return;
      }
      this._Addon.knowledge.changeHeadingLineInNote(
        undefined,
        -1,
        node.model.lineIndex
      );
    } else if (message.type === "insertNotes") {
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
      const notes = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
        item.isNote()
      );
      if (notes.length === 0) {
        return;
      }

      const newLines = [];
      newLines.push("<h1>Imported Notes</h1>");
      newLines.push("<p> </p>");

      for (const note of notes) {
        const linkURL = this._Addon.knowledge.getNoteLink(note);
        const linkText = note.getNoteTitle().trim();
        newLines.push(
          `<p><a href="${linkURL}">${linkText ? linkText : linkURL}</a></p>`
        );
        newLines.push("<p> </p>");
      }
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
    } else if (message.type === "insertTextUsingTemplate") {
      /*
        message.content = {
          params: {templateName}
        }
      */
      const newLines = [];

      const templateText = this._Addon.template.getTemplateByName(
        message.content.params.templateName
      ).text;

      let _newLine: string = "";
      try {
        _newLine = new Function("return `" + templateText + "`")();
      } catch (e) {
        alert(e);
        return;
      }
      newLines.push(_newLine);
      newLines.push("<p> </p>");
      // End of line
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
    } else if (message.type === "insertItemUsingTemplate") {
      /*
        message.content = {
          params: {templateName}
        }
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
      const items = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
        item.isRegularItem()
      );
      if (items.length === 0) {
        return;
      }

      const newLines = [];
      newLines.push("<p> </p>");

      const templateText = this._Addon.template.getTemplateByName(
        message.content.params.templateName
      ).text;

      const toCopyImage = [];

      const copyNoteImage = (noteItem: ZoteroItem) => {
        toCopyImage.push(noteItem);
      };

      for (const topItem of items) {
        /*
            Available variables:
            topItem, itemNotes, copyNoteImage
          */

        const itemNotes: ZoteroItem[] = topItem
          .getNotes()
          .map((e) => Zotero.Items.get(e));

        let _newLine: string = "";
        try {
          _newLine = new Function(
            "topItem, itemNotes, copyNoteImage",
            "return `" + templateText + "`"
          )(topItem, itemNotes, copyNoteImage);
        } catch (e) {
          alert(e);
          continue;
        }
        newLines.push(_newLine);
        newLines.push("<p> </p>");
      }
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
      const mainNote = this._Addon.knowledge.getWorkspaceNote();
      await Zotero.DB.executeTransaction(async () => {
        for (const subNote of toCopyImage) {
          await Zotero.Notes.copyEmbeddedImages(subNote, mainNote);
        }
      });
    } else if (message.type === "insertNoteUsingTemplate") {
      /*
        message.content = {
          params: {templateName}
        }
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
      const notes = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
        item.isNote()
      );
      if (notes.length === 0) {
        return;
      }

      const newLines = [];
      newLines.push("<p> </p>");

      const templateText = this._Addon.template.getTemplateByName(
        message.content.params.templateName
      ).text;

      for (const noteItem of notes) {
        /*
          Available variables:
          noteItem, topItem, link
        */
        let topItem = noteItem.parentItem;
        while (topItem && !topItem.isRegularItem()) {
          topItem = topItem.parentItem;
        }
        const linkURL = this._Addon.knowledge.getNoteLink(noteItem);
        const linkText = noteItem.getNoteTitle().trim();
        const link = `<p><a href="${linkURL}">${
          linkText ? linkText : linkURL
        }</a></p>`;
        let _newLine: string = "";
        try {
          _newLine = new Function(
            "noteItem, topItem, link",
            "return `" + templateText + "`"
          )(noteItem, topItem, link);
        } catch (e) {
          alert(e);
          continue;
        }
        newLines.push(_newLine);
        newLines.push("<p> </p>");
      }
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
    } else if (message.type === "editTemplate") {
      /*
        message.content = {}
      */
      window.open(
        "chrome://Knowledge4Zotero/content/template.xul",
        "_blank",
        "chrome,extrachrome,centerscreen,width=800,height=400,resizable=yes"
      );
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
        "chrome,centerscreen,width=300,height=300",
        io
      );
      await io.deferred.promise;

      const options = io.dataOut;
      await this._Addon.knowledge.exportNoteToFile(
        message.content.editorInstance._item,
        options.embedLink,
        options.embedImage,
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
          "Better Notes",
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
        let link = this._Addon.knowledge.getLinkFromText(text);

        if (link) {
          const note = (await this._Addon.knowledge.getNoteFromLink(link)).item;
          if (note && note.id) {
            await this.onEditorEvent(
              new EditorMessage("onNoteLink", {
                params: {
                  item: note,
                  infoText: "OK",
                },
              })
            );
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
      const tags = annotationItem.getTags();
      for (const tag of tags) {
        note.addTag(tag.tag, tag.type);
      }
      await note.saveTx();

      annotationItem.annotationComment = `${
        annotationItem.annotationComment ? annotationItem.annotationComment : ""
      }\nnote link: "${this._Addon.knowledge.getNoteLink(note)}"`;
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
      while (
        (!noteEditor.getCurrentInstance || !noteEditor.getCurrentInstance()) &&
        t < 500
      ) {
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
    let templatesRaw: string = Zotero.Prefs.get(
      "Knowledge4Zotero.noteTemplate"
    );
    if (!templatesRaw) {
      Zotero.Prefs.set(
        "Knowledge4Zotero.noteTemplate",
        JSON.stringify([
          {
            name: "[Item] item-notes with metadata",
            text: '<h1>${topItem.getField("title")}</h1>\n<h2 style="color:red; background-color: #efe3da;">💡 Meta Data</h2>\n<table>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Title </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'title\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Journal </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getField(\'publicationTitle\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">1<sup>st</sup> Author </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'firstCreator\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Authors </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Pub. date </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'date\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">DOI </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            <a href="https://doi.org/${topItem.getField(\'DOI\')}">${topItem.getField(\'DOI\')}</a>\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Archive </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'archive\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Archive Location </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getField(\'archiveLocation\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Call No. </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'callNumber\')}\n        </td>\n    </tr>\n</table>\n${itemNotes.map((noteItem)=>{\nconst noteLine = `<h2  style="color:red; background-color: #efe3da;">📜 Note:  <a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(noteItem)}" rel="noopener noreferrer nofollow">${noteItem.key}</a></h2>\n<blockquote>\n    ${noteItem.getNote()}\n    <p style="background-color: pink;"><strong>Merge Date: </strong> ${new Date().toISOString().substr(0,10)+" "+ new Date().toTimeString()}</p>\n</blockquote>\n<p style="color:red; background-color: #efe3da;"><strong>📝 Comments</strong></p>\n<blockquote>\n    <p>Make your comments</p>\n    <p></p>\n</blockquote>`;\ncopyNoteImage(noteItem);\nreturn noteLine;\n}).join("\\n")}\n',
            disabled: false,
          },
          {
            name: "[Note] with metadata",
            text: "<p><span style=\"background-color: #ffd40080\">Note: ${link}</span></p>\n${topItem?`<p>Title: ${topItem.getField('title')}</p>\\n<p>Author: ${topItem.getField('firstCreator')}</p>\\n<p>Date: ${topItem.getField('date')}</p>`:''}",
            disabled: false,
          },
          {
            name: "[Text] today",
            text: "<h1>TODO: ${new Date().toLocaleDateString()}</h1>\n<h2>Tasks</h2>\n<ul>\n<li>\nRead Paper 1\n</li>\n<li>\nDo some experiments\n</li>\n</ul>\n<blockquote>\n<p>Insert more items with meta-data in workspace window-&gt;Edit</p>\n</blockquote>\n<p></p>\n<h2>Done Tasks</h2>\n<p></p>\n<h2>Todo Tomorrow</h2>\n<p></p>\n</div>",
            disabled: false,
          },
        ])
      );
    }
  }
}

export default AddonEvents;
