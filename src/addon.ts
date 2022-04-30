import AddonEvents from "./events";
import AddonViews from "./views";
import AddonPrefs from "./prefs";
import { Knowledge } from "./knowledge";

class Knowledge4Zotero {
  public events: AddonEvents;
  public views: AddonViews;
  public prefs: AddonPrefs;
  public knowledge: Knowledge;

  constructor() {
    this.events = new AddonEvents(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
    this.knowledge = new Knowledge(this);
  }
}

export default Knowledge4Zotero;
