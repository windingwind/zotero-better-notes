import { config } from "../../../package.json";
import { VirtualizedTableHelper } from "zotero-plugin-toolkit";
import { PluginCEBase } from "../base";
import TreeModel = require("tree-model");

export class OutlinePicker extends PluginCEBase {
  _item?: Zotero.Item;
  _lineIndex?: number;

  noteOutlineView!: VirtualizedTableHelper;
  noteOutline: TreeModel.Node<NoteNodeData>[] = [];

  uid = Zotero.Utilities.randomString(8);

  get content() {
    return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/linkCreator/noteOutline.css"
  ></html:link>
</linkset>
<hbox class="toolbar">
  <hbox class="toolbar-start"></hbox>
  <hbox class="toolbar-middle"></hbox>
  <hbox class="toolbar-end"></hbox>
</hbox>
<vbox id="bn-select-note-outline-container">
  <vbox
    id="bn-select-note-outline-content"
    class="virtualized-table-container"
  >
    <html:div id="bn-select-note-outline-tree-${this.uid}"></html:div>
  </vbox>
</vbox>
<hbox id="bn-link-insert-position-container">
  <label>At section</label>
  <radiogroup id="bn-link-insert-position" orient="horizontal">
    <radio
      id="bn-link-insert-position-top"
      label="Start"
      value="start"
    ></radio>
    <radio
      id="bn-link-insert-position-bottom"
      label="End"
      value="end"
    ></radio>
  </radiogroup>
</hbox>
`);
  }

  get item() {
    return this._item;
  }

  set item(item: Zotero.Item | undefined) {
    this._item = item;
  }

  set lineIndex(index: number | undefined) {
    this._lineIndex = index;
  }

  get lineIndex() {
    return this._lineIndex;
  }

  async load() {
    this.loadNoteOutline();
  }

  async loadNoteOutline() {
    const renderLock = Zotero.Promise.defer();
    this.noteOutlineView = new VirtualizedTableHelper(window)
      .setContainerId(`bn-select-note-outline-tree-${this.uid}`)
      .setProp({
        id: `bn-select-note-outline-table-${this.uid}`,
        columns: [
          {
            dataKey: "level",
            label: "Level",
            width: 50,
            staticWidth: true,
          },
          {
            dataKey: "name",
            label: "Table of Contents",
            flex: 1,
          },
        ],
        showHeader: true,
        multiSelect: false,
        staticColumns: true,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => this.noteOutline.length || 0)
      .setProp("getRowData", (index) => {
        const model = this.noteOutline[index]?.model;
        if (!model) return { level: 0, name: "**Unknown**" };
        return {
          level: model.level,
          name:
            (model.level > 0 ? "··".repeat(model.level - 1) : "") + model.name,
        };
      })
      .setProp("onSelectionChange", (selection) => {
        this.onOutlineSelected(selection);
      })
      // For find-as-you-type
      .setProp(
        "getRowString",
        (index) => this.noteOutline[index]?.model.name || "",
      )
      .render(-1, () => {
        renderLock.resolve();
      });
    await renderLock.promise;

    // if (openedNotes.length === 1) {
    //   openedNotesView.treeInstance.selection.select(0);
    // }
  }

  onOutlineSelected(selection: { selected: Set<number> }) {
    this.dispatchSelectionChange(selection);
  }

  async render() {
    if (!this.item) {
      return;
    }
    this.noteOutline = await this._addon.api.note.getNoteTreeFlattened(
      this.item,
    );
    // Fake a cursor position
    if (typeof this.lineIndex === "number") {
      // @ts-ignore - formatValues is not in the types
      const [name] = (await document?.l10n?.formatValues([
        {
          id: `${config.addonRef}-outlinePicker-cursorLine`,
          args: { line: this.lineIndex },
        },
      ])) as string[];
      this.noteOutline.unshift({
        model: {
          level: 0,
          name,
          lineIndex: this._lineIndex,
          endIndex: this._lineIndex,
        },
      } as any);
    }

    this.noteOutlineView?.render(undefined);
  }

  dispatchSelectionChange(selection: { selected: Set<number> }) {
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          selectedSection: this.getSelectedSection(selection),
        },
      }),
    );
  }

  getSelectedSection(selection?: { selected: Set<number> }): NoteNodeData {
    const selected = (
      selection || this.noteOutlineView.treeInstance.selection
    ).selected
      .values()
      .next().value;
    return this.noteOutline[selected!]?.model;
  }
}
