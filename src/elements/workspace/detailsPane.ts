import { config } from "../../../package.json";
import {
  getPrefJSON,
  registerPrefObserver,
  setPref,
  unregisterPrefObserver,
} from "../../utils/prefs";

const ItemDetails = document.createXULElement("item-details")
  .constructor! as any;

const persistKey = "persist.workspaceContext";

export class DetailsPane extends ItemDetails {
  _prefObserverID!: symbol;

  get pinnedPane() {
    // @ts-ignore super
    return super.pinnedPane;
  }

  set pinnedPane(val) {
    // @ts-ignore super
    super.pinnedPane = val;
    this._persistState();
  }

  content = MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace/details.css"
  ></html:link>
</linkset>
<hbox id="zotero-view-item-container" class="zotero-view-item-container" flex="1">
  <html:div class="zotero-view-item-main">
		<pane-header id="zotero-item-pane-header" />
    <html:div id="zotero-view-item" class="zotero-view-item" tabindex="0">
      <tags-box id="zotero-editpane-tags" class="zotero-editpane-tags" data-pane="tags" />

      <bn-related-box id="zotero-editpane-related" class="zotero-editpane-related"
        data-pane="related" />
    </html:div>
  </html:div>
</hbox>`);

  init() {
    MozXULElement.insertFTLIfNeeded(`${config.addonRef}-notePreview.ftl`);
    MozXULElement.insertFTLIfNeeded(`${config.addonRef}-noteRelation.ftl`);

    this._prefObserverID = registerPrefObserver(
      persistKey,
      this._restoreState.bind(this),
    );
    super.init();
  }

  destroy() {
    unregisterPrefObserver(this._prefObserverID);
    super.destroy();
  }

  render() {
    super.render();
    this._restoreState();
  }

  forceUpdateSideNav() {
    this._sidenav
      .querySelectorAll("toolbarbutton")
      .forEach((elem: HTMLElement) => (elem.parentElement!.hidden = true));
    super.forceUpdateSideNav();
  }

  _restorePinnedPane() {}

  _persistState() {
    let state = getPrefJSON(persistKey);

    if (state?.pinnedPane === this.pinnedPane) {
      return;
    }

    state = {
      ...state,
      pinnedPane: this.pinnedPane,
    };

    setPref(persistKey, JSON.stringify(state));
  }

  _restoreState() {
    const state = getPrefJSON(persistKey);

    this.pinnedPane = state?.pinnedPane;
    this.scrollToPane(this.pinnedPane);
  }
}
