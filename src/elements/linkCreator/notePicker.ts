import { config } from "../../../package.json";
import { VirtualizedTableHelper } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import { PluginCEBase } from "../base";

const _require = window.require;
const CollectionTree = _require("chrome://zotero/content/collectionTree.js");
const ItemTree = _require("chrome://zotero/content/itemTree.js");
const { getCSSItemTypeIcon } = _require("components/icons");

export class NotePicker extends PluginCEBase {
  itemsView!: _ZoteroTypes.ItemTree;
  collectionsView!: _ZoteroTypes.CollectionTree;
  openedNotesView!: VirtualizedTableHelper;

  openedNotes: Zotero.Item[] = [];

  activeSelectionType: "library" | "tabs" | "none" = "none";

  uid = Zotero.Utilities.randomString(8);

  get content() {
    return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/linkCreator/notePicker.css"
  ></html:link>
</linkset>
<vbox id="select-items-dialog" class="container">
  <vbox id="zotero-select-items-container" class="container" flex="1">
    <hbox id="search-toolbar" class="toolbar">
      <hbox class="toolbar-start"></hbox>
      <hbox class="toolbar-middle"></hbox>
      <hbox class="toolbar-end"></hbox>
    </hbox>
    <vbox class="container">
      <hbox id="collections-items-container">
        <vbox
          id="zotero-collections-tree-container"
          class="virtualized-table-container"
        >
          <html:div id="zotero-collections-tree"></html:div>
        </vbox>
        <hbox
          id="zotero-items-pane-content"
          class="virtualized-table-container"
          flex="1"
        >
          <html:div id="zotero-items-tree"></html:div>
        </hbox>
      </hbox>
      <vbox id="bn-select-opened-notes-container" class="container">
        <vbox
          id="bn-select-opened-notes-content"
          class="container virtualized-table-container"
        >
          <html:div id="bn-select-opened-notes-tree-${this.uid}"></html:div>
        </vbox>
      </vbox>
    </vbox>
  </vbox>
</vbox>
`);
  }

  set openedNoteIDs(ids: number[]) {
    this.openedNotes = Zotero.Items.get(ids).filter((item) => item.isNote());
    if (this.openedNotesView) {
      this.openedNotesView.render();
      return;
    }
  }

  async init() {
    window.addEventListener("unload", () => {
      this.destroy();
    });
  }

  destroy(): void {
    this.collectionsView.unregister();
    if (this.itemsView) this.itemsView.unregister();
  }

  async load() {
    await this.loadLibraryNotes();
    this.loadQuickSearch();
    await this.loadOpenedNotes();
  }

  async loadLibraryNotes() {
    this.itemsView = await ItemTree.init(
      this.querySelector("#zotero-items-tree"),
      {
        onSelectionChange: () => {
          this.onItemSelected();
        },
        id: "select-items-dialog",
        dragAndDrop: false,
        persistColumns: true,
        columnPicker: true,
        emptyMessage: Zotero.getString("pane.items.loading"),
      },
    );
    this.itemsView.isSelectable = (index: number, selectAll = false) => {
      const row = this.itemsView.getRow(index);
      if (!row) {
        return false;
      }
      // @ts-ignore
      if (!row.ref.isNote()) return false;
      if (this.itemsView.collectionTreeRow.isTrash()) {
        // @ts-ignore
        return row.ref.deleted;
      } else {
        // @ts-ignore
        return this.itemsView._searchItemIDs.has(row.id);
      }
    };
    this.itemsView.setItemsPaneMessage(Zotero.getString("pane.items.loading"));

    // Wait otherwise the collection tree will not be initialized
    await Zotero.Promise.delay(10);
    this.collectionsView = await CollectionTree.init(
      this.querySelector("#zotero-collections-tree"),
      {
        onSelectionChange: Zotero.Utilities.debounce(
          () => this.onCollectionSelected(),
          100,
        ),
      },
    );
    this.collectionsView.hideSources = ["duplicates", "trash", "feeds"];

    await this.collectionsView.makeVisible();
  }

  loadQuickSearch() {
    const searchBox = document.createXULElement("quick-search-textbox");
    searchBox.id = "zotero-tb-search";
    searchBox.setAttribute("timeout", "250");
    searchBox.setAttribute("dir", "reverse");
    searchBox.addEventListener("command", () => this.onSearch());
    this.querySelector("#search-toolbar > .toolbar-end")?.appendChild(
      searchBox,
    );

    // @ts-ignore
    searchBox.updateMode();
  }

  async loadOpenedNotes() {
    const renderLock = Zotero.Promise.defer();
    this.openedNotesView = new VirtualizedTableHelper(window)
      .setContainerId(`bn-select-opened-notes-tree-${this.uid}`)
      .setProp({
        id: `bn-select-opened-notes-table-${this.uid}`,
        columns: [
          {
            dataKey: "title",
            label: "Opened Notes",
            flex: 1,
          },
        ],
        showHeader: true,
        multiSelect: false,
        staticColumns: true,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => this.openedNotes.length || 0)
      .setProp("getRowData", (index) => {
        const note = this.openedNotes[index];
        return {
          title: note.getNoteTitle(),
        };
      })
      .setProp("onSelectionChange", (selection) => {
        this.onOpenedNoteSelected(selection);
      })
      // For find-as-you-type
      .setProp(
        "getRowString",
        (index) => this.openedNotes[index].getNoteTitle() || "",
      )
      .setProp("renderItem", (index, selection, oldElem, columns) => {
        let div;
        if (oldElem) {
          div = oldElem;
          div.innerHTML = "";
        } else {
          div = document.createElement("div");
          div.className = "row";
        }

        div.classList.toggle("selected", selection.isSelected(index));
        div.classList.toggle("focused", selection.focused == index);
        const rowData = this.openedNotes[index];

        for (const column of columns) {
          const span = document.createElement("span");
          // @ts-ignore
          span.className = `cell ${column?.className}`;
          span.textContent = rowData.getNoteTitle();
          const icon = getCSSItemTypeIcon("note");
          icon.classList.add("cell-icon");
          span.prepend(icon);
          div.append(span);
        }
        return div;
      })
      .render(-1, () => {
        renderLock.resolve();
      });
    await renderLock.promise;

    // if (this.openedNotes.length === 1) {
    //   this.openedNotesView.treeInstance.selection.select(0);
    // }
  }

  onSearch() {
    if (this.itemsView) {
      const searchVal = (
        this.querySelector("#zotero-tb-search-textbox") as HTMLInputElement
      )?.value;
      this.itemsView.setFilter("search", searchVal);
    }
  }

  async onCollectionSelected() {
    const collectionTreeRow = this.collectionsView.getRow(
      this.collectionsView.selection.focused,
    );
    if (!this.collectionsView.selection.count) return;
    // Collection not changed
    if (
      this.itemsView &&
      this.itemsView.collectionTreeRow &&
      this.itemsView.collectionTreeRow.id == collectionTreeRow.id
    ) {
      return;
    }
    // @ts-ignore
    if (!collectionTreeRow._bnPatched) {
      // @ts-ignore
      collectionTreeRow._bnPatched = true;
      const getItems = collectionTreeRow.getItems.bind(collectionTreeRow);
      // @ts-ignore
      collectionTreeRow.getItems = async function () {
        const items = (await getItems()) as Zotero.Item[];
        return items.filter((item) => item.isNote()) as unknown[];
      };
    }
    collectionTreeRow.setSearch("");
    Zotero.Prefs.set("lastViewedFolder", collectionTreeRow.id);

    this.itemsView.setItemsPaneMessage(Zotero.getString("pane.items.loading"));

    // Load library data if necessary
    const library = Zotero.Libraries.get(collectionTreeRow.ref.libraryID);
    if (library) {
      if (!library.getDataLoaded("item")) {
        Zotero.debug(
          "Waiting for items to load for library " + library.libraryID,
        );
        await library.waitForDataLoad("item");
      }
    }

    await this.itemsView.changeCollectionTreeRow(collectionTreeRow);

    this.itemsView.clearItemsPaneMessage();

    this.collectionsView.runListeners("select");
  }

  onItemSelected() {
    this.activeSelectionType = "library";
    this.dispatchSelectionChange();
  }

  onOpenedNoteSelected(selection: { selected: Set<number> }) {
    this.activeSelectionType = "tabs";
    this.dispatchSelectionChange(selection);
  }

  dispatchSelectionChange(selection?: { selected: Set<number> }) {
    this.dispatchEvent(
      new CustomEvent("selectionchange", {
        detail: {
          selectedNote: this.getSelectedNotes(selection)[0],
        },
      }),
    );
  }

  getSelectedNotes(selection?: { selected: Set<number> }): Zotero.Item[] {
    if (this.activeSelectionType == "none") {
      return [];
    } else if (this.activeSelectionType == "library") {
      return this.itemsView.getSelectedItems();
    }
    return Array.from(
      (selection || this.openedNotesView.treeInstance.selection).selected,
    ).map((index) => this.openedNotes[index]);
  }
}
