import { AddonBase, EditorMessage } from "./base";

class AddonEvents extends AddonBase {
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  public async onInit() {
    Zotero.debug("Knowledge4Zotero: init called");
    this.addNoteInstanceListener();
    this.resetState();
  }

  public addNoteInstanceListener() {
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
    let editor: Element = await this._Addon.views.getEditor(instance);
    editor.addEventListener(event, (e: XULEvent) => {
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
        new EditorMessage("addToKnowledge", {})
      );
      this.addEditorEventListener(
        message.content.editorInstance,
        "click",
        new EditorMessage("noteEditorClick", {})
      );
    } else if (message.type === "addToKnowledge") {
      /*
        message.content = {
          editorInstance
        }
        */
      // TODO: Complete this part
      Zotero.debug("Knowledge4Zotero: addToKnowledge");
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
        return;
      }
      let urlIndex = el.innerHTML.search(/zotero:\/\/note\//g);
      if (urlIndex >= 0) {
        let noteID = parseInt(
          el.innerHTML.substring(urlIndex + "zotero://note/".length)
        );
        let note = Zotero.Items.get(noteID);
        if (note && note.isNote()) {
          // TODO: Open note
          Zotero.debug(`Knowledge4Zotero: noteEditorClick ${note.id}`);
        }
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
