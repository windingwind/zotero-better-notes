import { config } from "../../../package.json";
import { initWorkspace } from "./content";

export const TAB_TYPE = "note";

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
            // if ((ev as MouseEvent).shiftKey) {
            //   addon.hooks.onOpenWorkspace("window");
            // } else {
            //   addon.hooks.onOpenWorkspace("tab");
            // }
          },
        },
      ],
    },
    spacer,
  ) as XUL.ToolBarButton;
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
    },
    { once: true },
  );
}

export async function openWorkspaceTab(item: Zotero.Item) {
  const currentTab = Zotero_Tabs._tabs.find(
    (tab) => tab.data?.itemID == item.id,
  );
  if (currentTab) {
    Zotero_Tabs.select(currentTab.id);
    return;
  }
  const { id, container } = Zotero_Tabs.add({
    type: TAB_TYPE,
    title: item.getNoteTitle(),
    index: 1,
    data: {
      itemID: item.id,
    },
    select: false,
    onClose: () => {},
  });
  initWorkspace(container, item);
  Zotero_Tabs.select(id);
}

let contextPaneOpen: boolean | undefined = undefined;

export function onTabSelect(tabType: string) {
  const ZoteroContextPane = ztoolkit.getGlobal("ZoteroContextPane");
  const splitter = ZoteroContextPane.getSplitter();

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
