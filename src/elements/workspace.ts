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
    const editorElem = this._queryID("editor-main") as EditorElement;
    await waitUtilAsync(() => Boolean(editorElem._initialized));
    if (!editorElem._initialized) {
      throw new Error("initNoteEditor: waiting initialization failed");
    }
    editorElem.mode = "edit";
    editorElem.viewMode = "library";
    editorElem.parent = this.item?.parentItem;
    editorElem.item = this.item;
    await waitUtilAsync(() => Boolean(editorElem._editorInstance));
    await editorElem._editorInstance._initPromise;
    // Hide BN toolbar
    editorElem._editorInstance._iframeWindow.document.body.setAttribute(
      "no-bn-toolbar",
      "true",
    );
    // TODO: implement jump to
    // if (typeof options.lineIndex === "number") {
    //   addon.api.editor.scroll(editorElem._editorInstance, options.lineIndex);
    // }
    // if (typeof options.sectionName === "string") {
    //   addon.api.editor.scrollToSection(
    //     editorElem._editorInstance,
    //     options.sectionName,
    //   );
    // }
    return;
  }
}
