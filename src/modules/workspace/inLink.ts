import { config } from "../../../package.json";

export function registerNoteInboundLink() {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: `bn-note-inbound-link`,
    pluginID: config.addonID,
    header: {
      icon: `chrome://${config.addonRef}/content/icons/in-link-16.svg`,
      l10nID: `${config.addonRef}-note-inlink-header`,
    },
    sidenav: {
      icon: `chrome://${config.addonRef}/content/icons/in-link-20.svg`,
      l10nID: `${config.addonRef}-note-inlink-sidenav`,
    },
    sectionButtons: [
      {
        type: "refreshGraph",
        icon: "chrome://zotero/skin/16/universal/sync.svg",
        l10nID: `${config.addonRef}-note-inlink-refresh`,
        onClick: ({ body, item, setL10nArgs }) => {
          renderSection(body, item, makeSetCount(setL10nArgs));
        },
      },
    ],
    onInit({ body, refresh }) {
      const notifierKey = Zotero.Notifier.registerObserver(
        {
          notify: (event, type, ids, extraData) => {
            const item = Zotero.Items.get(body.dataset.itemID || "");
            if (
              item &&
              // @ts-ignore
              event === "updateBNRelation" &&
              type === "item" &&
              (ids as number[]).includes(item.id)
            ) {
              ztoolkit.log("relation notify refresh", item.id);
              refresh();
            }
          },
        },
        ["item"],
      );
      body.classList.add("bn-link-body");
      body.dataset.notifierKey = notifierKey;
    },
    onDestroy({ body }) {
      const notifierKey = body.dataset.notifierKey;
      if (notifierKey) {
        Zotero.Notifier.unregisterObserver(notifierKey);
      }
    },
    onItemChange: ({ body, item, setEnabled }) => {
      if (body.closest("bn-workspace") as HTMLElement | undefined) {
        setEnabled(true);
        body.dataset.itemID = String(item.id);
        return;
      }
      setEnabled(false);
    },
    onRender: () => {},
    onAsyncRender: async ({ body, item, setL10nArgs }) => {
      await renderSection(body, item, makeSetCount(setL10nArgs));
    },
  });
}

async function renderSection(
  body: HTMLElement,
  item: Zotero.Item,
  setCount: (count: number) => void,
) {
  body.replaceChildren();
  const doc = body.ownerDocument;
  const inLinks = await addon.api.relation.getNoteLinkInboundRelation(item.id);
  for (const linkData of inLinks) {
    const fromItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      linkData.fromLibID,
      linkData.fromKey,
    )) as Zotero.Item;

    const row = doc.createElement("div");
    row.className = "row";

    const icon = ztoolkit
      .getGlobal("require")("components/icons")
      .getCSSItemTypeIcon("note");

    const label = doc.createElement("span");
    label.className = "label";
    label.append(fromItem.getNoteTitle());

    const box = doc.createElement("div");
    box.addEventListener("click", () => handleShowItem(fromItem.id));
    box.className = "box keyboard-clickable";
    box.setAttribute("tabindex", "0");
    box.append(icon, label);

    row.append(box);

    const note = (doc as any).createXULElement("toolbarbutton");
    note.addEventListener("command", (event: MouseEvent) => {
      const position = event.shiftKey ? "window" : "tab";
      addon.hooks.onOpenNote(fromItem.id, position);
    });
    note.className = "zotero-clicky zotero-clicky-open-link";
    note.setAttribute("tabindex", "0");
    row.append(note);

    body.append(row);
  }

  const count = inLinks.length;
  setCount(count);
}

function handleShowItem(id: number) {
  ZoteroPane.selectItem(id);
}

function makeSetCount(setL10nArgs: (str: string) => void) {
  return (count: number) => {
    setL10nArgs(`{"count": "${count}"}`);
  };
}
