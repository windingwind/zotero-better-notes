import { config } from "../../package.json";
import { wait } from "zotero-plugin-toolkit";

interface BNMenuContext {
  items?: Zotero.Item[];
  tabType: string;
  tabID: string;
  menuElem: XULElement;
  setVisible: (visible: boolean) => void;
}

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
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuAddNote-createMainNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onCommand: () => addon.hooks.onCreateMainNote(),
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

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-menuTabMoveNewWindow`,
    pluginID: config.addonID,
    target: "main/tab",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menuTab-moveNewWindow`,
        onShowing(_, context) {
          context.setVisible(context.tabType.startsWith("note"));
        },
        onCommand: (_, context: BNMenuContext) => {
          if (!context.items?.[0]) return;
          addon.hooks.onOpenNote(context.items[0].id, "window", {
            forceTakeover: true,
          });
          (
            context.menuElem.ownerGlobal as _ZoteroTypes.MainWindow
          ).Zotero_Tabs.close(context.tabID);
        },
      },
    ],
  });

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-openNoteAsBNWindow`,
    pluginID: config.addonID,
    target: "main/library/item",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menu-setAsMainNote`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onShowing: (_, context: BNMenuContext) => {
          context.setVisible(!!context.items?.every((item) => item.isNote()));
        },
        onCommand: (_, context: BNMenuContext) => {
          if (!context.items?.[0]) return;
          const item = context.items[0];
          Zotero.Prefs.set("betternotes.mainNoteID", String(item.id));

          // Add to history
          const recentPref =
            Zotero.Prefs.get("betternotes.recentMainNoteIds") ||
            Zotero.Prefs.get("Knowledge4Zotero.recentMainNoteIds") ||
            "";
          let recentIds = String(recentPref)
            .split(",")
            .filter((id) => id.trim().length > 0);
          recentIds.unshift(String(item.id));
          recentIds = Array.from(new Set(recentIds)).slice(0, 10);
          Zotero.Prefs.set(
            "betternotes.recentMainNoteIds",
            recentIds.join(","),
          );

          Zotero.getMainWindow().ZoteroPane.displayMessage(
            "Note set as Main Note",
          );
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menu-openInWorkspaceTab`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onShowing: (_, context: BNMenuContext) => {
          context.setVisible(!!context.items?.every((item) => item.isNote()));
        },
        onCommand: (_, context: BNMenuContext) => {
          if (!context.items?.[0]) return;
          addon.hooks.onOpenNote(context.items[0].id, "tab", {
            forceTakeover: true,
          });
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-menu-openNoteAsBNWindow`,
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        onShowing: (_, context: BNMenuContext) => {
          context.setVisible(!!context.items?.every((item) => item.isNote()));
        },
        onCommand: (_, context: BNMenuContext) => {
          if (!context.items?.length) {
            return;
          }
          addon.hooks.onOpenNote(context.items[0].id, "window", {
            forceTakeover: true,
          });
        },
      },
    ],
  });
}
