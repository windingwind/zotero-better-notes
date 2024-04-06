import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { registerPrefsWindow } from "./modules/preferenceWindow";
import { registerNoteLinkProxyHandler } from "./modules/noteLink";
import { registerEditorInstanceHook } from "./modules/editor/initalize";
import {
  importTemplateFromClipboard,
  initTemplates,
} from "./modules/template/controller";
import { registerMenus } from "./modules/menu";
import {
  registerWorkspaceTab,
  openWorkspaceTab,
  onTabSelect,
  restoreNoteTabs,
} from "./modules/workspace/tab";
import { initWorkspace } from "./modules/workspace/content";
import { registerNotify } from "./modules/notify";
import { openWorkspaceWindow } from "./modules/workspace/window";
import { registerReaderAnnotationButton } from "./modules/reader";
import { setSyncing, callSyncing } from "./modules/sync/hooks";
import {
  showTemplatePicker,
  updateTemplatePicker,
} from "./modules/template/picker";
import { showImageViewer } from "./modules/imageViewer";
import { showExportNoteOptions } from "./modules/export/exportWindow";
import { showSyncDiff } from "./modules/sync/diffWindow";
import { showSyncInfo } from "./modules/sync/infoWindow";
import { showSyncManager } from "./modules/sync/managerWindow";
import { showTemplateEditor } from "./modules/template/editorWindow";
import { createNoteFromTemplate, createNoteFromMD } from "./modules/createNote";
import { createZToolkit } from "./utils/ztoolkit";
import { waitUtilAsync } from "./utils/wait";
import { initSyncList } from "./modules/sync/api";
import { getPref } from "./utils/prefs";
import { patchViewItems } from "./modules/viewItems";
import { onUpdateRelated } from "./modules/relatedNotes";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );

  registerNoteLinkProxyHandler();

  registerEditorInstanceHook();

  registerPrefsWindow();

  registerReaderAnnotationButton();

  initSyncList();

  setSyncing();

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  await waitUtilAsync(() => document.readyState === "complete");

  Services.scriptloader.loadSubScript(
    `chrome://${config.addonRef}/content/scripts/customElements.js`,
    win,
  );
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  registerNotify(["tab", "item", "item-tag"]);

  registerMenus();

  registerWorkspaceTab(win);

  initTemplates();

  patchViewItems(win);

  restoreNoteTabs();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
function onNotify(
  event: Parameters<_ZoteroTypes.Notifier.Notify>["0"],
  type: Parameters<_ZoteroTypes.Notifier.Notify>["1"],
  ids: Parameters<_ZoteroTypes.Notifier.Notify>["2"],
  extraData: Parameters<_ZoteroTypes.Notifier.Notify>["3"],
) {
  if (extraData.skipBN) {
    return;
  }
  if (event === "select" && type === "tab") {
    onTabSelect(extraData[ids[0]].type);
  }
  if (event === "modify" && type === "item") {
    const modifiedNotes = Zotero.Items.get(ids).filter((item) => item.isNote());
    if (modifiedNotes.length) {
      addon.hooks.onSyncing(modifiedNotes, {
        quiet: true,
        skipActive: true,
        reason: "item-modify",
      });
      addon.hooks.onUpdateRelated(modifiedNotes, { skipActive: true });
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
    sectionName?: string;
  } = {},
) {
  const noteItem = Zotero.Items.get(noteId);
  if (!noteItem?.isNote()) {
    ztoolkit.log(`onOpenNote: ${noteId} is not a note.`);
    return;
  }
  if (mode === "auto") {
    mode = "workspace";
  }
  switch (mode) {
    case "preview":
      // addon.hooks.onSetWorkspaceNote(noteId, "preview", options);
      break;
    case "workspace":
      addon.hooks.onOpenWorkspace(noteItem, "tab");
      break;
    case "standalone":
      ZoteroPane.openNoteWindow(noteId);
      break;
    default:
      break;
  }
}

function onOpenWorkspace(item: Zotero.Item, type: "tab" | "window" = "tab") {
  if (type === "window") {
    openWorkspaceWindow(item);
    return;
  }
  if (type === "tab") {
    openWorkspaceTab(item);
    return;
  }
}

const onInitWorkspace = initWorkspace;

function onToggleWorkspacePane(
  type: "outline" | "preview" | "notes",
  visibility?: boolean,
  container?: XUL.Box,
) {
  // switch (type) {
  //   case "outline":
  //     toggleOutlinePane(visibility, container);
  //     break;
  //   case "preview":
  //     togglePreviewPane(visibility, container);
  //     break;
  //   case "notes":
  //     toggleNotesPane(visibility);
  //     break;
  //   default:
  //     break;
  // }
}

const onSyncing = callSyncing;

const onShowTemplatePicker = showTemplatePicker;

const onUpdateTemplatePicker = updateTemplatePicker;

const onImportTemplateFromClipboard = importTemplateFromClipboard;

const onShowImageViewer = showImageViewer;

const onShowExportNoteOptions = showExportNoteOptions;

const onShowSyncInfo = showSyncInfo;

const onShowSyncManager = showSyncManager;

const onShowSyncDiff = showSyncDiff;

const onShowTemplateEditor = showTemplateEditor;

const onCreateNoteFromTemplate = createNoteFromTemplate;

const onCreateNoteFromMD = createNoteFromMD;

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onMainWindowLoad,
  onMainWindowUnload,
  onShutdown,
  onNotify,
  onPrefsEvent,
  onOpenNote,
  onInitWorkspace,
  onOpenWorkspace,
  onToggleWorkspacePane,
  onSyncing,
  onUpdateRelated,
  onShowTemplatePicker,
  onUpdateTemplatePicker,
  onImportTemplateFromClipboard,
  onShowImageViewer,
  onShowExportNoteOptions,
  onShowSyncDiff,
  onShowSyncInfo,
  onShowSyncManager,
  onShowTemplateEditor,
  onCreateNoteFromTemplate,
  onCreateNoteFromMD,
  restoreNoteTabs,
};
