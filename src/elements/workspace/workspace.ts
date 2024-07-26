import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import {
  getPrefJSON,
  registerPrefObserver,
  setPref,
  unregisterPrefObserver,
} from "../../utils/prefs";
import { waitUtilAsync } from "../../utils/wait";
import { PluginCEBase } from "../base";
import { ContextPane } from "./contextPane";
import { OutlinePane } from "./outlinePane";

const persistKey = "persist.workspace";

export class Workspace extends PluginCEBase {
  uid: string = Zotero.Utilities.randomString(8);
  _item?: Zotero.Item;

  _prefObserverID!: symbol;

  _editorElement!: EditorElement;
  _outline!: OutlinePane;
  _editorContainer!: XUL.Box;
  _context!: ContextPane;

  _leftSplitter!: XUL.Splitter;
  _rightSplitter!: XUL.Splitter;

  resizeOb!: ResizeObserver;

  get content() {
    return this._parseContentID(
      MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace/workspace.css"
  ></html:link>
</linkset>
<hbox id="top-container" class="container">
  <bn-outline id="left-container" class="container" zotero-persist="width">
  </bn-outline>
  <splitter
    id="left-splitter"
    collapse="before"
    zotero-persist="state"
  ></splitter>
  <vbox id="center-container" class="container" zotero-persist="width">
    <note-editor id="editor-main" class="container"></note-editor>
  </vbox>
  <splitter
    id="right-splitter"
    collapse="after"
    zotero-persist="state"
  ></splitter>
  <bn-context id="right-container" class="container" zotero-persist="width"></bn-context>
</hbox>  
`),
    );
  }

  get containerType() {
    return this.getAttribute("container-type") || "";
  }

  set containerType(val: string) {
    this.setAttribute("container-type", val);
  }

  get item() {
    return this._item;
  }

  set item(val) {
    if (!val) return;
    this._addon.api.relation.updateNoteLinkRelation(val.id);
    this._item = val;
    this._outline.item = val;
    this._context.item = val;
  }

  get editor() {
    return this._editorElement._editorInstance;
  }

  init(): void {
    // MozXULElement.insertFTLIfNeeded(`${config.addonRef}-workspace.ftl`);

    // For note preview section enabled decision
    this.dataset.uid = this.uid;
    this._addon.data.workspace.instances[this.uid] = new WeakRef(this);

    this._outline = this._queryID("left-container") as unknown as OutlinePane;

    this._editorContainer = this._queryID("center-container") as XUL.Box;
    this._editorElement = this._queryID("editor-main") as EditorElement;
    this._outline._editorElement = this._editorElement;

    this._context = this._queryID("right-container") as unknown as ContextPane;

    this._leftSplitter = this._queryID("left-splitter") as XUL.Splitter;
    this._rightSplitter = this._queryID("right-splitter") as XUL.Splitter;

    this._leftSplitter.addEventListener("mouseup", () => {
      this._persistState();
    });
    this._rightSplitter.addEventListener("mouseup", () => {
      this._persistState();
    });

    this._initEditor();

    this.resizeOb = new ResizeObserver(() => {
      if (!this.editor) return;
      this._addon.api.editor.scroll(
        this.editor,
        this._addon.api.editor.getLineAtCursor(this.editor),
      );
    });
    this.resizeOb.observe(this._editorElement);

    this._prefObserverID = registerPrefObserver(
      persistKey,
      this._restoreState.bind(this),
    );
  }

  destroy(): void {
    unregisterPrefObserver(this._prefObserverID);
    this.resizeOb.disconnect();
    delete this._addon.data.workspace.instances[this.uid];
  }

  async render() {
    await this._outline.render();
    await this.updateEditor();
    await this._context.render();

    this._restoreState();
  }

  async updateEditor() {
    await waitUtilAsync(() => Boolean(this._editorElement._initialized));
    if (!this._editorElement._initialized) {
      throw new Error("initNoteEditor: waiting initialization failed");
    }
    this._editorElement.mode = "edit";
    this._editorElement.viewMode = "library";
    this._editorElement.parent = this.item?.parentItem;
    this._editorElement.item = this.item;
    await waitUtilAsync(() => Boolean(this._editorElement._editorInstance));
    await this._editorElement._editorInstance._initPromise;
    return;
  }

  scrollEditorTo(options: { lineIndex?: number; sectionName?: string } = {}) {
    if (typeof options.lineIndex === "number") {
      this._addon.api.editor.scroll(this.editor, options.lineIndex);
    }
    if (typeof options.sectionName === "string") {
      this._addon.api.editor.scrollToSection(this.editor, options.sectionName);
    }
  }

  toggleOutline(open?: boolean) {
    if (typeof open !== "boolean") {
      open = this._leftSplitter.getAttribute("state") === "collapsed";
    }

    this._leftSplitter.setAttribute("state", open ? "open" : "collapsed");
    this._persistState();
  }

  toggleContext(open?: boolean) {
    if (typeof open !== "boolean") {
      open = this._rightSplitter.getAttribute("state") === "collapsed";
    }

    this._rightSplitter.setAttribute("state", open ? "open" : "collapsed");
    this._persistState();
  }

  async _initEditor() {
    await waitUtilAsync(() => !!this._editorElement._editorInstance);
    const editor = this._editorElement._editorInstance;
    await editor._initPromise;

    const _document = editor._iframeWindow.document;
    await waitUtilAsync(() => !!_document.querySelector(".toolbar"));
    const toolbar = _document.querySelector(".toolbar") as HTMLDivElement;

    const toggleOutline = this._addon.data.ztoolkit.UI.createElement(
      _document,
      "button",
      {
        classList: ["toolbar-button"],
        properties: {
          innerHTML: ICONS.workspaceToggleLeft,
          title: "Toggle left pane",
        },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              this.toggleOutline();
            },
          },
        ],
      },
    );

    toolbar.querySelector(".start")?.append(toggleOutline);

    const toggleContext = this._addon.data.ztoolkit.UI.createElement(
      _document,
      "button",
      {
        classList: ["toolbar-button"],
        properties: {
          innerHTML: ICONS.workspaceToggleRight,
          title: "Toggle right pane",
        },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              this.toggleContext();
            },
          },
        ],
      },
    );

    toolbar.querySelector(".end")?.prepend(toggleContext);
  }

  _persistState() {
    const state = {
      leftState: this._leftSplitter.getAttribute("state"),
      rightState: this._rightSplitter.getAttribute("state"),
      leftWidth: window.getComputedStyle(this._outline)?.width,
      centerWidth: window.getComputedStyle(this._editorContainer)?.width,
      rightWidth: window.getComputedStyle(this._context)?.width,
    };
    setPref(persistKey, JSON.stringify(state));
  }

  _restoreState() {
    const state = getPrefJSON(persistKey);
    if (typeof state.leftState === "string") {
      this._leftSplitter.setAttribute("state", state.leftState);
    }
    if (typeof state.rightState === "string") {
      this._rightSplitter.setAttribute("state", state.rightState);
    }
    if (state.leftWidth) {
      this._outline.style.width = state.leftWidth;
    }
    if (state.centerWidth) {
      this._editorContainer.style.width = state.centerWidth;
    }
    if (state.rightWidth) {
      this._context.style.width = state.rightWidth;
    }
  }
}
