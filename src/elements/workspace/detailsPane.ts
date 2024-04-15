import { config } from "../../../package.json";
const ItemDetails = customElements.get("item-details")! as any;

export class DetailsPane extends ItemDetails {
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
    super.init();
  }

  forceUpdateSideNav() {
    this._sidenav
      .querySelectorAll("toolbarbutton")
      .forEach((elem: HTMLElement) => (elem.parentElement!.hidden = true));
    super.forceUpdateSideNav();
  }
}
