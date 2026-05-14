import { MessageHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { getNoteLinkParams } from "./link";
import type { handlers } from "../extras/relationWorker";

function closeRelationServer() {
  if (addon.data.relation.server) {
    addon.data.relation.server.destroy();
    addon.data.relation.server = undefined;
  }
}

async function getRelationServer(): Promise<MessageHelper<typeof handlers>> {
  if (!addon.data.relation.server) {
    const worker = new Worker(
      `chrome://${config.addonRef}/content/scripts/relationWorker.js`,
      { name: "relationWorker" },
    );
    const server = new MessageHelper<typeof handlers>({
      canBeDestroyed: false,
      dev: __env__ === "development",
      name: "relationWorkerMain",
      target: worker,
      handlers: {},
    });
    server.start();
    await server.exec("_ping");
    addon.data.relation.server = server;
  }

  return addon.data.relation.server!;
}

export { getRelationServer, closeRelationServer };

export {
  updateNoteLinkRelation,
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
  linkAnnotationToTarget,
  getLinkTargetByAnnotation,
  getAnnotationByLinkTarget,
};

const updatingNoteLinkRelationIDs = new Set<number>();
const pendingNoteLinkRelationIDs = new Set<number>();

async function updateNoteLinkRelation(noteID: number) {
  if (updatingNoteLinkRelationIDs.has(noteID)) {
    pendingNoteLinkRelationIDs.add(noteID);
    ztoolkit.log("updateNoteLinkRelation pending", noteID);
    return;
  }
  updatingNoteLinkRelationIDs.add(noteID);
  try {
    do {
      pendingNoteLinkRelationIDs.delete(noteID);
      await rebuildNoteLinkRelation(noteID);
    } while (pendingNoteLinkRelationIDs.has(noteID));
  } finally {
    updatingNoteLinkRelationIDs.delete(noteID);
    pendingNoteLinkRelationIDs.delete(noteID);
  }
}

async function rebuildNoteLinkRelation(noteID: number) {
  ztoolkit.log("updateNoteLinkRelation", noteID);
  const note = Zotero.Items.get(noteID);
  const affectedNoteIDs = new Set([noteID]);
  const fromLibID = note.libraryID;
  const fromKey = note.key;
  const lines = await addon.api.note.getLinesInNote(note);
  const linkToData: LinkModel[] = [];
  for (let i = 0; i < lines.length; i++) {
    const linkMatches = lines[i].match(/href="zotero:\/\/note\/[^"]+"/g);
    if (!linkMatches) {
      continue;
    }
    for (const match of linkMatches) {
      const link = decodeHTMLEntities(match.slice(6, -1));
      const { noteItem, libraryID, noteKey, lineIndex, sectionName } =
        getNoteLinkParams(link);
      if (noteItem && noteItem.isNote() && noteItem.id !== note.id) {
        affectedNoteIDs.add(noteItem.id);
        linkToData.push({
          fromLibID,
          fromKey,
          toLibID: libraryID,
          toKey: noteKey!,
          fromLine: i,
          toLine: lineIndex ?? null,
          toSection: sectionName ?? null,
          url: link,
        });
      }
    }
  }
  const server = await getRelationServer();
  const oldOutboundLinks = (await server.proxy.getOutboundLinks(
    fromLibID,
    fromKey,
  )) as LinkModel[];
  if (!hasLinkRelationChanged(oldOutboundLinks, linkToData)) {
    ztoolkit.log("updateNoteLinkRelation skipped unchanged", noteID);
    return;
  }

  await server.proxy.rebuildLinkForNote(fromLibID, fromKey, linkToData);

  for (const link of oldOutboundLinks) {
    const item = Zotero.Items.getByLibraryAndKey(link.toLibID, link.toKey);
    if (!item) {
      continue;
    }
    affectedNoteIDs.add(item.id);
  }
  Zotero.Notifier.trigger(
    // @ts-ignore - updateBNRelation is a Better Notes custom notifier event.
    "updateBNRelation",
    "item",
    Array.from(affectedNoteIDs),
    {},
    true,
  );
}

function hasLinkRelationChanged(oldLinks: LinkModel[], newLinks: LinkModel[]) {
  return serializeLinkModels(oldLinks) !== serializeLinkModels(newLinks);
}

function serializeLinkModels(links: LinkModel[]) {
  return links.map(getLinkModelKey).sort().join("\n");
}

function getLinkModelKey(link: LinkModel) {
  return [
    String(link.fromLibID),
    link.fromKey,
    String(link.toLibID),
    link.toKey,
    String(link.fromLine),
    link.toLine === null ? "" : String(link.toLine),
    link.toSection ?? "",
    link.url,
  ].join("\t");
}

async function getNoteLinkOutboundRelation(
  noteID: number,
): Promise<LinkModel[]> {
  const note = Zotero.Items.get(noteID);
  const fromLibID = note.libraryID;
  const fromKey = note.key;
  return await (
    await getRelationServer()
  ).proxy.getOutboundLinks(fromLibID, fromKey);
}

async function getNoteLinkInboundRelation(
  noteID: number,
): Promise<LinkModel[]> {
  const note = Zotero.Items.get(noteID);
  const toLibID = note.libraryID;
  const toKey = note.key;
  return await (
    await getRelationServer()
  ).proxy.getInboundLinks(toLibID, toKey);
}

function decodeHTMLEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

interface LinkModel {
  fromLibID: number;
  fromKey: string;
  toLibID: number;
  toKey: string;
  fromLine: number;
  toLine: number | null;
  toSection: string | null;
  url: string;
}

async function linkAnnotationToTarget(model: AnnotationModel) {
  return await (await getRelationServer()).proxy.linkAnnotationToTarget(model);
}

async function getLinkTargetByAnnotation(
  fromLibID: number,
  fromKey: string,
): Promise<AnnotationModel | undefined> {
  return await (
    await getRelationServer()
  ).proxy.getLinkTargetByAnnotation(fromLibID, fromKey);
}

async function getAnnotationByLinkTarget(
  toLibID: number,
  toKey: string,
): Promise<AnnotationModel | undefined> {
  return await (
    await getRelationServer()
  ).proxy.getAnnotationByLinkTarget(toLibID, toKey);
}

interface AnnotationModel {
  fromLibID: number;
  fromKey: string;
  toLibID: number;
  toKey: string;
  url: string;
}
