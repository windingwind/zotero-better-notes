import { config } from "../../package.json";

export class PluginCEBase extends XULElementBase {
  _addon!: typeof addon;
  useShadowRoot = false;

  connectedCallback(): void {
    // @ts-ignore - plugin instance
    this._addon = Zotero[config.addonInstance];
    Zotero.UIProperties.registerRoot(this);
    if (!this.useShadowRoot) {
      super.connectedCallback();
      return;
    }
    this.attachShadow({ mode: "open" });
    // Following the connectedCallback from XULElementBase
    let content: Node = this.content;
    if (content) {
      content = document.importNode(content, true);
      this.shadowRoot?.append(content);
    }

    MozXULElement.insertFTLIfNeeded("branding/brand.ftl");
    MozXULElement.insertFTLIfNeeded("zotero.ftl");
    if (document.l10n && this.shadowRoot) {
      document.l10n.connectRoot(this.shadowRoot);
    }

    // @ts-ignore
    window.addEventListener("unload", this._handleWindowUnload);

    // @ts-ignore
    this.initialized = true;
    this.init();
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
    const selector = `#${this._wrapID(key)}`;
    return (this.querySelector(selector) ||
      this.shadowRoot?.querySelector(selector)) as
      | XULElement
      | HTMLElement
      | null;
  }

  _parseContentID(dom: DocumentFragment) {
    dom.querySelectorAll("*[id]").forEach((elem) => {
      elem.id = this._wrapID(elem.id);
    });
    return dom;
  }
}
