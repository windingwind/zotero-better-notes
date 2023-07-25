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
    "#menu_EditPreferencesItem"
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
    menuEditAnchor
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
    {
      tag: "menuitem",
      label: getString("menuEdit.importTemplate"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: (ev) => {
        addon.hooks.onImportTemplateFromClipboard();
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

  // menuFile
  const menuFileAnchor = document.querySelector(
    "#menu_newCollection"
  ) as XUL.MenuItem;
  const recentMainNotesMenuId = "zotero-recent-main-notes-menu";
  const recentMainNotesMenuPopupId = "zotero-recent-main-notes-popup";
  const removeChildren = (parent: Element) => {
    while (parent.lastChild) {
      parent.removeChild(parent.lastChild);
    }
  };
  ztoolkit.Menu.register(
    "menuFile",
    {
      tag: "menu",
      id: recentMainNotesMenuId,
      label: getString("menuFile-openRecent"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      children: [],
      popupId: recentMainNotesMenuPopupId,
    },
    "after",
    menuFileAnchor
  );

  document
    .querySelector(`#${recentMainNotesMenuId}`)
    ?.addEventListener("popupshowing", () => {
      const popup = document.querySelector(`#${recentMainNotesMenuPopupId}`)!;
      removeChildren(popup);
      const children = Zotero.Items.get(
        ((getPref("recentMainNoteIds") as string) || "")
          .split(",")
          .map((id) => parseInt(id))
          .filter((id) => id !== addon.data.workspace.mainId)
      )
        .filter((item) => item.isNote())
        .map((item) => ({
          tag: "menuitem",
          attributes: {
            label: slice(
              `${slice(item.getNoteTitle().trim() || item.key, 30)} - ${
                item.parentItem
                  ? "📄" + item.parentItem.getField("title")
                  : "📁" +
                    Zotero.Collections.get(item.getCollections())
                      .map(
                        (collection) => (collection as Zotero.Collection).name
                      )
                      .join(", ")
              }`,
              200
            ),
          },
          listeners: [
            {
              type: "command",
              listener: () => {
                addon.hooks.onSetWorkspaceNote(item.id, "main");
                addon.hooks.onOpenWorkspace();
              },
            },
          ],
        }));
      const defaultChildren = [
        {
          tag: "menuitem",
          attributes: {
            label: getString("menuFile-openRecent-empty"),
            disabled: true,
          },
        },
      ];

      ztoolkit.UI.appendElement(
        {
          tag: "fragment",
          children: children.length === 0 ? defaultChildren : children,
          enableElementRecord: false,
        },
        popup
      );
      return true;
    });

  ztoolkit.Menu.register(
    "menuFile",
    {
      tag: "menuitem",
      label: getString("menuFile-openMainNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: async (ev) => {
        const selectedIds = await itemPicker();
        if (
          selectedIds?.length === 1 &&
          Zotero.Items.get(selectedIds[0]).isNote()
        ) {
          addon.hooks.onSetWorkspaceNote(selectedIds[0], "main");
          addon.hooks.onOpenWorkspace();
        } else {
          window.alert(getString("menuFile-openMainNote-error"));
        }
      },
    },
    "after",
    menuFileAnchor
  );
  ztoolkit.Menu.register(
    "menuFile",
    { tag: "menuseparator" },
    "after",
    menuFileAnchor
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
    menuFileAnchor
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
    menuFileAnchor
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
    menuFileAnchor
  );
  ztoolkit.Menu.register(
    "menuFile",
    {
      tag: "menuitem",
      label: getString("menuAddNote.newMainNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: addon.hooks.onCreateWorkspaceNote,
    },
    "after",
    menuFileAnchor
  );

  // create note menu in library
  const newNoteMenu = document
    .querySelector("#zotero-tb-note-add")
    ?.querySelector("menupopup") as XUL.MenuPopup;
  ztoolkit.Menu.register(newNoteMenu, {
    tag: "menuitem",
    label: getString("menuAddNote.newMainNote"),
    icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    commandListener: addon.hooks.onCreateWorkspaceNote,
  });
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
      "#context-pane-add-child-note-button-popup"
    ) as XUL.MenuPopup,
    {
      tag: "menuitem",
      label: getString("menuAddReaderNote.newTemplateNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () =>
        addon.hooks.onCreateNoteFromTemplate("item", "reader"),
    }
  );
}
