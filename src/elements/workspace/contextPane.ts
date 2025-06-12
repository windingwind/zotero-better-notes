import { config } from "../../../package.json";
import { PluginCEBase } from "../base";
import { DetailsPane } from "./detailsPane";

export class ContextPane extends PluginCEBase {
  _item?: Zotero.Item;

  _details!: DetailsPane;
  _sidenav: any;

  get item() {
    return this._item;
  }

  set item(val) {
    this._item = val;
  }

  get content() {
    return this._parseContentID(
      MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace/context.css"
  ></html:link>
</linkset>
<bn-details id="container" class="container"></bn-details>
<item-pane-sidenav id="sidenav"></item-pane-sidenav>
`),
    );
  }

  init(): void {
    this._details = this._queryID("container") as unknown as DetailsPane;
    this._sidenav = this._queryID("sidenav");

    // Make sure the item-pane-sidenav works after https://github.com/zotero/zotero/commit/3102b6b67a3866514e062c653c4c4d7d03f4e1fb
    if (typeof (globalThis as any).Zotero_Tabs === "undefined") {
      (globalThis as any).Zotero_Tabs = {
        selectedType: "unknown",
      };
    }
  }

  render() {
    if (!this.item) return;
    this._details.editable = this.item.isEditable();
    this._details.item = this.item;
    this._details.parentID = this.item.parentID;
    this._details.sidenav = this._sidenav;
    this._details.render();
    this._sidenav.toggleDefaultStatus();
  }
}
