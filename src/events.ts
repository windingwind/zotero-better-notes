import { AddonBase, EditorMessage } from "./base";
import { Knowledge } from "./knowledge";

class AddonEvents extends AddonBase {
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  public async onInit() {
    Zotero.debug("Knowledge4Zotero: init called");
    this._Addon.knowledge = new Knowledge();
    this.addEditorInstanceListener();
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
    Zotero.debug(
      `Knowledge4Zotero: onEditorEvent\n${message.type}\n${message.content}`
    );
    if (message.type === "addNoteInstance") {
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      await message.content.editorInstance._initPromise;

      let isMainKnowledge =
        message.content.editorInstance._item.id === mainKnowledgeID;

      Zotero.debug(`Knowledge4Zotero: main Knowledge`);
      this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "mainKnowledge",
        isMainKnowledge ? "isMainKnowledge" : "setMainKnowledge",
        isMainKnowledge
          ? "This Note is Knowledge Workspace"
          : "Use Current Note as Knowledge Workspace",
        new EditorMessage("setMainKnowledge", {})
      );
      this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "addToKnowledge",
        "addToKnowledge",
        "Add Note Link to Knowledge Workspace",
        new EditorMessage("addToKnowledge", {
          itemID: message.content.editorInstance._item.id,
        })
      );
      this.addEditorEventListener(
        message.content.editorInstance,
        "click",
        new EditorMessage("noteEditorClick", {})
      );
      if (!message.content.editorInstance._knowledgeSelectionInitialized) {
        this.addEditorDocumentEventListener(
          message.content.editorInstance,
          "selectionchange",
          new EditorMessage("noteEditorSelectionChange", {})
        );
        message.content.editorInstance._knowledgeSelectionInitialized = true;
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
        -1,
        message.content.editorInstance._item.id
      );
    } else if (message.type === "setMainKnowledge") {
      /*
        message.content = {
          editorInstance
        }
        */
      // TODO: Complete this part
      Zotero.debug("Knowledge4Zotero: setMainKnowledge");
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      if (message.content.editorInstance._item.id !== mainKnowledgeID) {
        if (Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
          let confirmChange = confirm(
            "Will remove current Knowledge Workspace. Confirm?"
          );
          if (!confirmChange) {
            return;
          }
        }
        Zotero.Prefs.set(
          "Knowledge4Zotero.mainKnowledgeID",
          message.content.editorInstance._item.id
        );
        // Set the button to selected state
        this._Addon.views.changeEditorButton(
          message.content.event.target,
          "isMainKnowledge",
          "This Note is Knowledge Workspace"
        );
        // TODO: update workspace window here
        for (let editor of Zotero.Notes._editorInstances) {
          await editor._initPromise;
          if (editor._item.id === mainKnowledgeID) {
            let button =
              editor._iframeWindow.document.getElementById("mainKnowledge");
            if (button) {
              this._Addon.views.changeEditorButton(
                button,
                "setMainKnowledge",
                "Use Current Note as Knowledge Workspace"
              );
            }
          }
        }
      }
    } else if (message.type === "noteEditorClick") {
      let el: XUL.Element = message.content.event.target;
      if (el.children.length !== 0) {
        // This is not a line element
        return;
      }
      if (
        el.tagName === "A" &&
        (el as HTMLLinkElement).href.search(/zotero:\/\/note\//g) >= 0
      ) {
        let urlIndex = (el as HTMLLinkElement).href.search(
          /zotero:\/\/note\//g
        );
        if (urlIndex >= 0) {
          let noteID = parseInt(
            (el as HTMLLinkElement).href.substring(
              urlIndex + "zotero://note/".length
            )
          );
          let note = Zotero.Items.get(noteID);
          if (note && note.isNote()) {
            // TODO: Open note
            Zotero.debug(`Knowledge4Zotero: noteEditorClick ${note.id}`);
          }
        }
      }
    } else if (message.type === "onNoteLink") {
      // TODO: Open note
      Zotero.debug(
        `Knowledge4Zotero: onNoteLink ${message.content.params.item}`
      );
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
    } else {
      Zotero.debug(`Knowledge4Zotero: message not handled.`);
    }
  }

  private resetState(): void {
    // Reset preferrence state.
  }
}

export default AddonEvents;
