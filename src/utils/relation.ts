import { config } from "../../package.json";
import { getNoteLinkParams } from "./link";

export {
  updateNoteLinkRelation,
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
};

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
  worker.addEventListener(
    "message",
    (e) => {
      if (e.data.jobID === jobID) {
        retData = e.data;
        deferred.resolve();
      }
    },
    { once: true },
  );
  worker.postMessage({ ...data, jobID });
  await Promise.race([deferred.promise, Zotero.Promise.delay(5000)]);
  if (!retData) {
    throw new Error(`Worker timeout: ${data.type}, ${jobID}`);
  }
  ztoolkit.log("executeRelationWorker return", retData);
  return (retData as { result: any }).result;
}

async function updateNoteLinkRelation(noteID: number) {
  const note = Zotero.Items.get(noteID);
  const fromLibID = note.libraryID;
  const fromKey = note.key;
  const lines = addon.api.note.getLinesInNote(note);
  const linkToData: LinkModel[] = [];
  for (let i = 0; i < lines.length; i++) {
    const linkMatches = lines[i].match(/zotero:\/\/note\/\w+\/\w+\//g);
    if (!linkMatches) {
      continue;
    }
    for (const link of linkMatches) {
      const { noteItem, libraryID, noteKey, lineIndex, sectionName } =
        getNoteLinkParams(link);
      if (noteItem && noteItem.isNote()) {
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
  await executeRelationWorker({
    type: "rebuildLinkForNote",
    data: { fromLibID, fromKey, links: linkToData },
  });
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
