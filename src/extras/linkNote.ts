import { VirtualizedTableHelper } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import { config } from "../../package.json";
import Addon from "../addon";
import { waitUtilAsync } from "../utils/wait";
import { getPref, setPref } from "../utils/prefs";
import { NotePicker } from "../elements/notePicker";

let initialized = false;

let notePicker: NotePicker;

let noteOutlineView: VirtualizedTableHelper;
let currentNote: Zotero.Item;
let targetNote: Zotero.Item | undefined;
let noteOutline: ReturnType<Addon["api"]["note"]["getNoteTreeFlattened"]> = [];

let positionData: NoteNodeData | undefined;

// @ts-ignore
window.addon = Zotero[config.addonRef];

let io: {
  currentNoteID: number;
  openedNoteIDs?: number[];
  deferred: _ZoteroTypes.DeferredPromise<void>;

  targetNoteID?: number;
  content?: string;
  lineIndex?: number;
};

window.onload = async function () {
  // Set font size from pref
  const sbc = document.getElementById("top-container");
  Zotero.UIProperties.registerRoot(sbc);

  // @ts-ignore
  io = window.arguments[0];

  loadNotePicker();

  loadInsertPosition();

  loadNoteOutline();

  document.addEventListener("dialogaccept", doAccept);

  currentNote = Zotero.Items.get(io.currentNoteID);

  initialized = true;

  scrollToSection("picker");
};

window.onunload = function () {
  io.deferred && io.deferred.resolve();
};

function loadNotePicker() {
  notePicker = document.querySelector("bn-note-picker") as NotePicker;
  notePicker.openedNoteIDs = io.openedNoteIDs || [];
  const content = document.createElement("span");
  content.innerHTML = "Step 1. Choose target note:";
  content.classList.add("toolbar-header", "content");
  const title = document.createElement("span");
  title.id = "selected-note-title";
  title.classList.add("toolbar-header", "highlight");
  notePicker
    .querySelector("#search-toolbar .toolbar-start")
    ?.append(content, title);
  notePicker.addEventListener("selectionChange", (event: any) => {
    updateSelectedNotesTitle(event.detail.selectedNote);
    updateNoteOutline(event.detail.selectedNote);
  });
}

function loadInsertPosition() {
  const insertPosition = document.getElementById(
    "bn-link-insert-position",
  ) as HTMLSelectElement;
  insertPosition.value = getPref("insertLinkPosition") as string;
  insertPosition.addEventListener("command", () => {
    setPref("insertLinkPosition", insertPosition.value);
    updateNotePreview();
  });
}

