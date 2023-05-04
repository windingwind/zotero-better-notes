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

  ztoolkit.Menu.register(
    document
      .querySelector("#zotero-tb-note-add")
      ?.querySelector("menupopup") as XUL.MenuPopup,
    {
      tag: "menuitem",
      label: getString("menuAddNote.newMainNote"),
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: createWorkspaceNote,
    }
  );
}

async function createWorkspaceNote() {
  const currentCollection = ZoteroPane.getSelectedCollection();
  if (!currentCollection) {
    window.alert(getString("menuAddNote.newMainNote.noEmptyCollectionError"));
    return;
  }
  const confirmOperation = window.confirm(
    `${getString(
      "menuAddNote.newMainNote.confirmHead"
      // @ts-ignore
    )} '${currentCollection.getName()}' ${getString(
      "menuAddNote.newMainNote.confirmTail"
    )}`
  );
  if (!confirmOperation) {
    return;
  }
  const header = window.prompt(
    getString("menuAddNote.newMainNote.enterNoteTitle"),
    `New Note ${new Date().toLocaleString()}`
  );
  const noteID = await ZoteroPane.newNote();
  const noteItem = Zotero.Items.get(noteID);
  noteItem.setNote(`<div data-schema-version="8"><h1>${header}</h1>\n</div>`);
  await noteItem.saveTx();
  addon.hooks.onSetWorkspaceNote(noteID, "main");
  if (
    !addon.data.workspace.tab.active &&
    !addon.data.workspace.window.active &&
    window.confirm(getString("menuAddNote.newMainNote.openWorkspaceTab"))
  ) {
    addon.hooks.onOpenWorkspace("tab");
  }
}
