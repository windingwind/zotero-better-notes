/*
 * This file is the esbuild entrance.
 */

import BetterNotes from "./addon";

const addon = new BetterNotes();
Zotero.BetterNotes = addon;
// For compatibility
Zotero.Knowledge4Zotero = addon;

window.addEventListener(
  "load",
  async function (e) {
    Zotero.BetterNotes.ZoteroEvents.onInit();
  },
  false
);
