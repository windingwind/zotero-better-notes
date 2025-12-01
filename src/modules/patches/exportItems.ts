import { PatchHelper } from "zotero-plugin-toolkit";
import { getPref } from "../../utils/prefs";

export function patchExportItems(win: _ZoteroTypes.MainWindow) {
  const Zotero_File_Interface = win.Zotero_File_Interface;
  new PatchHelper().setData({
    target: Zotero_File_Interface,
    // @ts-ignore
    funcSign: "exportItems",
    patcher: (origin) =>
      // @ts-ignore
      function () {
        if (!getPref("exportNotes.takeover")) {
          // @ts-ignore
          return origin.apply(this);
        }
        const items = win.ZoteroPane.getSelectedItems();
        if (items.every((item) => item.isNote())) {
          return addon.hooks.onShowExportNoteOptions(
            items.map((item) => item.id),
          );
        }
        // @ts-ignore
        return origin.apply(this);
      },
    enabled: true,
  });
}
