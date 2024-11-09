import Dexie from "dexie";
import { MessageHelper } from "zotero-plugin-toolkit";

export { handlers };

const db = new Dexie("BN_Two_Way_Relation") as Dexie & {
  link: Dexie.Table<LinkModel>;
  annotation: Dexie.Table<AnnotationModel>;
};

db.version(2).stores({
  link: "++id, fromLibID, fromKey, toLibID, toKey, fromLine, toLine, toSection, url",
  annotation: "++id, fromLibID, fromKey, toLibID, toKey, url",
});

log("Using Dexie v" + Dexie.semVer, db);

const funcs = {
  addLink,
  bulkAddLink,
  rebuildLinkForNote,
  getOutboundLinks,
  getInboundLinks,
  linkAnnotationToTarget,
  getLinkTargetByAnnotation,
  getAnnotationByLinkTarget,
};

const handlers = MessageHelper.wrapHandlers(funcs);

const messageServer = new MessageHelper({
  canBeDestroyed: true,
  dev: true,
  name: "parsingWorker",
  target: self,
  handlers,
});

messageServer.start();

async function addLink(model: LinkModel) {
  await db.link.add(model);
}

async function bulkAddLink(models: LinkModel[]) {
  await db.link.bulkAdd(models);
}

async function rebuildLinkForNote(
  fromLibID: number,
  fromKey: string,
  links: LinkModel[],
) {
  log("rebuildLinkForNote", fromLibID, fromKey, links);

  const collection = db.link.where({ fromLibID, fromKey });
  const oldOutboundLinks = await collection.toArray();
  await collection.delete().then((deleteCount) => {
    log("Deleted " + deleteCount + " objects");
    return bulkAddLink(links);
  });
  return {
    oldOutboundLinks,
  };
}

async function getOutboundLinks(fromLibID: number, fromKey: string) {
  log("getOutboundLinks", fromLibID, fromKey);
  return db.link.where({ fromLibID, fromKey }).toArray();
}

async function getInboundLinks(toLibID: number, toKey: string) {
  log("getInboundLinks", toLibID, toKey);
  return db.link.where({ toLibID, toKey }).toArray();
}

async function linkAnnotationToTarget(model: AnnotationModel) {
  log("linkAnnotationToTarget", model);
  const collection = db.annotation.where({
    fromLibID: model.fromLibID,
    fromKey: model.fromKey,
  });
  await collection.delete().then(() => {
    return db.annotation.add(model);
  });
}

async function getLinkTargetByAnnotation(fromLibID: number, fromKey: string) {
  log("getLinkTargetByAnnotation", fromLibID, fromKey);
  return db.annotation.get({ fromLibID, fromKey });
}

async function getAnnotationByLinkTarget(toLibID: number, toKey: string) {
  log("getAnnotationByLinkTarget", toLibID, toKey);
  return db.annotation.get({ toLibID, toKey });
}

function log(...args: any[]) {
  if (__env__ === "development") console.log("[relationWorker]", ...args);
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

interface AnnotationModel {
  fromLibID: number;
  fromKey: string;
  toLibID: number;
  toKey: string;
  url: string;
}
