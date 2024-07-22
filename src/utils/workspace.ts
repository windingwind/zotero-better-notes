import { Workspace } from "../elements/workspace/workspace";

export { getWorkspaceByTabID, getWorkspaceByUID, OutlineType };

enum OutlineType {
  empty = 0,
  treeView,
  mindMap,
  bubbleMap,
}

function getWorkspaceByUID(uid: string): Workspace | undefined {
  const workspace = addon.data.workspace.instances[uid]?.deref();
  if (!workspace?.ownerDocument) {
    delete addon.data.workspace.instances[uid];
    return undefined;
  }
  return workspace as Workspace;
}

function getWorkspaceByTabID(tabID?: string): Workspace | undefined {
  const win = Zotero.getMainWindow();
  if (!tabID) {
    const _Zotero_Tabs = win.Zotero_Tabs as typeof Zotero_Tabs;
    if (_Zotero_Tabs.selectedType !== "note") return;
    tabID = Zotero_Tabs.selectedID;
  }
  const workspace = Zotero.getMainWindow().document.querySelector(
    `#${tabID} > bn-workspace`,
  );
  if (!workspace) return;
  return workspace as Workspace;
}
