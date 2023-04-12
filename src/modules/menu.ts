import { config } from "../../package.json";
import { getString } from "../utils/locale";

export function registerMenus() {
  // item
  ztoolkit.Menu.register("item", { tag: "menuseparator" });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: getString("menuItem.exportNote"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: (ev) => {
      addon.hooks.onShowExportNoteOptions(
        ZoteroPane.getSelectedItems().map((item) => item.id)
      );
    },
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: getString("menuItem.setMainNote"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: (ev) => {
      addon.hooks.onSetWorkspaceNote(ZoteroPane.getSelectedItems()[0].id);
    },
    getVisibility: (elem, ev) => {
      const items = ZoteroPane.getSelectedItems();
      return (
        items.length == 1 &&
        items[0].isNote() &&
        items[0].id !== addon.data.workspace.mainId
      );
    },
  });

  // menuEdit
  const menuEditAnchor = document.querySelector(
    "#menu_preferences"
  ) as XUL.MenuItem;
  ztoolkit.Menu.register(
    "menuEdit",
    {
      tag: "menuitem",
      label: getString("menuEdit.templatePicker"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: (ev) => {
        addon.hooks.onShowTemplatePicker();
      },
    },
    "before",
    menuEditAnchor
  );
  ztoolkit.Menu.register(
    "menuEdit",
    {
      tag: "menuitem",
      label: getString("menuEdit.templateEditor"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: (ev) => {
        addon.hooks.onShowTemplateEditor();
      },
    },
    "before",
    menuEditAnchor
  );
  ztoolkit.Menu.register(
    "menuEdit",
    { tag: "menuseparator" },
    "before",
    menuEditAnchor
  );

  // menuTools
  ztoolkit.Menu.register("menuTools", { tag: "menuseparator" });
  ztoolkit.Menu.register("menuTools", {
    tag: "menuitem",
    label: getString("menuTools.syncManager"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: (ev) => {
      addon.hooks.onShowSyncManager();
    },
  });
}
