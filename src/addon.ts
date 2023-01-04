/*
 * This file defines the plugin's structure.
 */

import ZoteroEvents from "./zotero/events";
import ZoteroNotifies from "./zotero/notifies";
import ZoteroViews from "./zotero/views";
import ReaderViews from "./reader/readerViews";
import WizardWindow from "./wizard/wizardWindow";
import { TemplateController, TemplateAPI } from "./template/templateController";
import SyncInfoWindow from "./sync/syncInfoWindow";
import SyncListWindow from "./sync/syncListWindow";
import SyncController from "./sync/syncController";
import WorkspaceWindow from "./workspace/workspaceWindow";
import WorkspaceOutline from "./workspace/workspaceOutline";
import WorkspaceMenu from "./workspace/workspaceMenu";
import NoteUtils from "./note/noteUtils";
import NoteParse from "./note/noteParse";
import NoteExportWindow from "./note/noteExportWindow";
import NoteExport from "./note/noteExportController";
import NoteImport from "./note/noteImportController";
import SyncDiffWindow from "./sync/syncDiffWindow";
import EditorViews from "./editor/editorViews";
import EditorController from "./editor/editorController";
import EditorImageViewer from "./editor/imageViewerWindow";
import TemplateWindow from "./template/templateWindow";
import { SyncUtils } from "./sync/syncUtils";
import ZoteroToolkit from "zotero-plugin-toolkit";

class BetterNotes {
  public env: "development" | "production";
  public ZoteroEvents: ZoteroEvents;
  public ZoteroNotifies: ZoteroNotifies;
  // Zotero UI
  public ZoteroViews: ZoteroViews;
  // Reader UI
  public ReaderViews: ReaderViews;
  // Workspace UI
  public WorkspaceOutline: WorkspaceOutline;
  public WorkspaceWindow: WorkspaceWindow;
  public WorkspaceMenu: WorkspaceMenu;
  // First-run wizard
  public WizardWindow: WizardWindow;
  // Sync tools
  public SyncUtils: SyncUtils;
  public SyncInfoWindow: SyncInfoWindow;
  public SyncListWindow: SyncListWindow;
  public SyncController: SyncController;
  // Template
  public TemplateWindow: TemplateWindow;
  public TemplateController: TemplateController;
  // Just for template API consistency
  public knowledge: TemplateAPI;
  // Note tools
  public NoteUtils: NoteUtils;
  public NoteExport: NoteExport;
  public NoteImport: NoteImport;
  public SyncDiffWindow: SyncDiffWindow;
  public NoteExportWindow: NoteExportWindow;
  public NoteParse: NoteParse;
  public EditorViews: EditorViews;
  public EditorController: EditorController;
  public EditorImageViewer: EditorImageViewer;

  public toolkit: ZoteroToolkit;

  constructor() {
    this.ZoteroEvents = new ZoteroEvents(this);
    this.ZoteroNotifies = new ZoteroNotifies(this);
    this.ZoteroViews = new ZoteroViews(this);
    this.ReaderViews = new ReaderViews(this);
    this.WorkspaceOutline = new WorkspaceOutline(this);
    this.WorkspaceWindow = new WorkspaceWindow(this);
    this.WorkspaceMenu = new WorkspaceMenu(this);
    this.EditorViews = new EditorViews(this);
    this.EditorController = new EditorController(this);
    this.EditorImageViewer = new EditorImageViewer(this);
    this.WizardWindow = new WizardWindow(this);
    this.SyncUtils = new SyncUtils(this);
    this.SyncInfoWindow = new SyncInfoWindow(this);
    this.SyncListWindow = new SyncListWindow(this);
    this.SyncController = new SyncController(this);
    this.SyncDiffWindow = new SyncDiffWindow(this);
    this.TemplateWindow = new TemplateWindow(this);
    this.TemplateController = new TemplateController(this);
    this.NoteUtils = new NoteUtils(this);
    this.NoteExport = new NoteExport(this);
    this.NoteImport = new NoteImport(this);
    this.NoteExportWindow = new NoteExportWindow(this);
    this.NoteParse = new NoteParse(this);
    this.knowledge = new TemplateAPI(this);

    this.toolkit = new ZoteroToolkit();
    // Disable since we are still using overlay
    this.toolkit.UI.enableElementRecordGlobal = false;
  }
}

export default BetterNotes;