async function loadNoteOutline() {
  const renderLock = Zotero.Promise.defer();
  noteOutlineView = new VirtualizedTableHelper(window)
    .setContainerId("bn-select-note-outline-tree")
    .setProp({
      id: `bn-select-note-outline-table`,
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
    .setProp("getRowCount", () => noteOutline.length || 0)
    .setProp("getRowData", (index) => {
      const model = noteOutline[index]?.model;
      if (!model) return { level: 0, name: "**Unknown**" };
      return {
        level: model.level,
        name: "··".repeat(model.level - 1) + model.name,
      };
    })
    .setProp("onSelectionChange", (selection) => {
      onOutlineSelected(selection);
    })
    // For find-as-you-type
    .setProp("getRowString", (index) => noteOutline[index]?.model.name || "")
    .render(-1, () => {
      renderLock.resolve();
    });
  await renderLock.promise;

  // if (openedNotes.length === 1) {
  //   openedNotesView.treeInstance.selection.select(0);
  // }
}

function onOutlineSelected(selection: { selected: Set<number> }) {
  positionData = noteOutline[selection.selected.values().next().value]?.model;
  updateNotePreview();
  updateSelectedOutlineTitle();
}

function updateSelectedNotesTitle(noteItem?: Zotero.Item) {
  const title = noteItem ? noteItem.getNoteTitle() : "";
  document.querySelector("#selected-note-title")!.textContent = title;
}

function updateSelectedOutlineTitle() {
  const selectedOutline =
    noteOutline[
      noteOutlineView.treeInstance.selection.selected.values().next().value
    ];
  const title = selectedOutline ? selectedOutline.model.name : "";
  document.querySelector("#selected-outline-title")!.textContent = title;
}

function updatePreviewTitle() {
  document.querySelector("#preview-note-from-title")!.textContent =
    currentNote.getNoteTitle() || "No title";
  document.querySelector("#preview-note-middle-title")!.textContent = "to";
  document.querySelector("#preview-note-to-title")!.textContent =
    targetNote?.getNoteTitle() || "No title";
}

async function updateNoteOutline(noteItem?: Zotero.Item) {
  if (!noteItem) {
    targetNote = undefined;
    noteOutline = [];
  } else {
    targetNote = noteItem;
    noteOutline = addon.api.note.getNoteTreeFlattened(targetNote);
  }
  noteOutlineView?.render(undefined);
  // Set default line index to the end of the note
  positionData = undefined;
  if (targetNote) scrollToSection("outline");
}

async function updateNotePreview() {
  if (!initialized || !targetNote) return;
  const lines = await addon.api.note.getLinesInNote(targetNote, {
    convertToHTML: true,
  });
  let index = getIndexToInsert();
  if (index < 0) {
    index = lines.length;
  } else {
    scrollToSection("preview");
  }
  const before = lines.slice(0, index).join("\n");
  const after = lines.slice(index).join("\n");

  // TODO: use index or section
  const content = await getContentToInsert();

  const iframe = document.querySelector(
    "#bn-note-preview",
  ) as HTMLIFrameElement;

  const activeElement = document.activeElement as HTMLElement; // 保存当前活动元素

  iframe!.contentDocument!.documentElement.innerHTML = `<html>
  <head>
    <title></title>
    <link
      rel="stylesheet"
      type="text/css"
      href="chrome://zotero-platform/content/zotero.css"
    />
    <link
      rel="stylesheet"
      type="text/css"
      href="chrome://${config.addonRef}/content/lib/css/github-markdown.css"
    />
    <link
      rel="stylesheet"
      href="chrome://${config.addonRef}/content/lib/css/katex.min.css"
      crossorigin="anonymous"
    />
    <style>
      html {
        color-scheme: light dark;
        background: var(--material-sidepane);
      }
      body {
        overflow-x: clip;
      }
      #inserted {
        border: var(--material-border);
        box-shadow: 0 2px 5px color-mix(in srgb, var(--material-background) 15%, transparent);
        border-radius: 4px;
        background: var(--material-background);
        padding: 10px;
        transition: all 0.3s ease;
      }
      #inserted:hover {
        box-shadow: 0 5px 15px color-mix(in srgb, var(--material-background) 20%, transparent);
        background: var(--color-background50);
      }
    </style>
  </head>
  <body>
    <div>${before}</div>
    <div id="inserted">${content}</div>
    <div>${after}</div>
  </body>
</html>
`;
  activeElement?.focus();
  await waitUtilAsync(() => iframe.contentDocument?.readyState === "complete");

  // Scroll the inserted section into the center of the iframe
  const inserted = iframe.contentDocument?.getElementById("inserted");
  if (inserted) {
    const rect = inserted.getBoundingClientRect();
    const container = inserted.parentElement!;
    container.scrollTo({
      top:
        container.scrollTop +
        rect.top -
        container.clientHeight / 2 +
        rect.height,
      behavior: "smooth",
    });
  }

  updatePreviewTitle();
}

function scrollToSection(type: "picker" | "outline" | "preview") {
  if (!initialized) return;
  const querier = {
    picker: "#zotero-select-items-container",
    outline: "#bn-select-note-outline-container",
    preview: "#bn-note-preview-container",
  };
  const container = document.querySelector(querier[type]);
  if (!container) return;
  container.scrollIntoView({
    behavior: "smooth",
    inline: "center",
  });
}

async function getContentToInsert() {
  const forwardLink = addon.api.convert.note2link(currentNote, {});
  const content = await addon.api.template.runTemplate(
    "[QuickInsertV2]",
    "link, linkText, subNoteItem, noteItem",
    [
      forwardLink,
      currentNote.getNoteTitle().trim() || forwardLink,
      currentNote,
      targetNote,
    ],
    {
      dryRun: true,
    },
  );
  return content;
}

function getIndexToInsert() {
  if (!positionData) return -1;
  let position = getPref("insertLinkPosition") as string;
  if (!["start", "end"].includes(position)) {
    position = "end";
  }
  let index = {
    start: positionData.lineIndex + 1,
    end: positionData.endIndex + 1,
  }[position];
  if (index === undefined) {
    index = -1;
  }
  return index;
}

async function doAccept() {
  if (!targetNote) return;
  const content = await getContentToInsert();

  io.targetNoteID = targetNote.id;
  io.content = content;
  io.lineIndex = getIndexToInsert();
}
