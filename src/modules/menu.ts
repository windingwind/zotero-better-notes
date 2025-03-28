import { config } from "../../package.json";
import { getString } from "../utils/locale";

export function registerMenus(win: _ZoteroTypes.MainWindow) {
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
  ztoolkit.Menu.register("menuTools", {
    tag: "menuitem",
    label: getString("menuEdit.templateEditor"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: (ev) => {
      addon.hooks.onShowTemplateEditor();
    },
  });
  ztoolkit.Menu.register("menuTools", {
    tag: "menuitem",
    label: getString("menuEdit.importTemplate"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: (ev) => {
      addon.hooks.onImportTemplateFromClipboard();
    },
  });

  // menuFile
  const menuFileAnchor = win.document.querySelector(
    "#menu_newCollection",
  ) as XULMenuItemElement;

  ztoolkit.Menu.register(
    "menuFile",
    { tag: "menuseparator" },
    "after",
    menuFileAnchor,
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
  const newNoteMenu = win.document
    .querySelector("#zotero-tb-note-add")
    ?.querySelector("menupopup") as XULMenuPopupElement;
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
    win.document.querySelector(
      "#context-pane-add-child-note-button-popup",
    ) as XULMenuPopupElement,
    {
      tag: "menuitem",
      label: getString("menuAddReaderNote.newTemplateNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () =>
        addon.hooks.onCreateNoteFromTemplate("item", "reader"),
    },
  );

  ztoolkit.Menu.register("menuHelp", {
    tag: "menuitem",
    label: getString("menuHelp-openUserGuide"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: () => addon.hooks.onShowUserGuide(win, true),
  });
}
