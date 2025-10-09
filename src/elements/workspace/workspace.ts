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
  _notifierID!: string;

  _editorElement!: EditorElement;
  _outline!: OutlinePane;
  _editorContainer!: XULBoxElement;
  _context!: ContextPane;

  _leftSplitter!: XULSplitterElement;
  _rightSplitter!: XULSplitterElement;

  resizeOb!: ResizeObserver;

  _savedScrollPosition: number | null = null;
  _isRestoring: boolean = false;

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

    this._editorContainer = this._queryID("center-container") as XULBoxElement;
    this._editorElement = this._queryID("editor-main") as EditorElement;
    this._outline._editorElement = this._editorElement;

    this._context = this._queryID("right-container") as unknown as ContextPane;

    this._leftSplitter = this._queryID("left-splitter") as XULSplitterElement;
    this._rightSplitter = this._queryID("right-splitter") as XULSplitterElement;

    this._leftSplitter.addEventListener("mouseup", () => {
      this._persistState();
    });
    this._rightSplitter.addEventListener("mouseup", () => {
      this._persistState();
    });

    this._initEditor();
    this._hookEditorNotifyMethod();

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

    // Register notifier just for potential future use
    this._notifierID = Zotero.Notifier.registerObserver(
      {
        notify: (event, type, ids, extraData) => {
          // Scroll position preservation is now handled by hooking notify method
        },
      },
      ["item"],
      "bn-workspace",
    );
  }

  destroy(): void {
    unregisterPrefObserver(this._prefObserverID);
    Zotero.Notifier.unregisterObserver(this._notifierID);
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
          innerHTML: ICONS.workspaceToggle,
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
          innerHTML: ICONS.workspaceToggle,
          title: "Toggle right pane",
        },
        styles: {
          transform: "rotate(180deg)",
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

  _hookEditorNotifyMethod() {
    // Hook the note-editor's notify method to intercept before initEditor is called
    const noteEditor = this._editorElement;
    if (!noteEditor || (noteEditor as any)._bnScrollHooked) return;

    (noteEditor as any)._bnScrollHooked = true; // Prevent double hooking

    const originalNotify = noteEditor.notify;
    const self = this;

    noteEditor.notify = async function(event: string, type: string, ids: number[], extraData: any) {
      // Check if this is a modify event for our item from another editor
      if (event === "modify" && type === "item" && self._item && ids.includes(self._item.id)) {
        const editor = self.editor;
        const isOwnEdit = editor && extraData[self._item.id]?.noteEditorID === editor.instanceID;

        // If not our own edit, save scroll position and hide iframe BEFORE notify processes
        if (!isOwnEdit && !self._isRestoring) {
          const editorInstance = self.editor;
          if (editorInstance?._iframeWindow) {
            const editorCore = editorInstance._iframeWindow.document.querySelector(".editor-core") as HTMLElement;
            if (editorCore) {
              self._savedScrollPosition = editorCore.scrollTop;
            }
          }

          const iframe = noteEditor.querySelector("iframe") as HTMLIFrameElement;
          if (iframe) {
            iframe.style.opacity = "0";
            iframe.style.pointerEvents = "none";
          }
          self._isRestoring = true;

          // Schedule restoration after notify completes
          setTimeout(async () => {
            await self._waitForEditorReady();
            if (self._savedScrollPosition !== null) {
              const editorInstance = self.editor;
              if (editorInstance?._iframeWindow) {
                const editorCore = editorInstance._iframeWindow.document.querySelector(".editor-core") as HTMLElement;
                if (editorCore) {
                  editorCore.scrollTop = self._savedScrollPosition;
                }
              }
              self._savedScrollPosition = null;
            }
            const iframe = noteEditor.querySelector("iframe") as HTMLIFrameElement;
            if (iframe) {
              iframe.style.opacity = "1";
              iframe.style.pointerEvents = "auto";
            }
            self._isRestoring = false;
          }, 0);
        }
      }

      // Call original notify
      return await originalNotify.call(this, event, type, ids, extraData);
    };
  }

  async _waitForEditorReady(): Promise<void> {
    const maxAttempts = 50; // Maximum 5 seconds (50 * 100ms)
    let attempts = 0;

    return new Promise((resolve) => {
      const checkEditor = () => {
        attempts++;

        try {
          const editor = this.editor;
          if (editor?._iframeWindow && editor._initPromise) {
            // Wait for editor initialization promise
            editor._initPromise.then(() => {
              // Give it a bit more time for DOM to settle
              setTimeout(() => resolve(), 100);
            }).catch(() => {
              // If promise fails, still resolve to avoid hanging
              resolve();
            });
            return;
          }
        } catch (e) {
          // Ignore errors during checking
        }

        if (attempts >= maxAttempts) {
          // Timeout, resolve anyway
          resolve();
          return;
        }

        // Check again after 100ms
        setTimeout(checkEditor, 100);
      };

      checkEditor();
    });
  }
}
