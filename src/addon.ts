/*
 * This file defines the plugin's structure.
 */

import ZoteroEvents from "./zotero/events";
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
import EditorViews from "./editor/editorViews";
import EditorController from "./editor/editorController";
import EditorImageViewer from "./editor/imageViewerWindow";
import TemplateWindow from "./template/templateWindow";

class Knowledge4Zotero {
  public ZoteroEvents: ZoteroEvents;
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
  public NoteExportWindow: NoteExportWindow;
  public NoteParse: NoteParse;
  public EditorViews: EditorViews;
  public EditorController: EditorController;
  public EditorImageViewer: EditorImageViewer;

  constructor() {
    this.ZoteroEvents = new ZoteroEvents(this);
    this.ZoteroViews = new ZoteroViews(this);
    this.ReaderViews = new ReaderViews(this);
    this.WorkspaceOutline = new WorkspaceOutline(this);
    this.WorkspaceWindow = new WorkspaceWindow(this);
    this.WorkspaceMenu = new WorkspaceMenu(this);
    this.EditorViews = new EditorViews(this);
    this.EditorController = new EditorController(this);
    this.EditorImageViewer = new EditorImageViewer(this);
    this.WizardWindow = new WizardWindow(this);
    this.SyncInfoWindow = new SyncInfoWindow(this);
    this.SyncListWindow = new SyncListWindow(this);
    this.SyncController = new SyncController(this);
    this.TemplateWindow = new TemplateWindow(this);
    this.TemplateController = new TemplateController(this);
    this.NoteUtils = new NoteUtils(this);
    this.NoteExport = new NoteExport(this);
    this.NoteExportWindow = new NoteExportWindow(this);
    this.NoteParse = new NoteParse(this);
    this.knowledge = new TemplateAPI(this);
  }
}

export default Knowledge4Zotero;
