import Dexie from "dexie";

const db = new Dexie("BN_Two_Way_Relation") as Dexie & {
  link: Dexie.Table<LinkModel>;
};

db.version(1).stores({
  link: "++id, fromLibID, fromKey, toLibID, toKey, fromLine, toLine, toSection, url",
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
  collection.delete().then((deleteCount) => {
    console.log("Deleted " + deleteCount + " objects");
    bulkAddLink(links);
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
    default:
      break;
  }
};
