import { config } from "../../package.json";

export class PluginCEBase extends XULElementBase {
  _addon!: typeof addon;

  connectedCallback(): void {
    this._addon = Zotero[config.addonInstance];
    Zotero.UIProperties.registerRoot(this);
    super.connectedCallback();
  }

  _wrapID(key: string) {
    if (key.startsWith(config.addonRef)) {
      return key;
    }
    return `${config.addonRef}-${key}`;
  }

  _unwrapID(id: string) {
    if (id.startsWith(config.addonRef)) {
      return id.slice(config.addonRef.length + 1);
    }
    return id;
  }

  _queryID(key: string) {
    return this.querySelector(`#${this._wrapID(key)}`) as XUL.Element | null;
  }

  _parseContentID(dom: DocumentFragment) {
    dom.querySelectorAll("*[id]").forEach((elem) => {
      elem.id = this._wrapID(elem.id);
    });
    return dom;
  }

  _loadPersist() {
    const persistValues = Zotero.Prefs.get("pane.persist") as string;
    if (!persistValues) return;
    const serializedValues = JSON.parse(persistValues) as Record<
      string,
      Record<string, string>
    >;

    for (const id in serializedValues) {
      const el = this.querySelector(`#${id}`) as HTMLElement;
      if (!el) {
        continue;
      }

      const elValues = serializedValues[id];
      for (const attr in elValues) {
        el.setAttribute(attr, elValues[attr]);
        if (["width", "height"].includes(attr)) {
          el.style[attr as any] = `${elValues[attr]}px`;
        }
      }
    }
  }
}
