import { initWorkspace } from "./content";

export const TAB_TYPE = "note";

export async function openWorkspaceTab(
  item: Zotero.Item,
  options: { select?: boolean; lineIndex?: number; sectionName?: string } = {
    select: true,
  },
) {
  const { select, lineIndex, sectionName } = options;
  if (!item) return;
  const currentTab = Zotero_Tabs._tabs.find(
    (tab) => tab.data?.itemID == item.id,
  );
  if (currentTab) {
    if (select ?? true) Zotero_Tabs.select(currentTab.id);
    scrollTabEditorTo(item, options);
    return currentTab.id;
  }
  const { id, container } = Zotero_Tabs.add({
    type: TAB_TYPE,
    title: item.getNoteTitle(),
    data: {
      itemID: item.id,
    },
    select: select ?? true,
    onClose: () => {},
  });
  const workspace = await initWorkspace(container, item);
  workspace?.scrollEditorTo({
    lineIndex,
    sectionName,
  });
  return id;
}

let contextPaneOpen: boolean | undefined = undefined;

export function onTabSelect(tabType: string) {
  const ZoteroContextPane = ztoolkit.getGlobal("ZoteroContextPane");
  const splitter = ZoteroContextPane.splitter;

  if (tabType === TAB_TYPE) {
    contextPaneOpen = splitter.getAttribute("state") != "collapsed";
    splitter.setAttribute("state", "collapsed");
  } else if (tabType === "library") {
    return;
  } else if (typeof contextPaneOpen !== "undefined") {
    splitter.setAttribute("state", contextPaneOpen ? "open" : "collapsed");
    contextPaneOpen = undefined;
  } else {
    return;
  }
  ZoteroContextPane.update();
}

export function restoreNoteTabs() {
  const tabsCache: _ZoteroTypes.TabInstance[] =
    Zotero.Session.state.windows.find((x: any) => x.type == "pane")?.tabs;
  for (const i in tabsCache) {
    const tab = tabsCache[i];
    if (tab.type !== TAB_TYPE) continue;
    openWorkspaceTab(Zotero.Items.get(tab.data.itemID), {
      select: tab.selected,
    });
  }
}

export function onUpdateNoteTabsTitle(noteItems: Zotero.Item[]) {
  const ids = noteItems.map((item) => item.id);
  for (const tab of Zotero_Tabs._tabs) {
    if (tab.type !== TAB_TYPE) continue;
    if (ids.includes(tab.data.itemID)) {
      const newTitle = Zotero.Items.get(tab.data.itemID).getNoteTitle();
      if (tab.title === newTitle) {
        continue;
      }
      Zotero_Tabs.rename(tab.id, newTitle);
    }
  }
}

function scrollTabEditorTo(
  item: Zotero.Item,
  options: {
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  const tab = ztoolkit
    .getGlobal("Zotero_Tabs")
    ._tabs.find((tab) => tab.data?.itemID == item.id);
  if (!tab || tab.type !== TAB_TYPE) return;
  const workspace = Zotero.getMainWindow().document.querySelector(
    `#${tab.id} > bn-workspace`,
  );
  if (!workspace) return;
  // @ts-ignore
  workspace.scrollEditorTo(options);
}
