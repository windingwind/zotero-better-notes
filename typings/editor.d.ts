/* eslint-disable @typescript-eslint/ban-types */
declare interface EditorCore {
  debouncedUpdate: Function;
  disableDrag: boolean;
  docChanged: boolean;
  isAttachmentNote: false;
  metadata: {
    _citationItems: { itemData: { [k: string]: any } }[];
    uris: string[];
  };
  nodeViews: any[];
  onUpdateState: Function;
  options: {
    isAttachmentNote: false;
    onImportImages: Function;
    onInsertObject: Function;
    onOpenAnnotation: Function;
    onOpenCitationPage: Function;
    onOpenCitationPopup: Function;
    onOpenContextMenu: Function;
    onOpenURL: Function;
    onShowCitationItem: Function;
    onSubscribe: Function;
    onUnsubscribe: Function;
    onUpdate: Function;
    onUpdateCitationItemsList: Function;
    placeholder: boolean;
    readOnly: boolean;
    reloaded: boolean;
    smartQuotes: boolean;
    unsaved: boolean;
    value: string;
  };
  pluginState: { [k: string]: any };
  provider: import("react").Provider;
  readOnly: boolean;
  reloaded: boolean;
  view: import("prosemirror-view").EditorView & {
    docView: NodeViewDesc;
  };
}

declare type EditorAPI =
  typeof import("../src/extras/editorScript").BetterNotesEditorAPI;

declare interface EditorElement extends XULBoxElement {
  _iframe: HTMLIFrameElement;
  _editorInstance: Zotero.EditorInstance;
  _initialized?: boolean;
  mode?: "edit" | "view";
  viewMode?: string;
  parent?: Zotero.Item;
  item?: Zotero.Item;
  getCurrentInstance(): Zotero.EditorInstance;
  initEditor(): Promise<void>;
}
