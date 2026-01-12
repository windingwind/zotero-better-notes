import { config } from "../../package.json";

export { getWorkspaceByUID, getWorkspaceUID, OutlineType, VirtualWorkspace };

enum OutlineType {
  empty = 0,
  treeView,
  mindMap,
  bubbleMap,
}

function getWorkspaceUID(element: Element): string | undefined {
  const win = element.ownerDocument.defaultView as any;
  // There can be fake Zotero_Tabs added by contextPane.ts
  if (win?.Zotero_Tabs?.getTabInfo) {
    return win.Zotero_Tabs.getTabInfo().id;
  }
  const workspace = element.closest("bn-workspace") as HTMLElement | undefined;
  if (workspace?.dataset.uid) {
    return workspace.dataset.uid;
  }
  return undefined;
}

function getWorkspaceByUID(uid: string): VirtualWorkspace | undefined {
  if (uid.startsWith("tab-")) {
    return new WorkspaceTab(uid);
  }
  const workspace = addon.data.workspace.instances[uid]?.deref();
  if (!workspace?.ownerDocument) {
    delete addon.data.workspace.instances[uid];
    return undefined;
  }
  return workspace as unknown as VirtualWorkspace;
}

interface VirtualWorkspace {
  uid: string;
  item: Zotero.Item | undefined;
  editor: Zotero.EditorInstance;

  scrollEditorTo(options: { lineIndex?: number; sectionName?: string }): void;

  toggleOutline(open?: boolean): void;

  toggleContext(open?: boolean): void;

  scrollToPane(key: string): void;

  getPreviewEditor(itemID: number): EditorElement | undefined;
}

class WorkspaceTab implements VirtualWorkspace {
  uid: string;
  _addon: typeof addon;

  constructor(tabID: string) {
    this.uid = tabID;
    // @ts-ignore
    this._addon = Zotero[config.addonInstance];
  }

  get _tabContent(): XULBoxElement {
    const tabContent = Zotero.getMainWindow().document.querySelector(
      `#${this.uid}`,
    );
    if (!tabContent) {
      throw new Error(`WorkspaceTab: Tab content ${this.uid} not found.`);
    }
    return tabContent as XULBoxElement;
  }

  get item(): Zotero.Item | undefined {
    return Zotero.Items.get(
      Zotero.getMainWindow().Zotero_Tabs.getTabInfo(this.uid).data.itemID,
    );
  }

  get editor(): Zotero.EditorInstance {
    return Zotero.Notes.getByTabID(this.uid)!;
  }

  scrollEditorTo(options: { lineIndex?: number; sectionName?: string }): void {
    if (typeof options.lineIndex === "number") {
      this._addon.api.editor.scroll(this.editor, options.lineIndex);
    }
    if (typeof options.sectionName === "string") {
      this._addon.api.editor.scrollToSection(this.editor, options.sectionName);
    }
  }

  toggleContext(open?: boolean): void {
    Zotero.getMainWindow().ZoteroContextPane.collapsed = !open;
  }

  toggleOutline(open?: boolean): void {}

  scrollToPane(key: string) {
    const itemDetails =
      Zotero.getMainWindow().ZoteroContextPane.context._getItemContext(
        this.uid,
      );
    return itemDetails.scrollToPane(key);
  }

  getPreviewEditor(itemID: number): EditorElement | undefined {
    const itemDetails =
      Zotero.getMainWindow().ZoteroContextPane.context._getItemContext(
        this.uid,
      );
    return itemDetails.querySelector(
      `note-editor[data-id="${itemID}"]`,
    ) as EditorElement;
  }
}
