import AddonEvents from "./events";
import AddonViews from "./views";
import AddonWizard from "./wizard";
import AddonExport from "./export";
import Knowledge from "./knowledge";
import AddonTemplate from "./template";
import AddonSync from "./sync";
import AddonSyncList from "./syncList";
import AddonParse from "./parse";

class Knowledge4Zotero {
  public events: AddonEvents;
  public views: AddonViews;
  public wizard: AddonWizard;
  public export: AddonExport;
  public parse: AddonParse;
  public sync: AddonSync;
  public syncList: AddonSyncList;
  public template: AddonTemplate;
  public knowledge: Knowledge;

  constructor() {
    this.events = new AddonEvents(this);
    this.views = new AddonViews(this);
    this.wizard = new AddonWizard(this);
    this.export = new AddonExport(this);
    this.parse = new AddonParse(this);
    this.sync = new AddonSync(this);
    this.syncList = new AddonSyncList(this);
    this.template = new AddonTemplate(this);
    this.knowledge = new Knowledge(this);
  }
}

export default Knowledge4Zotero;
