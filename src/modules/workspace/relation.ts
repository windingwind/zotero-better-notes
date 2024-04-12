import { config } from "../../../package.json";
import { slice } from "../../utils/str";
import { waitUtilAsync } from "../../utils/wait";

export function registerNoteRelation() {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: `bn-note-relation`,
    pluginID: config.addonID,
    header: {
      icon: `chrome://${config.addonRef}/content/icons/relation-16.svg`,
      l10nID: `${config.addonRef}-note-relation-header`,
    },
    sidenav: {
      icon: `chrome://${config.addonRef}/content/icons/relation-20.svg`,
      l10nID: `${config.addonRef}-note-relation-sidenav`,
    },
    bodyXHTML: `
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/relation.css"
  ></html:link>
</linkset>
<iframe
  src="chrome://${config.addonRef}/content/relationGraph.html"
  id="bn-relation-graph"
></iframe>`,
    sectionButtons: [
      {
        type: "refreshGraph",
        icon: "chrome://zotero/skin/16/universal/sync.svg",
        l10nID: `${config.addonRef}-note-relation-refresh`,
        onClick: ({ body, item }) => {
          renderGraph(body, item);
        },
      },
    ],
    onInit({ body, refresh }) {
      body
        .querySelector("iframe")!
        .contentWindow?.addEventListener("message", (ev) => {
          if (ev.data.type === "openNote") {
            addon.hooks.onOpenNote(
              ev.data.id,
              ev.data.isShift ? "window" : "tab",
            );
          }
        });

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
              ztoolkit.log("relation notify refresh graph", item.id);
              refresh();
            }
          },
        },
        ["item"],
      );
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
    onAsyncRender: async ({ body, item }) => {
      await renderGraph(body, item);
    },
  });
}

async function renderGraph(body: HTMLElement, item: Zotero.Item) {
  const data = await getRelationData(item);
  await waitUtilAsync(
    () =>
      body.querySelector("iframe")!.contentDocument?.readyState === "complete",
  );
  body.querySelector("iframe")!.contentWindow?.postMessage(
    {
      type: "render",
      graph: data,
    },
    "*",
  );
}

async function getRelationData(note: Zotero.Item) {
  if (!note) return;
  const inLink = await addon.api.relation.getNoteLinkInboundRelation(note.id);
  const outLink = await addon.api.relation.getNoteLinkOutboundRelation(note.id);

  const noteSet: Set<number> = new Set();

  const linkModels: Record<number, NoteLinkModal> = {};

  for (const linkData of inLink) {
    const noteItem = await Zotero.Items.getByLibraryAndKeyAsync(
      linkData.fromLibID,
      linkData.fromKey,
    );
    if (!noteItem) continue;
    noteSet.add(noteItem.id);
    let noteLinks = linkModels[noteItem.id];
    if (!noteLinks) {
      noteLinks = {
        source: noteItem.id,
        target: note.id,
        value: 1,
        type: "in",
      };
      linkModels[noteItem.id] = noteLinks;
    } else {
      noteLinks.value++;
    }
  }

  for (const linkData of outLink) {
    const noteItem = await Zotero.Items.getByLibraryAndKeyAsync(
      linkData.toLibID,
      linkData.toKey,
    );
    if (!noteItem) continue;
    noteSet.add(noteItem.id);
    let noteLinks = linkModels[noteItem.id];
    if (!noteLinks) {
      noteLinks = {
        source: note.id,
        target: noteItem.id,
        value: 1,
        type: "out",
      };
      linkModels[noteItem.id] = noteLinks;
    } else {
      noteLinks.value++;
      if (noteLinks.type === "in") {
        noteLinks.type = "both";
      }
    }
  }

  noteSet.delete(note.id);
  const nodes = Array.from(noteSet).map((id) => {
    const item = Zotero.Items.get(id);
    const title = item.getNoteTitle();
    return {
      id: item.id,
      title,
      shortTitle: slice(title, 15),
      group: 2,
    };
  });

  const title = note.getNoteTitle();
  nodes.push({
    id: note.id,
    title,
    shortTitle: slice(title, 15),
    group: 1,
  });

  return {
    nodes,
    links: Object.values(linkModels),
  };
}

interface NoteLinkModal {
  source: number;
  target: number;
  value: number;
  type: "in" | "out" | "both";
}
