import AddonEvents from "./zotero/events";
import ZoteroViews from "./zotero/views";
import ReaderViews from "./reader/annotationButton";
import WorkspaceOutline from "./workspace/workspaceOutline";
import EditorViews from "./editor/editorUI";
import AddonWizard from "./wizard";
import NoteExportWindow from "./editor/noteExportWindow";
import { TemplateController, TemplateAPI } from "./template/templateController";
import SyncInfoWindow from "./sync/syncInfoWindow";
import SyncListWindow from "./sync/syncListWindow";
import NoteParse from "./editor/noteParse";
import WorkspaceWindow from "./workspace/workspaceWindow";
import WorkspaceMenu from "./workspace/workspaceMenu";
import NoteUtils from "./editor/noteUtils";
import NoteExport from "./editor/noteExportController";
import SyncController from "./sync/syncController";
import TemplateWindow from "./template/templateWindow";

class Knowledge4Zotero {
  public events: AddonEvents;
  // Zotero UI
  public ZoteroViews: ZoteroViews;
  // Reader UI
  public ReaderViews: ReaderViews;
  // Workspace UI
  public WorkspaceOutline: WorkspaceOutline;
  public WorkspaceWindow: WorkspaceWindow;
  public WorkspaceMenu: WorkspaceMenu;
  // First-run wizard
  public wizard: AddonWizard;
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

  constructor() {
    this.events = new AddonEvents(this);
    this.ZoteroViews = new ZoteroViews(this);
    this.ReaderViews = new ReaderViews(this);
    this.WorkspaceOutline = new WorkspaceOutline(this);
    this.WorkspaceWindow = new WorkspaceWindow(this);
    this.WorkspaceMenu = new WorkspaceMenu(this);
    this.EditorViews = new EditorViews(this);
    this.wizard = new AddonWizard(this);
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
