import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import { showHint } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { waitUtilAsync } from "../../utils/wait";
// TODO: uncouple these imports
import { messageHandler } from "./message";

export const TAB_TYPE = "betternotes";

export function registerWorkspaceTab(win: Window) {
  const doc = win.document;
  const spacer = doc.querySelector("#zotero-collections-toolbar > spacer");
  if (!spacer) {
    return;
  }
  const tabButton = ztoolkit.UI.insertElementBefore(
    {
      tag: "toolbarbutton",
      classList: ["zotero-tb-button"],
      styles: {
        listStyleImage: `url("chrome://${config.addonRef}/content/icons/icon-linear-20.svg")`,
      },
      attributes: {
        tooltiptext: "Open workspace",
      },
      listeners: [
        {
          type: "command",
          listener: (ev) => {
            if ((ev as MouseEvent).shiftKey) {
              addon.hooks.onOpenWorkspace("window");
            } else {
              addon.hooks.onOpenWorkspace("tab");
            }
          },
        },
      ],
    },
    spacer,
  ) as XUL.ToolBarButton;
  win.addEventListener("message", messageHandler, false);
  const collectionSearch = doc.querySelector("#zotero-collections-search")!;
  const ob = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    tabButton.hidden = !!collectionSearch?.classList.contains("visible");
  });
  ob.observe(collectionSearch, {
    attributes: true,
    attributeFilter: ["class"],
  });

  win.addEventListener(
    "unload",
    () => {
      ob.disconnect();
      win.removeEventListener("message", messageHandler);
    },
    { once: true },
  );
}

export async function openWorkspaceTab() {
  if (addon.data.workspace.tab.active) {
    Zotero_Tabs.select(addon.data.workspace.tab.id!);
    return;
  }
  const { id, container } = Zotero_Tabs.add({
    type: TAB_TYPE,
    title: getString("tab.name"),
    index: 1,
    data: {
      itemID: addon.data.workspace.mainId,
    },
    select: false,
    onClose: () => {
      deActivateWorkspaceTab();
    },
  });
  addon.data.workspace.tab.id = id;
  container.setAttribute("workspace-type", "tab");
  addon.data.workspace.tab.container = container;

  await activateWorkspaceTab();
  Zotero_Tabs.select(id);
}

function hoverWorkspaceTab(hovered: boolean) {
  Array.from(document.querySelectorAll(".tab-toggle")).forEach((elem) => {
    (elem as HTMLDivElement).style.visibility = hovered ? "visible" : "hidden";
  });
  const tabElem = document.querySelector(
    `.tabs-wrapper .tab[data-id=${addon.data.workspace.tab.id}]`,
  ) as HTMLDivElement;
  const content = tabElem.querySelector(".tab-name") as HTMLDivElement;
  content.removeAttribute("style");
  if (hovered) {
    content.style["-moz-box-pack" as any] = "start";
  }
}

function updateWorkspaceTabToggleButton(
  type: "outline" | "preview" | "notes",
  state: "open" | "collapsed",
) {
  const elem = document.querySelector(
    `#betternotes-tab-toggle-${type}`,
  ) as HTMLDivElement;
  if (!elem) {
    return;
  }
  if (state !== "collapsed") {
    state = "open";
  }
  elem.innerHTML = ICONS[`workspace_${type}_${state}`];
}

function registerWorkspaceTabPaneObserver() {
  const outlineSplitter = document.querySelector(
    "#betternotes-workspace-outline-splitter",
  );
  const outlineMut = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    updateWorkspaceTabToggleButton(
      "outline",
      outlineSplitter!.getAttribute("state")! as "open" | "collapsed",
    );
  });
  outlineMut.observe(outlineSplitter!, {
    attributes: true,
    attributeFilter: ["state"],
  });
  const previewSplitter = document.querySelector(
    "#betternotes-workspace-preview-splitter",
  );
  const previeweMut = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    updateWorkspaceTabToggleButton(
      "preview",
      previewSplitter!.getAttribute("state")! as "open" | "collapsed",
    );
  });
  previeweMut.observe(previewSplitter!, {
    attributes: true,
    attributeFilter: ["state"],
  });
  const notesSplitter = document.querySelector("#zotero-context-splitter");
  const notesMut = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    updateWorkspaceTabToggleButton(
      "notes",
      notesSplitter!.getAttribute("state")! as "open" | "collapsed",
    );
  });
  notesMut.observe(notesSplitter!, {
    attributes: true,
    attributeFilter: ["state"],
  });
}

function isContextPaneInitialized() {
  return (
    (document.querySelector(".notes-pane-deck")?.childElementCount || 0) > 0
  );
}

