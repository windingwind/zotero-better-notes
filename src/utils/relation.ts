import { config } from "../../package.json";
import { getNoteLinkParams } from "./link";

export {
  updateNoteLinkRelation,
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
  closeRelationWorker,
};

function closeRelationWorker() {
  if (addon.data.relation.worker) {
    addon.data.relation.worker.terminate();
    addon.data.relation.worker = undefined;
  }
}

async function getRelationWorker() {
  if (addon.data.relation.worker) {
    return addon.data.relation.worker;
  }
  const deferred = Zotero.Promise.defer();
  const worker = new Worker(
    `chrome://${config.addonRef}/content/scripts/relationWorker.js`,
  );
  addon.data.relation.worker = worker;
  worker.addEventListener(
    "message",
    (e) => {
      if (e.data === "ready") {
        ztoolkit.log("Relation worker is ready.");
        deferred.resolve();
      }
    },
    { once: true },
  );
  await deferred.promise;
  return worker;
}

async function executeRelationWorker(data: {
  type: string;
  data: any;
}): Promise<any> {
  const worker = await getRelationWorker();
  const deferred = Zotero.Promise.defer();
  const jobID = Zotero.Utilities.randomString(8);
  let retData;
  ztoolkit.log("executeRelationWorker", data, jobID);
  const callback = (e: MessageEvent) => {
    if (e.data.jobID === jobID) {
      retData = e.data;
      worker.removeEventListener("message", callback);
      deferred.resolve();
    }
  };
  worker.addEventListener("message", callback);
  worker.postMessage({ ...data, jobID });
  await Promise.race([deferred.promise, Zotero.Promise.delay(5000)]);
  if (!retData) {
    worker.removeEventListener("message", callback);
    throw new Error(`Worker timeout: ${data.type}, ${jobID}`);
  }
  ztoolkit.log("executeRelationWorker return", retData);
  return (retData as { result: any }).result;
}

async function updateNoteLinkRelation(noteID: number) {
  const note = Zotero.Items.get(noteID);
  const affectedNoteIDs = new Set([noteID]);
  const fromLibID = note.libraryID;
  const fromKey = note.key;
  const lines = addon.api.note.getLinesInNote(note);
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
  const result = await executeRelationWorker({
    type: "rebuildLinkForNote",
    data: { fromLibID, fromKey, links: linkToData },
  });
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

async function getNoteLinkOutboundRelation(
  noteID: number,
): Promise<LinkModel[]> {
  const note = Zotero.Items.get(noteID);
  const fromLibID = note.libraryID;
  const fromKey = note.key;
  return executeRelationWorker({
    type: "getOutboundLinks",
    data: { fromLibID, fromKey },
  });
}

async function getNoteLinkInboundRelation(
  noteID: number,
): Promise<LinkModel[]> {
  const note = Zotero.Items.get(noteID);
  const toLibID = note.libraryID;
  const toKey = note.key;
  return executeRelationWorker({
    type: "getInboundLinks",
    data: { toLibID, toKey },
  });
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
