import { config } from "../../../package.json";
import { getLinkedNotesRecursively, getNoteLink } from "../../utils/link";
import { getString } from "../../utils/locale";
import { jointPath } from "../../utils/str";
import { isWindowAlive } from "../../utils/window";

export interface SyncDataType {
  noteId: number;
  noteName: string;
  lastSync: string;
  filePath: string;
}

export async function showSyncManager() {
  if (isWindowAlive(addon.data.sync.manager.window)) {
    addon.data.sync.manager.window?.focus();
    refresh();
  } else {
    const windowArgs = {
      _initPromise: Zotero.Promise.defer(),
    };
    const win = window.openDialog(
      `chrome://${config.addonRef}/content/syncManager.xhtml`,
      `${config.addonRef}-syncManager`,
      `chrome,centerscreen,resizable,status,width=800,height=400,dialog=no`,
      windowArgs,
    )!;
    await windowArgs._initPromise.promise;
    addon.data.sync.manager.window = win;
    updateData();
    addon.data.sync.manager.tableHelper = new ztoolkit.VirtualizedTable(win!)
      .setContainerId("table-container")
      .setProp({
        id: "manager-table",
        // Do not use setLocale, as it modifies the Zotero.Intl.strings
        // Set locales directly to columns
        columns: [
          {
            dataKey: "noteName",
            label: "syncManager.noteName",
            fixedWidth: false,
          },
          {
            dataKey: "lastSync",
            label: "syncManager.lastSync",
            fixedWidth: false,
          },
          {
            dataKey: "filePath",
            label: "syncManager.filePath",
            fixedWidth: false,
          },
        ].map((column) =>
          Object.assign(column, {
            label: getString(column.label),
          }),
        ),
        showHeader: true,
        multiSelect: true,
        staticColumns: false,
        disableFontSizeScaling: true,
      })
      .setProp("getRowCount", () => addon.data.sync.manager.data.length)
      .setProp(
        "getRowData",
        (index) =>
          (addon.data.sync.manager.data[index] as {
            noteName: string;
            lastSync: string;
            filePath: string;
          }) || {
            noteName: "no data",
            lastSync: "no data",
            filePath: "no data",
          },
      )
      .setProp("onSelectionChange", (selection) => {
        updateButtons();
      })
      .setProp("onKeyDown", (event: KeyboardEvent) => {
        if (
          event.key == "Delete" ||
          (Zotero.isMac && event.key == "Backspace")
        ) {
          unSyncNotes(getSelectedNoteIds());
          refresh();
          return false;
        }
        return true;
      })
      .setProp("onActivate", (ev) => {
        const noteIds = getSelectedNoteIds();
        noteIds.forEach((noteId) =>
          addon.hooks.onOpenNote(noteId, "standalone"),
        );
        return true;
      })
      .setProp(
        "getRowString",
        (index) => addon.data.prefs?.rows[index].title || "",
      )
      // @ts-ignore TODO: Fix type in zotero-plugin-toolkit
      .setProp("onColumnSort", (columnIndex, ascending) => {
        addon.data.sync.manager.columnIndex = columnIndex;
        addon.data.sync.manager.columnAscending = ascending > 0;
        refresh();
      })
      .render();
    const refreshButton = win.document.querySelector(
      "#refresh",
    ) as HTMLButtonElement;
    const syncButton = win.document.querySelector("#sync") as HTMLButtonElement;
    const unSyncButton = win.document.querySelector(
      "#unSync",
    ) as HTMLButtonElement;
    refreshButton.addEventListener("click", (ev) => {
      refresh();
    });
    syncButton.addEventListener("click", async (ev) => {
      await addon.hooks.onSyncing(Zotero.Items.get(getSelectedNoteIds()), {
        quiet: false,
        skipActive: false,
        reason: "manual-manager",
      });
      refresh();
    });
    unSyncButton.addEventListener("click", (ev) => {
      getSelectedNoteIds().forEach((noteId) => {
        addon.api.sync.removeSyncNote(noteId);
      });
      refresh();
    });
  }
}

const sortDataKeys = ["noteName", "lastSync", "filePath"] as Array<
  keyof SyncDataType
>;

function updateData() {
  const sortKey = sortDataKeys[addon.data.sync.manager.columnIndex];
  addon.data.sync.manager.data = addon.api.sync
    .getSyncNoteIds()
    .map((noteId) => {
      const syncStatus = addon.api.sync.getSyncStatus(noteId);
      return {
        noteId: noteId,
        noteName: Zotero.Items.get(noteId).getNoteTitle(),
        lastSync: new Date(syncStatus.lastsync).toLocaleString(),
        filePath: jointPath(syncStatus.path, syncStatus.filename),
      };
    })
    .sort((a, b) => {
      if (!a || !b) {
        return 0;
      }
      const valueA = String(a[sortKey] || "");
      const valueB = String(b[sortKey] || "");
      return addon.data.sync.manager.columnAscending
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });
}

async function updateTable() {
  return new Promise<void>((resolve) => {
    addon.data.sync.manager.tableHelper?.render(undefined, (_) => {
      resolve();
    });
  });
}

function updateButtons() {
  const win = addon.data.sync.manager.window;
  if (!win) {
    return;
  }
  const unSyncButton = win.document.querySelector(
    "#unSync",
  ) as HTMLButtonElement;
  if (
    addon.data.sync.manager.tableHelper?.treeInstance.selection.selected.size
  ) {
    unSyncButton.disabled = false;
  } else {
    unSyncButton.disabled = true;
  }
}

async function refresh() {
  updateData();
  await updateTable();
  updateButtons();
}

function getSelectedNoteIds() {
  const ids = [];
  for (const idx of addon.data.sync.manager.tableHelper?.treeInstance.selection.selected?.keys() ||
    []) {
    ids.push(addon.data.sync.manager.data[idx].noteId);
  }
  return ids;
}

async function unSyncNotes(itemIds: number[]) {
  if (itemIds.length === 0) {
    return;
  }
  const unSyncLinkedNotes = addon.data.sync.manager.window?.confirm(
    `Un-sync their linked notes?`,
  );
  if (unSyncLinkedNotes) {
    for (const item of Zotero.Items.get(itemIds)) {
      const linkedIds: number[] = getLinkedNotesRecursively(
        getNoteLink(item) || "",
        itemIds,
      );
      itemIds.push(...linkedIds);
    }
  }
  for (const itemId of itemIds) {
    await addon.api.sync.removeSyncNote(itemId);
  }
  refresh();
}
