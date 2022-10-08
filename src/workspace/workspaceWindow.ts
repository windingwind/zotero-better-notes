import Knowledge4Zotero from "../addon";
import { EditorMessage, OutlineType } from "../utils";
import AddonBase from "../module";

class WorkspaceWindow extends AddonBase {
  private _initIframe: ZoteroPromise;
  public workspaceWindow: Window;
  public workspaceTabId: string;
  public workspaceNoteEditor: Zotero.EditorInstance | undefined;
  public previewItemID: number;
  private _firstInit: boolean;
  public _workspacePromise: ZoteroPromise;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this._initIframe = Zotero.Promise.defer();
    this.workspaceTabId = "";
    this._firstInit = true;
  }

  public getWorkspaceWindow(): Window | undefined {
    if (this.workspaceWindow && !this.workspaceWindow.closed) {
      return this.workspaceWindow;
    }
    return undefined;
  }

  async openWorkspaceWindow(
    type: "window" | "tab" = "tab",
    reopen: boolean = false,
    select: boolean = true
  ) {
    if (this.getWorkspaceWindow()) {
      if (!reopen) {
        Zotero.debug("openWorkspaceWindow: focus");
        if (this.workspaceTabId !== "WINDOW") {
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
    this._workspacePromise = Zotero.Promise.defer();
    this._firstInit = true;
    if (type === "window") {
      Zotero.debug("openWorkspaceWindow: as window");
      this._initIframe = Zotero.Promise.defer();
      let win = window.open(
        "chrome://Knowledge4Zotero/content/workspace.xul",
        "_blank",
        "chrome,extrachrome,menubar,resizable,scrollbars,status,width=1000,height=600"
      );
      this.workspaceWindow = win as Window;
      this.workspaceTabId = "WINDOW";
      await this.waitWorkspaceReady();
      this.setWorkspaceNote("main");
      this._Addon.NoteUtils.currentLine[this.getWorkspaceNote().id] = -1;
      this.initKnowledgeWindow();
      this._Addon.WorkspaceOutline.switchView(OutlineType.treeView);
      this._Addon.WorkspaceOutline.updateOutline();
      this._Addon.ZoteroViews.updateAutoInsertAnnotationsMenu();
    } else {
      Zotero.debug("openWorkspaceWindow: as tab");
      this._initIframe = Zotero.Promise.defer();
      // Avoid sidebar show up
      Zotero_Tabs.jump(0);
      let { id, container } = Zotero_Tabs.add({
        type: "betternotes",
        title: Zotero.locale.includes("zh") ? "工作区" : "Workspace",
        index: 1,
        data: {},
        select: select,
        onClose: () => (this.workspaceTabId = ""),
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

      this._Addon.ZoteroViews.hideMenuBar(this.workspaceWindow.document);

      this._Addon.NoteUtils.currentLine[this.getWorkspaceNote().id] = -1;
      this.initKnowledgeWindow();
      this._Addon.WorkspaceOutline.switchView(OutlineType.treeView);
      this._Addon.WorkspaceOutline.updateOutline();
    }
  }

  public closeWorkspaceWindow() {
    if (this.getWorkspaceWindow()) {
      if (this.workspaceTabId !== "WINDOW") {
        Zotero_Tabs.close(this.workspaceTabId);
      } else {
        (this.getWorkspaceWindow() as Window).close();
      }
    }
    this.workspaceTabId = "";
  }

  public async waitWorkspaceReady() {
    let _window = this.getWorkspaceWindow() as Window;
    if (!_window) {
      return false;
    }
    let t = 0;
    await this._workspacePromise.promise;
    return true;
  }

  public initKnowledgeWindow() {
    this.workspaceWindow.addEventListener(
      "message",
      (e) => this.messageHandler(e),
      false
    );
    this._Addon.WorkspaceOutline.currentOutline = OutlineType.treeView;
    this.workspaceWindow.document
      .getElementById("outline-switchview")
      .addEventListener("click", async (e) => {
        this._Addon.WorkspaceOutline.switchView();
      });
    this.workspaceWindow.addEventListener("resize", (e) =>
      this._Addon.WorkspaceOutline.resizeOutline()
    );
    this.workspaceWindow.document
      .getElementById("outline-splitter")
      .addEventListener("mouseup", async (e) => {
        this._Addon.WorkspaceOutline.resizeOutline();
      });
    this.workspaceWindow.addEventListener("close", (e) => {
      this.workspaceWindow = undefined;
      this.workspaceTabId = "";
      this._Addon.ZoteroViews.updateAutoInsertAnnotationsMenu();
    });
  }

  private async messageHandler(e) {
    Zotero.debug(`Knowledge4Zotero: view message ${e.data.type}`);
    console.log(`Knowledge4Zotero: view message ${e.data.type}`);
    if (e.data.type === "ready") {
      this._initIframe.resolve();
    } else if (e.data.type === "getMindMapData") {
      this._Addon.WorkspaceOutline.updateOutline();
    } else if (e.data.type === "jumpNode") {
      this._Addon.events.onEditorEvent(
        new EditorMessage("jumpNode", {
          params: e.data,
        })
      );
    } else if (e.data.type === "jumpNote") {
      Zotero.debug(e.data);
      this._Addon.events.onEditorEvent(
        new EditorMessage("onNoteLink", {
          params: await this._Addon.NoteUtils.getNoteFromLink(e.data.link),
        })
      );
    } else if (e.data.type === "moveNode") {
      this._Addon.events.onEditorEvent(
        new EditorMessage("moveNode", {
          params: e.data,
        })
      );
    }
  }

  public async getWorkspaceEditor(type: "main" | "preview" = "main") {
    let _window = this._Addon.WorkspaceWindow.getWorkspaceWindow() as Window;
    if (!_window) {
      return;
    }
    await this._Addon.WorkspaceWindow.waitWorkspaceReady();
    return _window.document.getElementById(`zotero-note-editor-${type}`);
  }

  getWorkspaceNote(): Zotero.Item {
    return Zotero.Items.get(
      Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID") as number
    ) as Zotero.Item;
  }

  async getWorkspaceEditorInstance(
    type: "main" | "preview" = "main",
    wait: boolean = true
  ): Promise<Zotero.EditorInstance | undefined> {
    let noteEditor = (await this.getWorkspaceEditor(type)) as any;
    if (!noteEditor) {
      return;
    }
    let t = 0;
    while (wait && !noteEditor.getCurrentInstance() && t < 500) {
      t += 1;
      await Zotero.Promise.delay(10);
    }
    this.workspaceNoteEditor =
      noteEditor.getCurrentInstance() as Zotero.EditorInstance;
    return this.workspaceNoteEditor;
  }

  getEditorInstance(note: Zotero.Item) {
    // If there are multiple editors of main note available, we use the workspace editor.
    if (
      note.id === this.getWorkspaceNote().id &&
      this.getWorkspaceWindow() &&
      this.workspaceNoteEditor &&
      !Components.utils.isDeadWrapper(this.workspaceNoteEditor._iframeWindow)
    ) {
      return this.workspaceNoteEditor;
    }
    const editor = (
      Zotero.Notes._editorInstances as Zotero.EditorInstance[]
    ).find(
      (e) =>
        e._item.id === note.id &&
        !Components.utils.isDeadWrapper(e._iframeWindow)
    );
    if (note.id === this.getWorkspaceNote().id) {
      this.workspaceNoteEditor = editor;
    }
    return editor;
  }

  async setWorkspaceNote(
    type: "main" | "preview" = "main",
    note: Zotero.Item | undefined = undefined,
    showPopup: boolean = true
  ) {
    let _window = this.getWorkspaceWindow() as Window;
    note = note || this.getWorkspaceNote();
    if (!_window) {
      return;
    }
    if (type === "preview") {
      const splitter = _window.document.getElementById("preview-splitter");
      splitter && splitter.setAttribute("state", "open");
      this.previewItemID = note.id;
    } else {
      // Set line to default
      this._Addon.NoteUtils.currentLine[note.id] = -1;
      if (Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID") !== note.id) {
        Zotero.Prefs.set("Knowledge4Zotero.mainKnowledgeID", note.id);
      }
    }
    await this.waitWorkspaceReady();
    let noteEditor: any = await this.getWorkspaceEditor(type);
    if (!noteEditor._initialized) {
      noteEditor._iframe.contentWindow.addEventListener(
        "drop",
        (event) => {
          noteEditor._iframe.contentWindow.wrappedJSObject.droppedData =
            Components.utils.cloneInto(
              {
                "text/plain": event.dataTransfer.getData("text/plain"),
                "text/html": event.dataTransfer.getData("text/html"),
                "zotero/annotation":
                  event.dataTransfer.getData("zotero/annotation"),
                "zotero/item": event.dataTransfer.getData("zotero/item"),
              },
              noteEditor._iframe.contentWindow
            );
        },
        true
      );
      noteEditor._initialized = true;
    }
    noteEditor.mode = "edit";
    noteEditor.viewMode = "library";
    noteEditor.parent = null;
    noteEditor.item = note;
    if (!noteEditor || !noteEditor.getCurrentInstance()) {
      await noteEditor.initEditor();
    }

    await noteEditor._editorInstance._initPromise;
    const position = (
      this._Addon.EditorViews.getEditorElement(
        noteEditor._editorInstance._iframeWindow.document
      ).parentNode as HTMLElement
    ).scrollTop;
    // Due to unknown reasons, only after the second init the editor will be correctly loaded.
    // Thus we must init it twice
    if (this._firstInit) {
      this._firstInit = false;
      await noteEditor.initEditor();
    }
    this._Addon.EditorViews.scrollToPosition(
      noteEditor._editorInstance,
      position
    );
    if (type === "main") {
      this._Addon.WorkspaceOutline.updateOutline();
      this._Addon.ZoteroViews.updateWordCount();
      const recentMainNotes = Zotero.Items.get(
        new Array(
          ...new Set(
            (
              Zotero.Prefs.get("Knowledge4Zotero.recentMainNoteIds") as string
            ).split(",")
          )
        )
      ) as Zotero.Item[];
      recentMainNotes.splice(0, 0, note);
      Zotero.Prefs.set(
        "Knowledge4Zotero.recentMainNoteIds",
        new Array(...new Set(recentMainNotes.map((item) => String(item.id))))
          .slice(0, 10)
          .filter((id) => id)
          .join(",")
      );
      if (showPopup) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          `Set main Note to: ${note.getNoteTitle()}`
        );
      }
    }
  }
}

export default WorkspaceWindow;
