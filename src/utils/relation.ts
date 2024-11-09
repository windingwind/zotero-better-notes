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

async function getRelationServer() {
  if (!addon.data.relation.server) {
    const worker = new Worker(
      `chrome://${config.addonRef}/content/scripts/relationWorker.js`,
      { name: "relationWorker" },
    );
    const server = new MessageHelper<typeof handlers>({
      canBeDestroyed: false,
      dev: true,
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

async function updateNoteLinkRelation(noteID: number) {
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
  const result = await (
    await getRelationServer()
  ).exec("rebuildLinkForNote", [fromLibID, fromKey, linkToData]);

  for (const link of result.oldOutboundLinks as LinkModel[]) {
    const item = Zotero.Items.getByLibraryAndKey(link.toLibID, link.toKey);
    if (!item) {
      continue;
    }
    affectedNoteIDs.add(item.id);
  }
  Zotero.Notifier.trigger(
    // @ts-ignore
    "updateBNRelation",
    "item",
    Array.from(affectedNoteIDs),
    {},
    true,
  );
}

async function getNoteLinkOutboundRelation(noteID: number) {
  const note = Zotero.Items.get(noteID);
  const fromLibID = note.libraryID;
  const fromKey = note.key;
  return (await getRelationServer()).exec("getOutboundLinks", [
    fromLibID,
    fromKey,
  ]);
}

async function getNoteLinkInboundRelation(noteID: number) {
  const note = Zotero.Items.get(noteID);
  const toLibID = note.libraryID;
  const toKey = note.key;
  return (await getRelationServer()).exec("getInboundLinks", [toLibID, toKey]);
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
  return (await getRelationServer()).exec("linkAnnotationToTarget", [model]);
}

async function getLinkTargetByAnnotation(fromLibID: number, fromKey: string) {
  return (await getRelationServer()).exec("getLinkTargetByAnnotation", [
    fromLibID,
    fromKey,
  ]);
}

async function getAnnotationByLinkTarget(toLibID: number, toKey: string) {
  return (await getRelationServer()).exec("getAnnotationByLinkTarget", [
    toLibID,
    toKey,
  ]);
}

interface AnnotationModel {
  fromLibID: number;
  fromKey: string;
  toLibID: number;
  toKey: string;
  url: string;
}
