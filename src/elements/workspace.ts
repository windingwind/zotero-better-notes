import { config } from "../../package.json";
import { waitUtilAsync } from "../utils/wait";
import { PluginCEBase } from "./base";
import { ContextPane } from "./context";
import { OutlinePane } from "./outlinePane";

export class Workspace extends PluginCEBase {
  _item?: Zotero.Item;

  _editorElement!: EditorElement;
  _outline!: OutlinePane;
  _context!: ContextPane;

  get content() {
    return this._parseContentID(
      MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace.css"
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
    this.dataset.uid = Zotero.Utilities.randomString(8);

    this._addon.data.workspace.instances[this.dataset.uid] = new WeakRef(this);

    this._outline = this._queryID("left-container") as unknown as OutlinePane;
    this._editorElement = this._queryID("editor-main") as EditorElement;
    this._outline._editorElement = this._editorElement;

    this._context = this._queryID("right-container") as unknown as ContextPane;

    this._loadPersist();
  }

  destroy(): void {}

  async render() {
    await this._outline.render();
    await this.updateEditor();
    await this._context.render();
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
}
