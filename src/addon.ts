import AddonEvents from "./events";
import AddonViews from "./views";
import AddonPrefs from "./prefs";

class Knowledge4Zotero {
  public events: AddonEvents;
  public views: AddonViews;
  public prefs: AddonPrefs;

  constructor() {
    this.events = new AddonEvents(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
  }
}

export default Knowledge4Zotero;
