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
        if (event == "modify") {
          Zotero.debug("Knowledge4Zotero: main knowledge midified.");
          this._Addon.views.buildOutline();
        }
      },
    };
  }

  public async onInit() {
    Zotero.debug("Knowledge4Zotero: init called");
    await Zotero.uiReadyPromise;
    this._Addon.views.addOpenWorkspaceButton();
    this.addEditorInstanceListener();
    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "item",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      function (e) {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
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
    if (message.type === "openWorkspace") {
      /*
        message.content = {}
      */
      await this._Addon.knowledge.openWorkspaceWindow();
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
        isMainKnowledge
          ? "Edit the main knowledge in Workspace"
          : "Open Workspace",
        "openWorkspace",
        "start"
      );
      const addLinkDropDown: Element = await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-addlink",
        "addToKnowledge",
        "Add Note Link to Knowledge Workspace",
        "addToKnowledge",
        "middle"
      );
      const buttonParam = [];
      const nodes = this._Addon.knowledge.getNoteTreeAsList(undefined);
      for (let node of nodes) {
        buttonParam.push({
          id: `knowledge-addlink-popup-${node.model.endIndex}`,
          text: node.model.name,
          eventType: "addToKnowledgeLine",
        });
      }
      addLinkDropDown.addEventListener("mouseover", async (e) => {
        if (addLinkDropDown.getElementsByClassName("popup").length > 0) {
          return;
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
        "Export Markdown with linked Notes",
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
        header.setAttribute("title", "This is a Main Knowledge");
        header.innerHTML = "Main Knowledge";
        header.setAttribute("style", "font-size: medium");
        middle.append(header);
      } else {
        // This is a preview knowledge, hide openWorkspace button add show close botton
        this._Addon.views.changeEditorButtonView(
          _window.document.getElementById("knowledge-start"),
          "jumpAttachment",
          "Open Note Attachments",
          "jumpAttachment"
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
    } else if (message.type === "setMainKnowledge") {
      /*
        message.content = {
          params: itemID
        }
      */
      Zotero.debug("Knowledge4Zotero: setMainKnowledge");
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      let itemID = message.content.params;
      if (itemID === mainKnowledgeID) {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          "Already a main Knowledge."
        );
      } else if (!Zotero.Items.get(itemID).isNote()) {
        this._Addon.views.showProgressWindow(
          "Knowledge",
          "Not a valid note item."
        );
      } else {
        if (Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
          let confirmChange = confirm(
            "Will change current Knowledge Workspace. Confirm?"
          );
          if (!confirmChange) {
            return;
          }
        }
        Zotero.Prefs.set("Knowledge4Zotero.mainKnowledgeID", itemID);
        await this._Addon.knowledge.setWorkspaceNote("main");
        for (let editor of Zotero.Notes._editorInstances) {
          await editor._initPromise;
          let isMainKnowledge = editor._item.id === mainKnowledgeID;
          let button =
            editor._iframeWindow.document.getElementById("knowledge-start");
          if (button) {
            this._Addon.views.changeEditorButtonView(
              button,
              isMainKnowledge ? "isMainKnowledge" : "notMainKnowledge",
              isMainKnowledge
                ? "Edit the main knowledge in Workspace"
                : "Open Workspace"
            );
          }
        }
      }
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
        let focusNode =
          message.content.editorInstance._iframeWindow.document.getSelection()
            .focusNode;
        if (!focusNode) {
          return;
        }

        function getChildIndex(node: Node) {
          return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
        }

        // Make sure this is a direct child node of editor
        try {
          while (
            !focusNode.parentElement.className ||
            focusNode.parentElement.className.indexOf("primary-editor") === -1
          ) {
            focusNode = focusNode.parentNode;
          }
        } catch (e) {
          return;
        }

        let currentLineIndex = getChildIndex(focusNode);
        this._Addon.knowledge.currentLine = currentLineIndex;
        Zotero.debug(`Knowledge4Zotero: line ${currentLineIndex} selected.`);
      }
    } else if (message.type === "export") {
      /*
        message.content = {
          editorInstance
        }
      */
      await this._Addon.knowledge.exportNoteToFile(
        message.content.editorInstance._item
      );
    } else if (message.type === "jumpAttachment") {
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
        )) {
          Zotero.debug(attchment);
          try {
            await Zotero.OpenPDF.openToPage(attchment);
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
    } else {
      Zotero.debug(`Knowledge4Zotero: message not handled.`);
    }
  }

  private resetState(): void {
    // Reset preferrence state.
  }
}

export default AddonEvents;
