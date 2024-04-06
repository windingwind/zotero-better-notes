// @ts-nocheck
import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import { slice } from "../utils/str";
import { waitUtilAsync } from "../utils/wait";

const RelatedBox = customElements.get("related-box")! as typeof XULElementBase;

const _require = window.require;
const { getCSSItemTypeIcon } = _require("components/icons");

export class NoteRelatedBox extends RelatedBox {
  content = MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/related.css"
  ></html:link>
</linkset>
<collapsible-section
  data-l10n-id="section-related"
  data-pane="related"
  extra-buttons="add"
>
  <html:div class="body" />
</collapsible-section>`);

  // Following code is from chrome/content/zotero/elements/relatedBox.js
  render() {
    if (!this.item) return;
    if (this._isAlreadyRendered()) return;

    const body = this.querySelector(".body");
    body.replaceChildren();

    if (this._item) {
      const relatedKeys = this._item.relatedItems;
      for (let i = 0; i < relatedKeys.length; i++) {
        const key = relatedKeys[i];
        const relatedItem = Zotero.Items.getByLibraryAndKey(
          this._item.libraryID,
          key,
        );
        if (!relatedItem) {
          Zotero.debug(
            `Related item ${this._item.libraryID}/${key} not found ` +
              `for item ${this._item.libraryKey}`,
            2,
          );
          continue;
        }
        const id = relatedItem.id;

        const row = document.createElement("div");
        row.className = "row";

        const icon = getCSSItemTypeIcon(relatedItem.getItemTypeIconName());

        const label = document.createElement("span");
        label.className = "label";
        label.append(relatedItem.getDisplayTitle());

        const box = document.createElement("div");
        box.addEventListener("click", () => this._handleShowItem(id));
        box.setAttribute("tabindex", "0");
        box.className = "box keyboard-clickable";
        box.appendChild(icon);
        box.appendChild(label);
        row.append(box);

        // Extra button to open note
        if (relatedItem.isNote()) {
          const note = document.createXULElement("toolbarbutton");
          note.addEventListener("command", (event) => {
            const position = event.shiftKey ? "window" : "tab";
            Zotero[config.addonRef].hooks.onOpenNote(id, position);
          });
          note.className = "zotero-clicky zotero-clicky-open-link";
          note.setAttribute("tabindex", "0");
          row.append(note);
        }

        if (
          this.editable &&
          (!relatedItem.isNote() ||
            !getPref("workspace.autoUpdateRelatedNotes"))
        ) {
          const remove = document.createXULElement("toolbarbutton");
          remove.addEventListener("command", () => this._handleRemove(id));
          remove.className = "zotero-clicky zotero-clicky-minus";
          remove.setAttribute("tabindex", "0");
          row.append(remove);
        }

        body.append(row);
      }
      this._updateCount();
    }
  }

  _handleShowItem(id: number) {
    const item = Zotero.Items.get(id);
    if (!item) return;
    if (!item.isNote()) {
      // @ts-ignore
      return super._handleShowItem(id);
    }
    openNotePreview(item, this.closest("bn-workspace")?.dataset.uid);
  }
}

function openNotePreview(noteItem: Zotero.Item, workspaceUID: string) {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: `bn-note-preview-${workspaceUID}-${noteItem.id}`,
    pluginID: config.addonID,
    header: {
      icon: "chrome://zotero/skin/16/universal/note.svg",
      l10nID: `${config.addonRef}-note-preview-header`,
    },
    sidenav: {
      icon: "chrome://zotero/skin/20/universal/note.svg",
      l10nID: `${config.addonRef}-note-preview-sidenav`,
      l10nArgs: JSON.stringify({ title: noteItem.getNoteTitle() }),
    },
    bodyXHTML: `<note-editor class="bn-note-preview"></note-editor>`,
    sectionButtons: [
      {
        type: "openNote",
        icon: "chrome://zotero/skin/16/universal/open-link.svg",
        l10nID: `${config.addonRef}-note-preview-open`,
        onClick: ({ event }) => {
          const position = event.shiftKey ? "window" : "tab";
          Zotero[config.addonRef].hooks.onOpenNote(noteItem.id, position);
        },
      },
      {
        type: "closePreview",
        icon: "chrome://zotero/skin/16/universal/minus.svg",
        l10nID: `${config.addonRef}-note-preview-close`,
        onClick: () => {
          Zotero.ItemPaneManager.unregisterSection(key);
        },
      },
    ],
    onItemChange: ({ body, tabType, setEnabled }) => {
      if (body.closest("bn-workspace")?.dataset.uid !== workspaceUID) {
        setEnabled(false);
        return;
      }
      setEnabled(true);
    },
    onRender: ({ setSectionSummary }) => {
      setSectionSummary(noteItem.getNoteTitle());
    },
    onAsyncRender: async ({ body }) => {
      const editorElement = body.querySelector("note-editor")! as EditorElement;
      await waitUtilAsync(() => Boolean(editorElement._initialized));
      if (!editorElement._initialized) {
        throw new Error("initNoteEditor: waiting initialization failed");
      }
      editorElement.mode = "edit";
      editorElement.viewMode = "library";
      editorElement.parent = noteItem?.parentItem;
      editorElement.item = noteItem;
      await waitUtilAsync(() => Boolean(editorElement._editorInstance));
      await editorElement._editorInstance._initPromise;
    },
  });
}
