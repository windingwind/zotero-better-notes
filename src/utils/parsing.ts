import { MessageHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import type { handlers } from "../extras/parsingWorker";

function closeParsingServer() {
  if (addon.data.parsing.server) {
    addon.data.parsing.server.destroy();
    addon.data.parsing.server = undefined;
  }
}

async function getParsingServer() {
  if (addon.data.parsing.server) {
    return addon.data.parsing.server;
  }
  const worker = new ChromeWorker(
    `chrome://${config.addonRef}/content/scripts/parsingWorker.js`,
    { name: "parsingWorker" },
  );
  const server = new MessageHelper<typeof handlers>({
    canBeDestroyed: false,
    dev: true,
    name: "parsingWorkerMain",
    target: worker,
    handlers: {},
  });
  server.start();
  await server.exec("_ping");
  addon.data.parsing.server = server;
  return server;
}

export { getParsingServer, closeParsingServer };
