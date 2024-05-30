import Dexie from "dexie";

const db = new Dexie("BN_Two_Way_Relation") as Dexie & {
  link: Dexie.Table<LinkModel>;
  annotation: Dexie.Table<AnnotationModel>;
};

db.version(2).stores({
  link: "++id, fromLibID, fromKey, toLibID, toKey, fromLine, toLine, toSection, url",
  annotation: "++id, fromLibID, fromKey, toLibID, toKey, url",
});

console.log("Using Dexie v" + Dexie.semVer, db);

postMessage({
  type: "ready",
});

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
  console.log("rebuildLinkForNote", fromLibID, fromKey, links);

  const collection = db.link.where({ fromLibID, fromKey });
  const oldOutboundLinks = await collection.toArray();
  await collection.delete().then((deleteCount) => {
    console.log("Deleted " + deleteCount + " objects");
    return bulkAddLink(links);
  });
  return {
    oldOutboundLinks,
  };
}

async function getOutboundLinks(fromLibID: number, fromKey: string) {
  console.log("getOutboundLinks", fromLibID, fromKey);
  return db.link.where({ fromLibID, fromKey }).toArray();
}

async function getInboundLinks(toLibID: number, toKey: string) {
  console.log("getInboundLinks", toLibID, toKey);
  return db.link.where({ toLibID, toKey }).toArray();
}

async function linkAnnotationToTarget(model: AnnotationModel) {
  console.log("linkAnnotationToTarget", model);
  const collection = db.annotation.where({
    fromLibID: model.fromLibID,
    fromKey: model.fromKey,
  });
  await collection.delete().then(() => {
    return db.annotation.add(model);
  });
}

async function getLinkTargetByAnnotation(fromLibID: number, fromKey: string) {
  console.log("getLinkTargetByAnnotation", fromLibID, fromKey);
  return db.annotation.get({ fromLibID, fromKey });
}

async function getAnnotationByLinkTarget(toLibID: number, toKey: string) {
  console.log("getAnnotationByLinkTarget", toLibID, toKey);
  return db.annotation.get({ toLibID, toKey });
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

// Handle messages from the main thread and send responses back for await
onmessage = async (event) => {
  const { type, jobID, data } = event.data;
  console.log("Worker received message", type, jobID, data);
  switch (type) {
    case "addLink":
      postMessage({
        type,
        jobID,
        result: await addLink(data),
      });
      break;
    case "bulkAddLink":
      postMessage({
        type,
        jobID,
        result: await bulkAddLink(data),
      });
      break;
    case "rebuildLinkForNote":
      postMessage({
        type,
        jobID,
        result: await rebuildLinkForNote(
          data.fromLibID,
          data.fromKey,
          data.links,
        ),
      });
      break;
    case "getOutboundLinks":
      postMessage({
        type,
        jobID,
        result: await getOutboundLinks(data.fromLibID, data.fromKey),
      });
      break;
    case "getInboundLinks":
      postMessage({
        type,
        jobID,
        result: await getInboundLinks(data.toLibID, data.toKey),
      });
      break;
    case "linkAnnotationToTarget":
      postMessage({
        type,
        jobID,
        result: await linkAnnotationToTarget(data),
      });
      break;
    case "getLinkTargetByAnnotation":
      postMessage({
        type,
        jobID,
        result: await getLinkTargetByAnnotation(data.fromLibID, data.fromKey),
      });
      break;
    case "getAnnotationByLinkTarget":
      postMessage({
        type,
        jobID,
        result: await getAnnotationByLinkTarget(data.toLibID, data.toKey),
      });
      break;
    default:
      break;
  }
};
