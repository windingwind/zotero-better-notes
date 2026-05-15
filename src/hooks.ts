import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import { registerPrefsWindow } from "./modules/preferenceWindow";
import { registerNoteLinkProxyHandler } from "./modules/noteLink";
import {
  registerEditorInstanceHook,
  unregisterEditorInstanceHook,
} from "./modules/editor/initalize";
import {
  importTemplateFromClipboard,
  initTemplates,
} from "./modules/template/controller";
import { registerMenus } from "./modules/menu";
import { initWorkspace } from "./modules/workspace/content";
import { openWorkspaceWindow } from "./modules/workspace/window";
import { openNotePreview } from "./modules/workspace/preview";
import { registerNotify } from "./modules/notify";
import {
  registerReaderAnnotationButton,
  syncAnnotationNoteTags,
} from "./modules/annotationNote";
import { setSyncing, callSyncing } from "./modules/sync/hooks";
import { showTemplatePicker } from "./modules/template/picker";
import { showImageViewer } from "./modules/imageViewer";
import { showExportNoteOptions } from "./modules/export/exportWindow";
import { showSyncDiff } from "./modules/sync/diffWindow";
import { showSyncInfo } from "./modules/sync/infoWindow";
import { showSyncManager } from "./modules/sync/managerWindow";
import { showTemplateEditor } from "./modules/template/editorWindow";
import {
  createNoteFromTemplate,
  createNoteFromMD,
  createNote,
} from "./modules/createNote";
import { createZToolkit } from "./utils/ztoolkit";
import { waitUtilAsync } from "./utils/wait";
import { initSyncList } from "./modules/sync/api";
import { getFocusedWindow } from "./utils/window";
import { registerNoteRelation } from "./modules/workspace/relation";
import { closeRelationServer } from "./utils/relation";
import { registerNoteLinkSection } from "./modules/workspace/link";
import { showUserGuide } from "./modules/userGuide";
import { refreshTemplatesInNote } from "./modules/template/refresh";
import { closeParsingServer } from "./utils/parsing";
import { patchExportItems } from "./modules/patches/exportItems";
import { closeConvertServer } from "./utils/convert";
import { patchNoteEditorCE } from "./modules/patches/noteEditor";
import { patchNotes } from "./modules/patches/notes";

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

  registerMenus();

  registerNoteLinkProxyHandler();

  registerEditorInstanceHook();

  registerPrefsWindow();

  registerReaderAnnotationButton();

  registerNoteRelation();

  registerNoteLinkSection("inbound");
  registerNoteLinkSection("outbound");

  patchNotes();

  initSyncList();

  setSyncing();

  await Promise.all(Zotero.getMainWindows().map(onMainWindowLoad));

  // For testing
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  await waitUtilAsync(() => win.document.readyState === "complete");

  Services.scriptloader.loadSubScript(
    `chrome://${config.addonRef}/content/scripts/customElements.js`,
    win,
  );

  win.document.l10n?.addResourceIds([`${config.addonRef}-mainWindow.ftl`]);

  // Zotero 8 compatibility: mock missing context menu builder
  // @ts-ignore
  if (typeof win.goBuildEditContextMenu !== "function") {
    // @ts-ignore
    win.goBuildEditContextMenu = () => {};
  }

  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  registerNotify(["tab", "item", "item-tag"], win);

  initTemplates();

  patchExportItems(win);

  patchNoteEditorCE(win);

  initGlobalMainNoteButton(win);

  showUserGuide(win);
}

function initGlobalMainNoteButton(win: _ZoteroTypes.MainWindow) {
  const iconMainNote = `<svg t="1651124314636" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"><path d="M877.44 383.786667L624.426667 117.333333C594.986667 86.186667 554.88 69.12 512 69.12s-82.986667 17.066667-112.426667 48.213333L146.56 383.786667a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V485.973333c0-38.186667-14.506667-74.453333-40.96-102.186666z m-44.373333 404.266666c0 38.826667-31.573333 70.186667-70.186667 70.186667H261.333333c-38.826667 0-70.186667-31.573333-70.186666-70.186667V485.973333c0-16.213333 6.186667-31.786667 17.28-43.52L461.44 176c13.226667-13.866667 31.146667-21.546667 50.56-21.546667s37.333333 7.68 50.56 21.76l253.013333 266.453334c11.306667 11.733333 17.28 27.306667 17.28 43.52v301.866666z"></path><path d="M608 687.786667h-192c-23.466667 0-42.666667 19.2-42.666667 42.666666s19.2 42.666667 42.666667 42.666667h192c23.466667 0 42.666667-19.2 42.666667-42.666667s-19.2-42.666667-42.666667-42.666666z"></path></svg>`;
  
  const btnId = "bn-global-mainnote-btn";
  if (win.document.getElementById(btnId)) return;

  const tabs = win.document.getElementById("zotero-tabs");
  if (!tabs) return;

  const btn = win.document.createElement("toolbarbutton");
  btn.id = btnId;
  btn.className = "toolbarbutton-1 zotero-toolbar-button";
  btn.setAttribute("title", "Open Main Note");
  btn.style.marginRight = "4px";
  btn.innerHTML = iconMainNote;
  
  btn.addEventListener("click", () => {
    const mainNoteId = parseInt(String(Zotero.Prefs.get("betternotes.mainNoteID") || "0"));
    if (mainNoteId > 0) {
      onOpenNote(mainNoteId, "tab", { forceTakeover: true });
    } else {
      win.ZoteroPane.displayMessage("No Main Note set. Use right-click on a note to set it.");
    }
  });

  tabs.parentNode?.insertBefore(btn, tabs);
}

