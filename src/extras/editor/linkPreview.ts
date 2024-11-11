import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Popup } from "./popup";

export { initLinkPreviewPlugin, LinkPreviewOptions };

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

interface LinkPreviewOptions {
  setPreviewContent: (
    link: string,
    setContent: (content: string) => void,
  ) => void;

  openURL: (url: string) => void;

  previewType: "hover" | "ctrl" | "disable";
}

class PluginState {
  state: EditorState;

  options: LinkPreviewOptions;

  popup: Popup | null = null;

  node: HTMLElement | null = null;

  currentLink: string | null = null;

  hasHover = false;

  constructor(state: EditorState, options: LinkPreviewOptions) {
    this.state = state;
    this.options = options;
    this.update(state);
  }

  update(state: EditorState, prevState?: EditorState) {
    this.state = state;

    if (this.options.previewType === "disable") {
      return;
    }

    if (
      prevState &&
      prevState.doc.eq(state.doc) &&
      prevState.selection.eq(state.selection)
    ) {
      return;
    }
    // Handle selection change
    setTimeout(() => {
      this.popup?.layoutPopup(this);
    }, 10);
  }

  destroy() {
    this.popup?.remove();
  }

  handleMouseMove = async (event: MouseEvent) => {
    if (this.options.previewType === "disable") {
      return;
    }

    const { target } = event;

    let isValid = false;
    if (target instanceof HTMLElement) {
      const href = target.closest("a")?.getAttribute("href");
      if (href?.startsWith("zotero://note/")) {
        isValid = true;
        if (this.currentLink !== href) {
          this.node = target;
          this.currentLink = href;
          this.hasHover = true;
          this.tryOpenPopupByHover();
        }
      }
    }

    if (!isValid && this.currentLink) {
      this.hasHover = false;
      this.currentLink = null;
      this.tryClosePopup();
    }
  };

  handleKeydown = async (event: KeyboardEvent) => {
    if (this.options.previewType !== "ctrl") {
      return;
    }

    if (!this.hasHover || !this.currentLink) {
      return;
    }
    const isMac =
      typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
    if ((isMac && event.metaKey) || (!isMac && event.ctrlKey)) {
      this.tryTogglePopupByKey();
    }
  };

  tryOpenPopupByHover() {
    if (this.options.previewType !== "hover") {
      return;
    }

    const href = this.currentLink!;
    setTimeout(() => {
      if (this.currentLink === href) {
        this._openPopup();
      }
    }, 300);
  }

  tryTogglePopupByKey() {
    if (this._hasPopup()) {
      this._closePopup();
    } else {
      this._openPopup();
    }
  }

  _openPopup() {
    console.log("Enter Link Preview", this.currentLink, this.options);
    document.querySelectorAll(".link-preview").forEach((el) => el.remove());
    this.popup = new Popup(document, "link-preview", [
      document.createRange().createContextualFragment(`
<style>
  .link-preview > .popup {
    max-width: 360px;
    max-height: 360px;
    overflow: hidden auto;
  }
  .link-preview > .popup > * {
    margin-block: 0;
  }
  .link-preview .primary-editor img:not(.ProseMirror-separator) {
    max-width: 100%;
    height: auto;
  }
  .link-preview .primary-editor li {
    white-space: nowrap;
  }
</style>`),
    ]);
    this.popup.popup.classList.add("primary-editor");
    this.popup.container.style.display = "none";

    this.popup.layoutPopup(this);

    this.options.setPreviewContent(this.currentLink!, (content: string) => {
      this.popup?.popup.append(
        document.createRange().createContextualFragment(content),
      );
      this.popup!.container.style.removeProperty("display");
      this.popup?.layoutPopup(this);
    });

    this.popup.container.addEventListener("mouseleave", () => {
      this.currentLink = null;
      this.tryClosePopup();
    });

    this.popup.container.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as HTMLElement;
      if (target.localName === "a") {
        const href = target.getAttribute("href");
        if (href) {
          this.options.openURL(href);
        }
      }
      this._closePopup();
    });
  }

  tryClosePopup() {
    setTimeout(() => {
      console.log("Close Link Preview", this.currentLink, this.popup?.hasHover);
      if (this.hasHover || this.popup?.hasHover) {
        return;
      }
      this._closePopup();
    }, 300);
  }

  _closePopup() {
    this.node = null;
    document.querySelectorAll(".link-preview").forEach((el) => el.remove());
    this.popup = null;
  }

  _hasPopup() {
    return !!document.querySelector(".link-preview");
  }
}

function initLinkPreviewPlugin(
  plugins: readonly Plugin[],
  options: LinkPreviewOptions,
) {
  const core = _currentEditorInstance._editorCore;
  console.log("Init BN Link Preview Plugin");
  const key = new PluginKey("linkPreviewPlugin");
  return [
    ...plugins,
    new Plugin({
      key,
      state: {
        init(config, state) {
          return new PluginState(state, options);
        },
        apply: (tr, pluginState, oldState, newState) => {
          pluginState.update(newState, oldState);
          return pluginState;
        },
      },
      props: {
        handleDOMEvents: {
          mousemove: (view, event) => {
            const pluginState = key.getState(view.state) as PluginState;
            pluginState.update(view.state);
            pluginState.handleMouseMove(event);
          },
          keydown: (view, event) => {
            const pluginState = key.getState(view.state) as PluginState;
            pluginState.handleKeydown(event);
          },
          wheel: (view, event) => {
            const pluginState = key.getState(view.state) as PluginState;
            pluginState.popup?.layoutPopup(pluginState);
          },
        },
      },
      view: (editorView) => {
        return {
          update(view, prevState) {
            const pluginState = key.getState(view.state) as PluginState;
            pluginState.update(view.state, prevState);
          },
          destroy() {
            const pluginState = key.getState(editorView.state) as PluginState;
            pluginState.destroy();
          },
        };
      },
    }),
  ];
}
