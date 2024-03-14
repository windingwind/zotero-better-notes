import { PatchHelper } from "zotero-plugin-toolkit/dist/helpers/patch";

export function patchViewItems(win: Window) {
  // @ts-ignore
  const ZoteroPane = win.ZoteroPane;
  new PatchHelper().setData({
    target: ZoteroPane,
    funcSign: "viewItems",
    patcher: (origin) =>
      function (items: Zotero.Item[], event?: KeyboardEvent) {
        if (!addon.data.alive || event?.shiftKey) {
          // @ts-ignore
          return origin.apply(this, [items, event]);
        }
        const otherItems = [];
        for (const item of items) {
          if (item.isNote()) {
            addon.hooks.onOpenWorkspace(item, "tab");
            continue;
          }
          otherItems.push(item);
        }
        // @ts-ignore
        return origin.apply(this, [otherItems, event]);
      },
    enabled: true,
  });
}
