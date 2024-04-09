import { config } from "../../package.json";
import { itemPicker } from "../utils/itemPicker";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { slice } from "../utils/str";

export function registerMenus() {
  // item
  ztoolkit.Menu.register("item", { tag: "menuseparator" });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: getString("menuItem.exportNote"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: (ev) => {
      addon.hooks.onShowExportNoteOptions(
        ZoteroPane.getSelectedItems().map((item) => item.id),
      );
    },
  });

  // menuEdit
  const menuEditAnchor = document.querySelector(
    "#menu_EditPreferencesItem",
  ) as XUL.MenuItem;
  ztoolkit.Menu.register(
    "menuEdit",
    {
      tag: "menuitem",
      label: getString("menuEdit.insertTemplate"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: (ev) => {
        addon.hooks.onShowTemplatePicker();
      },
    },
    "before",
    menuEditAnchor,
  );
  ztoolkit.Menu.register(
    "menuEdit",
    {
      tag: "menuitem",
      label: getString("menuEdit.exportTemplate"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: (ev) => {
        addon.hooks.onShowTemplatePicker("export");
      },
    },
    "before",
    menuEditAnchor,
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
    menuEditAnchor,
  );
  ztoolkit.Menu.register(
    "menuEdit",
    {
      tag: "menuitem",
      label: getString("menuEdit.importTemplate"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: (ev) => {
        addon.hooks.onImportTemplateFromClipboard();
      },
    },
    "before",
    menuEditAnchor,
  );
  ztoolkit.Menu.register(
    "menuEdit",
    { tag: "menuseparator" },
    "before",
    menuEditAnchor,
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

  // menuFile
  const menuFileAnchor = document.querySelector(
    "#menu_newCollection",
  ) as XUL.MenuItem;

  ztoolkit.Menu.register(
    "menuFile",
    { tag: "menuseparator" },
    "after",
    menuFileAnchor,
  );
  // a copy of create note menu in library
  ztoolkit.Menu.register(
    "menuFile",
    {
      tag: "menuitem",
      label: getString("menuAddNote-importMD"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () => addon.hooks.onCreateNoteFromMD(),
    },
    "after",
    menuFileAnchor,
  );
  ztoolkit.Menu.register(
    "menuFile",
    {
      tag: "menuitem",
      label: getString("menuAddNote.newTemplateItemNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () =>
        addon.hooks.onCreateNoteFromTemplate("item", "library"),
    },
    "after",
    menuFileAnchor,
  );
  ztoolkit.Menu.register(
    "menuFile",
    {
      tag: "menuitem",
      label: getString("menuAddNote.newTemplateStandaloneNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
    },
    "after",
    menuFileAnchor,
  );

  // create note menu in library
  const newNoteMenu = document
    .querySelector("#zotero-tb-note-add")
    ?.querySelector("menupopup") as XUL.MenuPopup;
  ztoolkit.Menu.register(newNoteMenu, {
    tag: "menuitem",
    label: getString("menuAddNote.newTemplateStandaloneNote"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
  });
  ztoolkit.Menu.register(newNoteMenu, {
    tag: "menuitem",
    label: getString("menuAddNote.newTemplateItemNote"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: () =>
      addon.hooks.onCreateNoteFromTemplate("item", "library"),
  });
  ztoolkit.Menu.register(newNoteMenu, {
    tag: "menuitem",
    label: getString("menuAddNote-importMD"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: () => addon.hooks.onCreateNoteFromMD(),
  });

  // create note menu in reader side panel
  ztoolkit.Menu.register(
    document.querySelector(
      "#context-pane-add-child-note-button-popup",
    ) as XUL.MenuPopup,
    {
      tag: "menuitem",
      label: getString("menuAddReaderNote.newTemplateNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () =>
        addon.hooks.onCreateNoteFromTemplate("item", "reader"),
    },
  );
}
