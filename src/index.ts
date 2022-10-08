/*
 * This file is the esbuild entrance.
 */

import Knowledge4Zotero from "./addon";

Zotero.Knowledge4Zotero = new Knowledge4Zotero();

window.addEventListener(
  "load",
  async function (e) {
    Zotero.Knowledge4Zotero.events.onInit();
  },
  false
);
