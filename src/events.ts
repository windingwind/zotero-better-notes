import { AddonBase, EditorMessage } from "./base";

class AddonEvents extends AddonBase {
  constructor(parent: Notero) {
    super(parent);
  }

  public async onInit() {
    Zotero.debug("Notero: init called");
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

  public async onEditorEvent(message: EditorMessage) {
    Zotero.debug(`Notero: onEditorEvent\n${String(message)}`);
    switch (message.type) {
      case "addNoteInstance":
        let mainKnowledgeID = parseInt(
          Zotero.Prefs.get("Notero.mainKnowledgeID")
        );
        await message.content.editorInstance._initPromise;

        if (message.content.editorInstance._item.id !== mainKnowledgeID) {
          Zotero.debug(`Notero: main Knowledge`);
          this._Addon.views.addEditorButton(
            message.content.editorInstance,
            "setMainKnowledge",
            "Use Current Note as Knowledge Workspace",
            new EditorMessage("setMainKnowledge", {})
          );
          this._Addon.views.addEditorButton(
            message.content.editorInstance,
            "addToKnowledge",
            "Add Note Link to Knowledge Workspace",
            new EditorMessage("addToKnowledge", {})
          );
        }
        break;

      case "addToKnowledge":
        /*
        message.content = {
          editorInstance
        }
        */
        // TODO: Complete this part
        Zotero.debug("Notero: addToKnowledge");
        break;
      case "setMainKnowledge":
        /*
        message.content = {
          editorInstance
        }
        */
        // TODO: Complete this part
        Zotero.debug("Notero: addToKnowledge");
        if (Zotero.Prefs.get("Notero.mainKnowledgeID")) {
          let confirmChange = confirm(
            "Will remove current Knowledge Workspace. Confirm?"
          );
          if (!confirmChange) {
            return;
          }
        }
        Zotero.Prefs.set(
          "Notero.mainKnowledgeID",
          message.content.editorInstance._item.id
        );
        // Set the button to selected state
        this._Addon.views.changeEditorButton(
          message.content.event.target,
          "isMainKnowledge",
          "This Note is Knowledge Workspace"
        );
        // TODO: update workspace window here
        break;
      default:
        break;
    }
  }

  private resetState(): void {
    // Reset preferrence state.
  }
}

export default AddonEvents;
