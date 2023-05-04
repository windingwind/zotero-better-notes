import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import { showHint } from "../../utils/hint";
import { getString } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";
import { waitUtilAsync } from "../../utils/wait";
// TODO: uncouple these imports
import {} from "./content";
import { messageHandler } from "./message";

export const TAB_TYPE = "betternotes";

export function registerWorkspaceTab() {
  const tabContainer = document.querySelector("#tab-bar-container");
  if (!tabContainer) {
    return;
  }
  tabContainer.removeAttribute("hidden");
  const mut = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    tabContainer.removeAttribute("hidden");
  });
  mut.observe(tabContainer, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  waitUtilAsync(() =>
    Boolean(ztoolkit.getGlobal("ZoteroContextPane")._notifierID)
  ).then(() => {
    addWorkspaceTab().then(() => {
      restoreWorkspaceTab();
    });
  });
  window.addEventListener("message", (e) => messageHandler(e), false);
}

async function addWorkspaceTab() {
  let { id, container } = Zotero_Tabs.add({
    type: TAB_TYPE,
    title: getString("tab.name"),
    index: 1,
    data: {
      itemID: addon.data.workspace.mainId,
    },
    select: false,
    onClose: () => {
      setWorkspaceTabStatus(false);
      addWorkspaceTab();
    },
  });
  await waitUtilAsync(() =>
    Boolean(document.querySelector(`.tabs-wrapper .tab[data-id=${id}]`))
  );
  const tabElem = document.querySelector(
    `.tabs-wrapper .tab[data-id=${id}]`
  ) as HTMLDivElement;
  tabElem.style.width = "30px";
  tabElem.style.minWidth = "30px";
  tabElem.style.maxWidth = "30px";
  tabElem.style.padding = "0px";
  const content = tabElem.querySelector(".tab-name") as HTMLDivElement;
  const close = tabElem.querySelector(".tab-close") as HTMLDivElement;
  content.style.verticalAlign = "middle";
  content.style.width = "20px";
  content.style.height = "20px";
  content.style.display = "inline";
  content.innerHTML = "";
  ztoolkit.UI.appendElement(
    {
      tag: "span",
      classList: ["icon-bg"],
      styles: {
        backgroundImage: `url("chrome://${config.addonRef}/content/icons/favicon.png")`,
      },
    },
    content
  );
  close.style.visibility = "hidden";
  addon.data.workspace.tab.id = id;
  container.setAttribute("workspace-type", "tab");
  addon.data.workspace.tab.container = container;
}

function hoverWorkspaceTab(hovered: boolean) {
  Array.from(document.querySelectorAll(".tab-toggle")).forEach((elem) => {
    (elem as HTMLDivElement).style.visibility = hovered ? "visible" : "hidden";
  });
  const tabElem = document.querySelector(
    `.tabs-wrapper .tab[data-id=${addon.data.workspace.tab.id}]`
  ) as HTMLDivElement;
  const content = tabElem.querySelector(".tab-name") as HTMLDivElement;
  content.removeAttribute("style");
  if (hovered) {
    if (ztoolkit.isZotero7()) {
      content.style["-moz-box-pack" as any] = "start";
    } else {
      content.style.position = "absolute";
      content.style.left = "22px";
    }
  }
}

function updateWorkspaceTabToggleButton(
  type: "outline" | "preview" | "notes",
  state: "open" | "collapsed"
) {
  const elem = document.querySelector(
    `#betternotes-tab-toggle-${type}`
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
    "#betternotes-workspace-outline-splitter"
  );
  const outlineMut = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    updateWorkspaceTabToggleButton(
      "outline",
      outlineSplitter!.getAttribute("state")! as "open" | "collapsed"
    );
  });
  outlineMut.observe(outlineSplitter!, {
    attributes: true,
    attributeFilter: ["state"],
  });
  const previewSplitter = document.querySelector(
    "#betternotes-workspace-preview-splitter"
  );
  const previeweMut = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    updateWorkspaceTabToggleButton(
      "preview",
      previewSplitter!.getAttribute("state")! as "open" | "collapsed"
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
      notesSplitter!.getAttribute("state")! as "open" | "collapsed"
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
    (
      document.querySelector("#zotero-tab-toolbar") as XUL.Box
    ).style.visibility = "collapse";
    const toolbar = document.querySelector(
      "#zotero-context-toolbar-extension"
    ) as XUL.Box;
    toolbar.style.visibility = "collapse";
    toolbar.nextElementSibling?.setAttribute("selectedIndex", "1");
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
        `.tabs-wrapper .tab[data-id=${addon.data.workspace.tab.id}]`
      )
    )
  );
  const tabElem = document.querySelector(
    `.tabs-wrapper .tab[data-id=${addon.data.workspace.tab.id}]`
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
                  addon.data.workspace.tab.container
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
                  addon.data.workspace.tab.container
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
    close
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
  addon.hooks.onInitWorkspace(addon.data.workspace.tab.container);
  registerWorkspaceTabPaneObserver();
}

export function deActivateWorkspaceTab() {
  if (!isContextPaneInitialized()) {
    return;
  }
  (
    document.querySelector("#zotero-tab-toolbar") as XUL.Box
  ).style.removeProperty("visibility");
  const toolbar = document.querySelector(
    "#zotero-context-toolbar-extension"
  ) as XUL.Box;
  toolbar.style.removeProperty("visibility");
}

function restoreWorkspaceTab() {
  return;
  if (1 || getPref("workspace.tab.active")) {
    ztoolkit.log("restore workspace tab");
    activateWorkspaceTab();
  }
}

function setWorkspaceTabStatus(status: boolean) {
  addon.data.workspace.tab.active = status;
  setPref("workspace.tab.active", status);
}