export async function activateWorkspaceTab() {
  if (Zotero_Tabs.selectedType === TAB_TYPE && isContextPaneInitialized()) {
    const tabToolbar = document.querySelector("#zotero-tab-toolbar") as XUL.Box;
    tabToolbar && (tabToolbar.style.visibility = "collapse");
    const toolbar = document.querySelector(
      "#zotero-context-toolbar-extension",
    ) as XUL.Box;
    if (toolbar) {
      toolbar.style.visibility = "collapse";
      toolbar.nextElementSibling?.setAttribute("selectedIndex", "1");
    }
  }

  if (addon.data.workspace.tab.active) {
    ztoolkit.log("workspace tab is already active");
    return;
  }
  setWorkspaceTabStatus(true);
  // reset tab style
  await waitUtilAsync(() =>
    Boolean(
      document.querySelector(
        `.tabs-wrapper .tab[data-id=${addon.data.workspace.tab.id}]`,
      ),
    ),
  );
  const tabElem = document.querySelector(
    `.tabs-wrapper .tab[data-id=${addon.data.workspace.tab.id}]`,
  ) as HTMLDivElement;
  tabElem.removeAttribute("style");
  const content = tabElem.querySelector(".tab-name") as HTMLDivElement;
  const close = tabElem.querySelector(".tab-close") as HTMLDivElement;
  content.removeAttribute("style");
  content.append(document.createTextNode(getString("tab.name")));
  close.style.removeProperty("visibility");
  ztoolkit.UI.insertElementBefore(
    {
      tag: "fragment",
      children: [
        {
          tag: "div",
          id: "betternotes-tab-toggle-outline",
          classList: ["tab-close", "tab-toggle"],
          styles: {
            right: "56px",
          },
          properties: {
            innerHTML: ICONS.workspace_outline_open,
          },
          listeners: [
            {
              type: "click",
              listener: (ev) => {
                addon.hooks.onToggleWorkspacePane(
                  "outline",
                  undefined,
                  addon.data.workspace.tab.container,
                );
              },
            },
          ],
        },
        {
          tag: "div",
          id: "betternotes-tab-toggle-preview",
          classList: ["tab-close", "tab-toggle"],
          styles: {
            right: "40px",
          },
          properties: {
            innerHTML: ICONS.workspace_preview_collapsed,
          },
          listeners: [
            {
              type: "click",
              listener: (ev) => {
                addon.hooks.onToggleWorkspacePane(
                  "preview",
                  undefined,
                  addon.data.workspace.tab.container,
                );
              },
            },
          ],
        },
        {
          tag: "div",
          id: "betternotes-tab-toggle-notes",
          classList: ["tab-close", "tab-toggle"],
          styles: {
            right: "24px",
          },
          properties: {
            innerHTML:
              document
                .querySelector("#zotero-context-splitter")
                ?.getAttribute("state") === "open"
                ? ICONS.workspace_notes_open
                : ICONS.workspace_notes_collapsed,
          },
          listeners: [
            {
              type: "click",
              listener: (ev) => {
                if (isContextPaneInitialized()) {
                  addon.hooks.onToggleWorkspacePane("notes");
                  return;
                }
                showHint(getString("workspace.notesPane.hint"));
              },
            },
          ],
        },
      ],
    },
    close,
  );
  hoverWorkspaceTab(false);
  tabElem.addEventListener("mouseenter", () => {
    if (Zotero_Tabs.selectedType !== "betternotes") {
      return;
    }
    hoverWorkspaceTab(true);
  });
  tabElem.addEventListener("mousedown", () => hoverWorkspaceTab(true));
  tabElem.addEventListener("mouseleave", () => hoverWorkspaceTab(false));
  tabElem.addEventListener("mousedown", async (ev) => {
    if (ev.button !== 2) {
      return;
    }
    await Zotero.Promise.delay(300);
    const menu = document
      .querySelector("#zotero-itemmenu")
      ?.parentElement?.lastElementChild?.querySelector("menu")
      ?.querySelector("menupopup")?.lastElementChild;
    menu?.addEventListener("click", () => {
      addon.hooks.onOpenWorkspace("window");
    });
  });
  // load workspace content
  const container = addon.data.workspace.tab.container;
  initWorkspaceTabDragDrop(container, tabElem);
  addon.hooks.onInitWorkspace(container);
  registerWorkspaceTabPaneObserver();
  setWorkspaceTabStatus(true);
}

export function deActivateWorkspaceTab() {
  const tabToolbar = document.querySelector("#zotero-tab-toolbar") as XUL.Box;
  tabToolbar && tabToolbar.style.removeProperty("visibility");
  const toolbar = document.querySelector(
    "#zotero-context-toolbar-extension",
  ) as XUL.Box;
  toolbar?.style.removeProperty("visibility");
  setWorkspaceTabStatus(false);
}

function setWorkspaceTabStatus(status: boolean) {
  addon.data.workspace.tab.active = status;
  setPref("workspace.tab.active", status);
}

function initWorkspaceTabDragDrop(
  container?: XUL.Box,
  tabElem?: HTMLDivElement,
) {
  if (!container) {
    return;
  }
  const rect = tabElem?.getBoundingClientRect();
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      id: "bn-workspace-tab-drop",
      styles: {
        background: "#252526",
        opacity: "0.6",
        width: "100%",
        height: "100px",
        position: "fixed",
        left: "0px",
        top: `${rect?.bottom}px`,
        textAlign: "center",
        display: "flex",
        visibility: "hidden",
        zIndex: "65535",
      },
      properties: {
        hidden: true,
        ondrop: (ev: DragEvent) => {
          addon.hooks.onOpenWorkspace("window");
        },
        ondragenter: (ev: DragEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          dropElem.style.opacity = "0.9";
          if (ev.dataTransfer) {
            ev.dataTransfer.dropEffect = "move";
          }
        },
        ondragover: (ev: DragEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
        },
        ondragleave: (ev: DragEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
          dropElem.style.opacity = "0.6";
        },
      },
      children: [
        {
          tag: "div",
          styles: {
            margin: "auto",
            textAlign: "center",
            color: "#fff",
          },
          properties: {
            innerHTML: getString("tab.openInWindow"),
          },
        },
      ],
      enableElementRecord: false,
    },
    container,
  );
  const dropElem = container.querySelector(
    "#bn-workspace-tab-drop",
  ) as HTMLDivElement;
  tabElem?.addEventListener("dragstart", (ev) => {
    dropElem.style.visibility = "visible";
  });
  tabElem?.addEventListener("dragend", (ev) => {
    dropElem.style.visibility = "hidden";
  });
}
