import type { OutlinePane } from "../../elements/workspace/outlinePane";
import { getWorkspaceByUID, WorkspaceTab } from "../../utils/workspace";

export function patchNotes() {
  Zotero.Notes.toggleSidebar = function (open: boolean) {
    const win = Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const tabID = win.Zotero_Tabs.selectedID;
    const workspace = getWorkspaceByUID(tabID);
    if (!workspace) {
      return;
    }
    workspace.toggleOutline(open);
  };

  Zotero.Notes.setSidebarWidth = function (width: number) {
    const win = Zotero.getMainWindow();
    if (!win) {
      return;
    }
    const tabID = win.Zotero_Tabs.selectedID;
    const workspace = getWorkspaceByUID(tabID) as WorkspaceTab;
    if (!workspace) {
      return;
    }
    workspace.toggleOutline(width);
  };
}
