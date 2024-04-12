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
          refresh(body, item);
        },
      },
    ],
    onInit({ body }) {
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
    },
    onItemChange: ({ body, setEnabled }) => {
      if (body.closest("bn-workspace") as HTMLElement | undefined) {
        setEnabled(true);
        return;
      }
      setEnabled(false);
    },
    onRender: () => {},
    onAsyncRender: async ({ body, item }) => {
      await refresh(body, item);
    },
  });
}

async function refresh(body: HTMLElement, item: Zotero.Item) {
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

  const links = [];
  const noteSet: Set<number> = new Set();

  for (const linkData of inLink) {
    const noteItem = await Zotero.Items.getByLibraryAndKeyAsync(
      linkData.fromLibID,
      linkData.fromKey,
    );
    if (!noteItem) continue;
    noteSet.add(noteItem.id);
    links.push({
      source: noteItem.id,
      target: note.id,
      value: 1,
    });
  }

  for (const linkData of outLink) {
    const noteItem = await Zotero.Items.getByLibraryAndKeyAsync(
      linkData.toLibID,
      linkData.toKey,
    );
    if (!noteItem) continue;
    noteSet.add(noteItem.id);
    links.push({
      source: note.id,
      target: noteItem.id,
      value: 1,
    });
  }

  noteSet.delete(note.id);
  const nodes = Array.from(noteSet).map((id) => {
    const item = Zotero.Items.get(id);
    return {
      id: item.id,
      title: slice(item.getNoteTitle(), 15),
      group: 2,
    };
  });

  nodes.push({
    id: note.id,
    title: slice(note.getNoteTitle(), 15),
    group: 1,
  });

  return { nodes, links };
}

function areSetsEqual(set1: Set<any>, set2: Set<any>): boolean {
  if (set1.size !== set2.size) {
    return false;
  }
  for (const item of set1) {
    if (!set2.has(item)) {
      return false;
    }
  }
  return true;
}
