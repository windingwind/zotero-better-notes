import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { registerPrefsWindow } from "./modules/preferenceWindow";
import { registerNoteLinkProxyHandler } from "./modules/noteLink";
import { registerEditorInstanceHook } from "./modules/editor/initalize";
import { initTemplates } from "./modules/template/controller";
import { registerMenus } from "./modules/menu";
import {
  activateWorkspaceTab,
  deActivateWorkspaceTab,
  registerWorkspaceTab,
  TAB_TYPE,
} from "./modules/workspace/tab";
import {
  initWorkspaceEditor,
  togglePreviewPane,
  updateOutline,
} from "./modules/workspace/content";
import { registerNotify } from "./modules/notify";
import { showWorkspaceWindow } from "./modules/workspace/window";
import {
  checkReaderAnnotationButton,
  registerReaderInitializer,
  unregisterReaderInitializer,
} from "./modules/reader";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`
  );

  registerNoteLinkProxyHandler();

  registerNotify(["tab", "item"]);

  registerEditorInstanceHook();

  initTemplates();

  registerMenus();

  registerWorkspaceTab();

  registerReaderInitializer();

  registerPrefsWindow();

  addon.api.sync.setSync();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  unregisterReaderInitializer();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
function onNotify(
  event: string,
  type: string,
  ids: number[] | string[],
  extraData: { [key: string]: any }
) {
  // Workspace tab select/unselect callback
  if (event === "select" && type === "tab") {
    if (extraData[ids[0]].type == TAB_TYPE) {
      activateWorkspaceTab();
    } else {
      deActivateWorkspaceTab();
    }
  }
  // Workspace main note update
  if (event === "modify" && type === "item") {
    if ((ids as number[]).includes(addon.data.workspace.mainId)) {
      addon.data.workspace.tab.active &&
        updateOutline(addon.data.workspace.tab.container!);
      addon.data.workspace.window.active &&
        updateOutline(addon.data.workspace.window.container!);
    }
  }
  if (event === "modify" && type === "item") {
    const modifiedNotes = Zotero.Items.get(ids).filter((item) => item.isNote());
    if (modifiedNotes.length) {
      addon.api.sync.doSync(modifiedNotes, {
        quiet: true,
        skipActive: true,
        reason: "item-modify",
      });
    }
  }
  // Reader annotation buttons update
  if (event === "add" && type === "item") {
    const annotationItems = Zotero.Items.get(ids as number[]).filter((item) =>
      item.isAnnotation()
    );
    if (annotationItems.length === 0) {
      checkReaderAnnotationButton(annotationItems);
    }
  } else {
    return;
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      // registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onOpenNote(
  noteId: number,
  mode: "auto" | "preview" | "workspace" | "standalone" = "auto",
  options: {
    lineIndex?: number;
  } = {}
) {
  const noteItem = Zotero.Items.get(noteId);
  if (!noteItem?.isNote()) {
    ztoolkit.log(`onOpenNote: ${noteId} is not a note.`);
    return;
  }
  if (mode === "auto") {
    if (noteId === addon.data.workspace.mainId) {
      mode = "workspace";
    } else if (
      addon.data.workspace.tab.active ||
      addon.data.workspace.window.active
    ) {
      mode = "preview";
    } else {
      mode = "standalone";
    }
  }
  switch (mode) {
    case "preview":
      addon.hooks.onSetWorkspaceNote(noteId, "preview", options);
      break;
    case "workspace":
      addon.hooks.onSetWorkspaceNote(noteId, "main", options);
    case "standalone":
      ZoteroPane.openNoteWindow(noteId);
      break;
    default:
      break;
  }
}

function onSetWorkspaceNote(
  noteId: number,
  type: "main" | "preview" = "main",
  options: {
    lineIndex?: number;
  } = {}
) {
  if (type === "main") {
    addon.data.workspace.mainId = noteId;
    addon.data.workspace.tab.active &&
      updateOutline(addon.data.workspace.tab.container!);
    addon.data.workspace.window.active &&
      updateOutline(addon.data.workspace.window.container!);
  }
  if (addon.data.workspace.window.active) {
    initWorkspaceEditor(
      addon.data.workspace.window.container,
      type,
      noteId,
      options
    );
    type === "preview" &&
      togglePreviewPane(addon.data.workspace.window.container, "open");
    addon.data.workspace.window.window?.focus();
  }
  if (addon.data.workspace.tab.active) {
    initWorkspaceEditor(
      addon.data.workspace.tab.container,
      type,
      noteId,
      options
    );
    type === "preview" &&
      togglePreviewPane(addon.data.workspace.tab.container, "open");
    Zotero_Tabs.select(addon.data.workspace.tab.id!);
  }
}

function onOpenWorkspace(type: "tab" | "window" = "tab") {
  if (type === "window") {
    if (addon.data.workspace.window.active) {
      addon.data.workspace.window.window?.focus();
      return;
    }
    showWorkspaceWindow();
    return;
  }
  if (type === "tab") {
    // selecting tab will auto load the workspace content
    Zotero_Tabs.select(addon.data.workspace.tab.id!);
    return;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

export default {
  onStartup,
  onShutdown,
  onNotify,
  onPrefsEvent,
  onOpenNote,
  onSetWorkspaceNote,
  onOpenWorkspace,
};
