import { config } from "../../package.json";
import { PluginCEBase } from "./base";

export class ContextPane extends PluginCEBase {
  _item?: Zotero.Item;

  _details!: any;
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
    href="chrome://${config.addonRef}/content/styles/context.css"
  ></html:link>
</linkset>
<bn-details id="container" class="container"></bn-details>
<item-pane-sidenav id="sidenav"></item-pane-sidenav>
`),
    );
  }

  init(): void {
    this._details = this._queryID("container");
    this._sidenav = this._queryID("sidenav");
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
