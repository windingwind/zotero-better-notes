import { config } from "../../package.json";

export { getAddon };

function getAddon(): import("../../src/addon").default {
  // @ts-ignore - plugin instance
  return Zotero[config.addonRef];
}