async function onMainWindowUnload(win: Window): Promise<void> {
  win.document.l10n?.removeResourceIds([
    `${config.addonRef}-mainWindow.ftl`,
    `${config.addonRef}-notePreview.ftl`,
    `${config.addonRef}-noteRelation.ftl`,
    `${config.addonRef}-outline.ftl`,
  ]);
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  closeRelationServer();
  closeParsingServer();
  closeConvertServer();

  unregisterEditorInstanceHook();

  Zotero.getMainWindows().forEach((win) => {
    onMainWindowUnload(win);
  });

  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore plugin instance
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
  if (extraData?.skipBN) {
    return;
  }
  if (
    ["add", "close"].includes(event) &&
    type === "tab" &&
    extraData[ids[0]]?.type === "note"
  ) {
    Zotero.Session.debounceSave();
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
    }
  }
  if (type === "item-tag") {
    for (const itemTagID of ids) {
      await syncAnnotationNoteTags(
        Number((itemTagID as string).split("-")[0]),
        event as "add" | "remove",
        extraData[itemTagID],
      );
    }
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

interface OpenNoteReturns {
  auto: Window | string | void;
  preview: void;
  tab: string | void;
  window: Window | void;
  builtin: void;
  "native-window": void;
}

async function onOpenNote<K extends keyof OpenNoteReturns>(
  noteId: number,
  mode: K = "auto" as K,
  options: {
    workspaceUID?: string;
    lineIndex?: number;
    sectionName?: string;
    forceTakeover?: boolean;
  } = {},
): Promise<OpenNoteReturns[K]> {
  const win = Zotero.getMainWindow();
  if (!win) {
    return;
  }
  if (!options.forceTakeover) {
    win.ZoteroPane.openNote(noteId);
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

    if (
      (currentWindow as _ZoteroTypes.MainWindow)?.Zotero_Tabs?.selectedType ===
      "note"
    ) {
      mode = "preview" as K;
      workspaceUID = (
        currentWindow as _ZoteroTypes.MainWindow
      ).Zotero_Tabs.getTabInfo().id;
    } else if (currentWindow?.document.querySelector("body.workspace-window")) {
      mode = "preview" as K;
      workspaceUID = (
        currentWindow.document.querySelector("bn-workspace") as
          | HTMLElement
          | undefined
      )?.dataset.uid;
    } else {
      mode = "tab" as K;
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
      return win.ZoteroPane.openNote(noteId, { openInWindow: false }) as any;
      break;
    case "window":
      return (await openWorkspaceWindow(noteItem, options)) as any;
      break;
    case "builtin":
      win.ZoteroPane.openNote(noteId);
      break;
    case "native-window":
      win.ZoteroPane.openNote(noteId, { openInWindow: true });
      break;
    default:
      break;
  }
}

async function onCreateMainNote() {
  const noteItem = await createNote();
  if (!noteItem) return;

  Zotero.Prefs.set("betternotes.mainNoteID", String(noteItem.id));

  // Add to history
  const recentPref = String(Zotero.Prefs.get("betternotes.recentMainNoteIds") || Zotero.Prefs.get("Knowledge4Zotero.recentMainNoteIds") || "");
  let recentIds = recentPref.split(",").filter(id => id.trim().length > 0);
  recentIds.unshift(String(noteItem.id));
  recentIds = Array.from(new Set(recentIds)).slice(0, 10);
  Zotero.Prefs.set("betternotes.recentMainNoteIds", recentIds.join(","));

  onOpenNote(noteItem.id, "tab", { forceTakeover: true });
}

const onInitWorkspace = initWorkspace;

const onSyncing = callSyncing;

const onShowTemplatePicker = showTemplatePicker;

const onImportTemplateFromClipboard = importTemplateFromClipboard;

const onRefreshTemplatesInNote = refreshTemplatesInNote;

const onShowImageViewer = showImageViewer;

const onShowExportNoteOptions = showExportNoteOptions;

const onShowSyncInfo = showSyncInfo;

const onShowSyncManager = showSyncManager;

const onShowSyncDiff = showSyncDiff;

const onShowTemplateEditor = showTemplateEditor;

const onCreateNoteFromTemplate = createNoteFromTemplate;

const onCreateNote = createNote;

const onCreateNoteFromMD = createNoteFromMD;

const onShowUserGuide = showUserGuide;

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
  onImportTemplateFromClipboard,
  onRefreshTemplatesInNote,
  onShowImageViewer,
  onShowExportNoteOptions,
  onShowSyncDiff,
  onShowSyncInfo,
  onShowSyncManager,
  onShowTemplateEditor,
  onCreateNoteFromTemplate,
  onCreateNoteFromMD,
  onCreateNote,
  onCreateMainNote,
  onShowUserGuide,
};
