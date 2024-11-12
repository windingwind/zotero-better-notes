import { EditorState, Plugin, PluginKey, Transaction } from "prosemirror-state";

import { Popup } from "./popup";
import { formatMessage } from "./editorStrings";

export { initMagicKeyPlugin, MagicKeyOptions };

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

interface MagicKeyOptions {
  insertTemplate?: () => void;
  insertLink?: (type: "inbound" | "outbound") => void;
  copyLink?: (mode: "section" | "line") => void;
  openAttachment?: () => void;
  canOpenAttachment?: () => boolean;
  enable?: boolean;
}

interface MagicCommand {
  messageId?: string;
  title?: string;
  icon?: string;
  command: (state: EditorState) => void | Transaction;
  enabled?: (state: EditorState) => boolean;
}

class PluginState {
  state: EditorState;

  options: MagicKeyOptions;

  _commands: MagicCommand[] = [
    {
      messageId: "insertTemplate",
      command: (state) => {
        this.options.insertTemplate?.();
      },
    },
    {
      messageId: "outboundLink",
      command: (state) => {
        this.options.insertLink?.("outbound");
      },
    },
    {
      messageId: "inboundLink",
      command: (state) => {
        this.options.insertLink?.("inbound");
      },
    },
    {
      messageId: "insertCitation",
      command: (state) => {
        getPlugin("citation")?.insertCitation();
      },
    },
    {
      messageId: "openAttachment",
      command: (state) => {
        this.options.openAttachment?.();
      },
      enabled: (state) => {
        return this.options.canOpenAttachment?.() || false;
      },
    },
    {
      messageId: "copySectionLink",
      command: (state) => {
        this.options.copyLink?.("section");
      },
    },
    {
      messageId: "copyLineLink",
      command: (state) => {
        this.options.copyLink?.("line");
      },
    },
    {
      messageId: "table",
      command: (state) => {
        const input = prompt(
          "Enter the number of rows and columns, separated by a comma (e.g., 3,3)",
        );
        if (!input) {
          return state.tr;
        }
        const splitter = input.includes("x")
          ? "x"
          : input.includes(",")
            ? ","
            : " ";
        const [rows, cols] = input.split(splitter).map((n) => parseInt(n, 10));
        if (isNaN(rows) || isNaN(cols)) {
          return state.tr;
        }
        const { tr, selection } = state;
        const { $from, $to } = selection;
        const { pos } = $from;
        const table = state.schema.nodes.table.createAndFill(
          {},
          Array.from(
            { length: rows },
            () =>
              state.schema.nodes.table_row.createAndFill(
                {},
                Array.from(
                  { length: cols },
                  () => state.schema.nodes.table_cell.createAndFill()!,
                ),
              )!,
          ),
        )!;
        tr.replaceWith(pos, pos, table);
        _currentEditorInstance._editorCore.view.dispatch(tr);
      },
    },
    {
      messageId: "heading1",
      command: (state) => {
        getPlugin()?.heading1.run();
      },
    },
    {
      messageId: "heading2",
      command: (state) => {
        getPlugin()?.heading2.run();
      },
    },
    {
      messageId: "heading3",
      command: (state) => {
        getPlugin()?.heading3.run();
      },
    },
    {
      messageId: "paragraph",
      command: (state) => {
        getPlugin()?.paragraph.run();
      },
    },
    {
      messageId: "monospaced",
      command: (state) => {
        getPlugin()?.codeBlock.run();
      },
    },
    {
      messageId: "bulletList",
      command: (state) => {
        getPlugin()?.bulletList.run();
      },
    },
    {
      messageId: "orderedList",
      command: (state) => {
        getPlugin()?.orderedList.run();
      },
    },
    {
      messageId: "blockquote",
      command: (state) => {
        getPlugin()?.blockquote.run();
      },
    },
    {
      messageId: "mathBlock",
      command: (state) => {
        getPlugin()?.math_display.run();
      },
    },
    {
      messageId: "clearFormatting",
      command: (state) => {
        getPlugin()?.clearFormatting.run();
      },
    },
  ];

  get commands() {
    return this._commands.filter((command) => {
      if (command.enabled) {
        return command.enabled(this.state);
      }
      return true;
    });
  }

  popup: Popup | null = null;

  selectedCommandIndex = 0;

  get node() {
    const node =
      // @ts-ignore - private API
      _currentEditorInstance._editorCore.view.domSelection().anchorNode;
    if (node.nodeType === Node.TEXT_NODE) {
      return node.parentElement;
    }
    return node;
  }

  popupClass = "command-palette";

