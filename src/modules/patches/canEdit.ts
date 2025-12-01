import { PatchHelper } from "zotero-plugin-toolkit";
import { getPref } from "../../utils/prefs";

export function patchCanEdit(win: _ZoteroTypes.MainWindow) {
  // @ts-ignore
  const ZoteroPane = win.ZoteroPane;
  new PatchHelper().setData({
    target: ZoteroPane,
    funcSign: "canEdit",
    patcher: (origin) =>
      function (row: number) {
        if (!addon.data.alive) {
          // @ts-ignore
          return origin.apply(this, [items, event]);
        }
        if (win.Zotero_Tabs.selectedType === "note") {
          const tabInfo = win.Zotero_Tabs._getTab(
            win.Zotero_Tabs.selectedID,
          ).tab;
          const item = Zotero.Items.get(tabInfo.data?.itemID);
          if (item) {
            return item.isEditable();
          }
          return false;
        }
        // @ts-ignore
        return origin.apply(this, [otherItems, event]);
      },
    enabled: true,
  });
}
