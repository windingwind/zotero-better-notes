import { config } from "../../../package.json";
import { getWorkspaceUID } from "../../utils/workspace";

export function registerNoteLinkSection(type: "inbound" | "outbound") {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: `bn-note-${type}-link`,
    pluginID: config.addonID,
    bodyXHTML: `
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace/related.css"
  ></html:link>
  <html:link
    rel="localization"
    href="${config.addonRef}-noteRelation.ftl"
  ></html:link>
</linkset>`,
    header: {
      icon: `chrome://${config.addonRef}/content/icons/${type}-link-16.svg`,
      l10nID: `${config.addonRef}-note-${type}-header`,
    },
    sidenav: {
      icon: `chrome://${config.addonRef}/content/icons/${type}-link-20.svg`,
      l10nID: `${config.addonRef}-note-${type}-sidenav`,
    },
    sectionButtons: [
      {
        type: "refreshGraph",
        icon: "chrome://zotero/skin/16/universal/sync.svg",
        l10nID: `${config.addonRef}-note-${type}-refresh`,
        onClick: ({ body, item, setL10nArgs }) => {
          renderSection(type, {
            body,
            item,
            setCount: makeSetCount(setL10nArgs),
          });
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
              ztoolkit.log(
                `relation notify refresh link ${type}`,
                ids,
                item.id,
              );
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
    onItemChange: ({ body, item, tabType, setEnabled }) => {
      if (
        (body.closest("bn-workspace") as HTMLElement | undefined) ||
        tabType === "note"
      ) {
        setEnabled(true);
        body.dataset.itemID = String(item.id);
        return;
      }
      setEnabled(false);
    },
    onRender: () => {},
    onAsyncRender: async ({ body, item, setL10nArgs, tabType }) => {
      if (!item?.isNote()) return;
      await renderSection(type, {
        body,
        item,
        setCount: makeSetCount(setL10nArgs),
      });
    },
  });
}

async function renderSection(
  type: "inbound" | "outbound",
  {
    body,
    item,
    setCount,
  }: {
    body: HTMLElement;
    item: Zotero.Item;
    setCount: (count: number) => void;
  },
) {
  body.querySelectorAll(".row").forEach((elem) => elem.remove());
  const doc = body.ownerDocument;
  const api = {
    inbound: addon.api.relation.getNoteLinkInboundRelation,
    outbound: addon.api.relation.getNoteLinkOutboundRelation,
  };
  const inLinks = await api[type](item.id);
  let count = 0;
  for (const linkData of inLinks) {
    const targetItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      linkData[
        { inbound: "fromLibID", outbound: "toLibID" }[type] as
          | "fromLibID"
          | "toLibID"
      ],
      linkData[
        { inbound: "fromKey", outbound: "toKey" }[type] as "fromKey" | "toKey"
      ],
    )) as Zotero.Item | false;

    if (!targetItem) {
      continue;
    }
    count++;

    const linkParams = {
      workspaceUID: getWorkspaceUID(body),
      lineIndex: linkData.toLine ?? undefined,
      sectionName: linkData.toSection ?? undefined,
      forceTakeover: true,
    };

    const row = doc.createElement("div");
    row.className = "row";

    const icon = ztoolkit
      .getGlobal("require")("components/icons")
      .getCSSItemTypeIcon("note");

    const label = doc.createElement("div");
    label.className = "label";
    const title = doc.createElement("span");
    title.textContent = targetItem.getNoteTitle();
    const position = doc.createElement("span");
    position.className = "position-label";
    if (typeof linkData.toLine === "number") {
      position.textContent = `>Line ${linkData.toLine}`;
    }
    if (typeof linkData.toSection === "string") {
      position.textContent = `#${linkData.toSection}`;
    }
    label.append(title, position);
    label.title = linkData.url;

    const box = doc.createElement("div");
    box.addEventListener("click", () =>
      addon.hooks.onOpenNote(targetItem.id, "preview", linkParams),
    );
    box.className = "box keyboard-clickable";
    box.setAttribute("tabindex", "0");
    box.append(icon, label);

    row.append(box);

    const note = (doc as any).createXULElement("toolbarbutton");
    note.addEventListener("command", (event: MouseEvent) => {
      const position = event.shiftKey ? "window" : "tab";
      addon.hooks.onOpenNote(targetItem.id, position, linkParams);
    });
    note.className = "zotero-clicky zotero-clicky-open-link";
    note.setAttribute("tabindex", "0");
    note.setAttribute("tooltiptext", "Open in new tab (Click) or new BN window (Shift+Click)");
    row.append(note);

    body.append(row);
  }

  setCount(count);
}

function makeSetCount(setL10nArgs: (str: string) => void) {
  return (count: number) => {
    setL10nArgs(`{"count": "${count}"}`);
  };
}
