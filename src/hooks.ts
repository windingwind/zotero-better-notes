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
import { initWorkspace } from "./modules/workspace/content";
import {
  openWorkspaceTab,
  onTabSelect,
  restoreNoteTabs,
  onUpdateNoteTabsTitle,
} from "./modules/workspace/tab";
import { openWorkspaceWindow } from "./modules/workspace/window";
import { openNotePreview } from "./modules/workspace/preview";
import { registerNotify } from "./modules/notify";
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
import { patchViewItems } from "./modules/viewItems";
import { getFocusedWindow } from "./utils/window";
import { registerNoteRelation } from "./modules/workspace/relation";
import { getPref, setPref } from "./utils/prefs";
import { closeRelationWorker } from "./utils/relation";
import { registerNoteLinkSection } from "./modules/workspace/link";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  Zotero.Prefs.set("layout.css.nesting.enabled", true, true);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );

  registerNoteLinkProxyHandler();

  registerEditorInstanceHook();

  registerPrefsWindow();

  registerReaderAnnotationButton();

  registerNoteRelation();

  registerNoteLinkSection("inbound");
  registerNoteLinkSection("outbound");

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

  initTemplates();

  patchViewItems(win);

  restoreNoteTabs();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  closeRelationWorker();
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
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
      for (const item of modifiedNotes) {
        await addon.api.relation.updateNoteLinkRelation(item.id);
      }
      onUpdateNoteTabsTitle(modifiedNotes);
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
  mode: "auto" | "preview" | "tab" | "window" | "builtin" = "auto",
  options: {
    workspaceUID?: string;
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  if (!getPref("openNote.takeover")) {
    ZoteroPane.openNoteWindow(noteId);
    return;
  }
  let { workspaceUID } = options;
  const noteItem = Zotero.Items.get(noteId);
  if (!noteItem?.isNote()) {
    ztoolkit.log(`onOpenNote: ${noteId} is not a note.`);
    return;
  }
  if (mode === "auto") {
    const currentWindow = getFocusedWindow();

    if ((currentWindow as any)?.Zotero_Tabs?.selectedType === "note") {
      mode = "preview";
      workspaceUID = (
        document.querySelector(`#${Zotero_Tabs.selectedID} bn-workspace`) as
          | HTMLElement
          | undefined
      )?.dataset.uid;
    } else if (currentWindow?.document.querySelector("bn-workspace")) {
      mode = "preview";
      workspaceUID = (
        currentWindow.document.querySelector("bn-workspace") as
          | HTMLElement
          | undefined
      )?.dataset.uid;
    } else {
      mode = "tab";
    }
  }
  switch (mode) {
    case "preview":
      if (!workspaceUID) {
        throw new Error(
          "Better Notes onOpenNote mode=preview must have workspaceUID provided.",
        );
      }
      openNotePreview(noteItem, workspaceUID, options);
      break;
    case "tab":
      openWorkspaceTab(noteItem, options);
      break;
    case "window":
      openWorkspaceWindow(noteItem, options);
      break;
    case "builtin":
      ZoteroPane.openNoteWindow(noteId);
      break;
    default:
      break;
  }
}

const onInitWorkspace = initWorkspace;

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
  onSyncing,
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
