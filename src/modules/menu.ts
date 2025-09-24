import { config } from "../../package.json";

export function registerMenus() {
  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuTools`,
    pluginID: config.addonID,
    target: "main/menubar/tools",
    menus: [
      {
        menuType: "separator",
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-syncManager`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onShowSyncManager();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-templateEditor`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onShowTemplateEditor();
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTools-importTemplateFromClipboard`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onImportTemplateFromClipboard();
        },
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuFile`,
    pluginID: config.addonID,
    target: "main/menubar/file",
    menus: [
      {
        menuType: "separator",
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuFile-exportTemplate`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => {
          addon.hooks.onShowTemplatePicker("export");
        },
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuNewNote`,
    pluginID: config.addonID,
    target: "main/library/addNote",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-importMD`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromMD(),
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateItemNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () =>
          addon.hooks.onCreateNoteFromTemplate("item", "library"),
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateStandaloneNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuHelp`,
    pluginID: config.addonID,
    target: "main/menubar/help",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuHelp-openUserGuide`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () =>
          addon.hooks.onShowUserGuide(Zotero.getMainWindow(), true),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuAddNotesPaneStandaloneNote`,
    pluginID: config.addonID,
    target: "notesPane/addStandaloneNote",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateStandaloneNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromTemplate("standalone"),
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuAddNotesPaneItemNote`,
    pluginID: config.addonID,
    target: "notesPane/addItemNote",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-newTemplateItemNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateNoteFromTemplate("item", "reader"),
      },
    ],
  });
}
