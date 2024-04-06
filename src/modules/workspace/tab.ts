import { config } from "../../../package.json";
import { initWorkspace } from "./content";

export const TAB_TYPE = "note";

export async function openWorkspaceTab(
  item: Zotero.Item,
  options: { select?: boolean; index?: number } = {
    select: true,
  },
) {
  const { select, index } = options;
  if (!item) return;
  const currentTab = Zotero_Tabs._tabs.find(
    (tab) => tab.data?.itemID == item.id,
  );
  if (currentTab) {
    if (select) Zotero_Tabs.select(currentTab.id);
    return;
  }
  const { id, container } = Zotero_Tabs.add({
    type: TAB_TYPE,
    title: item.getNoteTitle(),
    index,
    data: {
      itemID: item.id,
    },
    select,
    onClose: () => {},
  });
  initWorkspace(container, item);
}

let contextPaneOpen: boolean | undefined = undefined;

export function onTabSelect(tabType: string) {
  const ZoteroContextPane = ztoolkit.getGlobal("ZoteroContextPane");
  const splitter = ZoteroContextPane.splitter;

  if (tabType === TAB_TYPE) {
    contextPaneOpen = splitter.getAttribute("state") != "collapsed";
    splitter.setAttribute("state", "collapsed");
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
      index: Number(i),
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
