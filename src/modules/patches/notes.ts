import { PatchHelper } from "zotero-plugin-toolkit";
import { getWorkspaceByUID, WorkspaceTab } from "../../utils/workspace";
import { config } from "../../../package.json";

export function patchNotes() {
  new PatchHelper().setData({
    target: Zotero.Notes,
    funcSign: "toggleSidebar",
    patcher: () =>
      function (open: boolean) {
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
      },
    enabled: true,
    pluginID: config.addonID,
  });

  new PatchHelper().setData({
    target: Zotero.Notes,
    funcSign: "setSidebarWidth",
    patcher: () =>
      function (width: number) {
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
      },
    enabled: true,
    pluginID: config.addonID,
  });
}