  constructor(state: EditorState, options: MagicKeyOptions) {
    this.state = state;
    this.options = options;

    const locale = window.navigator.language || "en-US";
    for (const key in this.commands) {
      const command = this.commands[key];
      if (command.messageId) {
        command.title = formatMessage(command.messageId, locale);
      }
    }

    this.update(state);
  }

  update(state: EditorState, prevState?: EditorState) {
    this.state = state;

    if (!prevState || prevState.doc.eq(state.doc)) {
      return;
    }
    // When `/` is pressed, we should open the command palette
    const selectionText = state.doc.textBetween(
      state.selection.from,
      state.selection.to,
    );
    if (!selectionText) {
      const { $from } = this.state.selection;
      const { parent } = $from;
      // Don't open the popup if we are in the document root
      if (parent.type.name === "doc") {
        return;
      }
      const text = parent.textContent;
      if (text.endsWith("/") && !text.endsWith("//")) {
        this._openPopup(state);
      } else {
        this._closePopup();
      }
    }
  }

  destroy() {
    this.popup?.remove();
  }

  handleKeydown = async (event: KeyboardEvent) => {
    if (!this._hasPopup()) {
      return;
    }

    if (event.key === "Escape") {
      this._closePopup();
    }
  };

  _openPopup(state: EditorState) {
    if (this._hasPopup()) {
      return;
    }
    this.popup = new Popup(document, this.popupClass, [
      document.createRange().createContextualFragment(`
<style>
  .${this.popupClass} > .popup {
    max-width: 360px;
    max-height: 360px;
    overflow: hidden;
  }
  .${this.popupClass} > .popup input {
    padding: 0 7px;
    background: var(--material-background);
    border-radius: 5px;
    border: var(--material-border-quinary);
    width: 100%;
    outline: none;
    height: 28px;
    flex-shrink: 0;
  }
  .${this.popupClass} > .popup input:focus {
    outline: none;
    border-color: rgba(0, 0, 0, 0);
    box-shadow: 0 0 0 var(--width-focus-border) var(--color-focus-search);
  }
  .${this.popupClass} .popup-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }
  .${this.popupClass} .popup-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden auto;
  }
  .${this.popupClass} .popup-item {
    padding: 6px;
    cursor: pointer;
    border-radius: 5px;
  }
  .${this.popupClass} .popup-item:hover {
    background-color: var(--fill-senary);
  }
  .${this.popupClass} .popup-item.selected {
    background-color: var(--color-accent);
    color: #fff;
  }
</style>
<div class="popup-content">
  <input type="text" class="popup-input" placeholder="Search commands" />
  <div class="popup-list" tabindex="-1">
    ${Object.entries(this.commands)
      .map(
        ([id, command]) => `
      <div class="popup-item" data-command-id="${id}">
        <div class="popup-item-icon">${command.icon || ""}</div>
        <div class="popup-item-title">${command.title}</div>
      </div>`,
      )
      .join("")}
  </div>
</div>`),
    ]);

    this.popup.layoutPopup(this);

    // Focus the input
    const input = this.popup.container.querySelector(
      ".popup-input",
    ) as HTMLInputElement;
    input.focus();

    // Handle input
    input.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      const value = target.value;
      for (const [id, command] of Object.entries(this.commands)) {
        const item = this.popup!.container.querySelector(
          `.popup-item[data-command-id="${id}"]`,
        ) as HTMLElement;
        const matchedIndex = command
          .title!.toLowerCase()
          .indexOf(value.toLowerCase());
        if (matchedIndex >= 0) {
          // Change the matched part to bold
          const title = command.title!;
          item.querySelector(".popup-item-title")!.innerHTML =
            title.slice(0, matchedIndex) +
            `<b>${title.slice(matchedIndex, matchedIndex + value.length)}</b>` +
            title.slice(matchedIndex + value.length);
          item.hidden = false;
        } else {
          item.hidden = true;
        }
      }
      this._selectCommand();
    });

    input.addEventListener("blur", () => {
      if (__env__ === "development") {
        return;
      }
      this._closePopup();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        this._selectCommand(this.selectedCommandIndex - 1, "up");
        event.preventDefault();
      } else if (event.key === "ArrowDown") {
        this._selectCommand(this.selectedCommandIndex + 1, "down");
        event.preventDefault();
      } else if (event.key === "ArrowLeft") {
        // Select the first command
        this._selectCommand(this.commands.length, "up");
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        // Select the last command
        this._selectCommand(-1, "down");
        event.preventDefault();
      } else if (event.key === "Tab") {
        // If has input, autocomplete the selected command to the first space
        const command = this.commands[this.selectedCommandIndex];
        if (!command) {
          return;
        }
        if (!input.value) {
          return;
        }
        const title = command.title!;
        // Compute after the matched part
        const matchedIndex = title
          .toLowerCase()
          .indexOf(input.value.toLowerCase());
        const spaceIndex = title.indexOf(
          " ",
          matchedIndex + input.value.length,
        );
        if (spaceIndex >= 0) {
          input.value = title.slice(0, spaceIndex);
        } else {
          input.value = title;
        }
        event.preventDefault();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const command = this.commands[this.selectedCommandIndex];
        if (!command) {
          this._closePopup();
          return;
        }
        this._executeCommand(this.selectedCommandIndex, state);
      } else if (event.key === "Escape") {
        event.preventDefault();
        this._closePopup();
      } else if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
        this._closePopup();
        this.removeInputSlash(state);
      }
    });

    this.popup.container.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as HTMLElement;
      // Find the command
      const item = target.closest(".popup-item");
      if (!item) {
        return;
      }
      const index = Array.from(item.parentElement!.children).indexOf(item);

      this._executeCommand(index, state);
    });

    this._selectCommand(0);
  }

  _closePopup() {
    if (!this._hasPopup()) {
      return;
    }
    document
      .querySelectorAll(`.${this.popupClass}`)
      .forEach((el) => el.remove());
    this.popup = null;
    window.BetterNotesEditorAPI.refocusEditor();
  }

  _hasPopup() {
    return !!document.querySelector(`.${this.popupClass}`);
  }

  _selectCommand(index?: number, direction: "up" | "down" = "down") {
    if (typeof index === "undefined") {
      index = this.selectedCommandIndex;
    }
    // Unselect the previous command
    this.popup!.container.querySelectorAll(".popup-item.selected").forEach(
      (el) => {
        el.classList.remove("selected");
      },
    );

    if (!this._hasPopup()) {
      return;
    }
    const items = this.popup!.container.querySelectorAll(
      ".popup-item",
    ) as NodeListOf<HTMLElement>;
    if (items[index]?.hidden) {
      // Will find the next visible item in the specified direction
      if (direction === "up") {
        for (let i = index - 1; i >= 0; i--) {
          if (!items[i].hidden) {
            index = i;
            break;
          }
        }
      } else if (direction === "down") {
        for (let i = index + 1; i < items.length; i++) {
          if (!items[i].hidden) {
            index = i;
            break;
          }
        }
      }
    }
    if (index >= items.length) {
      // Find the first visible item with :first-of-type
      const item = this.popup!.container.querySelector(
        ".popup-item:not([hidden])",
      ) as HTMLElement;
      index = parseInt(item?.dataset.commandId || "-1", 10);
    } else if (index < 0) {
      // Find the last visible item with :last-of-type
      const visibleItems = this.popup!.container.querySelectorAll(
        ".popup-item:not([hidden])",
      );
      const item = visibleItems[visibleItems.length - 1] as HTMLElement;
      index = parseInt(item?.dataset.commandId || "-1", 10);
    }

    if (index < 0) {
      this.selectedCommandIndex = -1;
      return;
    }
    this.selectedCommandIndex = index;
    items[index].classList.add("selected");
    // Record the scroll position of the top document
    const scrollTop = document.querySelector(".editor-core")!.scrollTop;
    items[index].scrollIntoView({
      block: "center",
    });
    // Restore the scroll position
    document.querySelector(".editor-core")!.scrollTop = scrollTop;
  }

  _executeCommand(index: number, state: EditorState) {
    const command = this.commands[index];
    if (!command) {
      return;
    }
    // Remove the current input `/`
    this.removeInputSlash(state);

    const newState = _currentEditorInstance._editorCore.view.state;

    // Apply the command
    try {
      const mightBeTr = command.command(newState);
      if (mightBeTr) {
        _currentEditorInstance._editorCore.view.dispatch(mightBeTr);
      }
    } catch (error) {
      console.error("Error applying command", error);
    }

    this._closePopup();
  }

  removeInputSlash(state: EditorState) {
    const { $from } = state.selection;
    const { pos } = $from;
    const tr = state.tr.delete(pos - 1, pos);
    _currentEditorInstance._editorCore.view.dispatch(tr);
  }
}

function initMagicKeyPlugin(
  plugins: readonly Plugin[],
  options: MagicKeyOptions,
) {
  console.log("Init BN Magic Key Plugin");
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
          keydown: (view, event) => {
            const pluginState = key.getState(view.state) as PluginState;
            pluginState.handleKeydown(event);
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

function getPlugin(key = "menu") {
  return _currentEditorInstance._editorCore.pluginState[key] as any;
}
