import Knowledge4Zotero from "./addon";
import { Knowledge } from "./knowledge";

Zotero.Knowledge4Zotero = new Knowledge4Zotero();

Zotero.Knowledge = Knowledge

window.addEventListener(
  "load",
  async function (e) {
    Zotero.Knowledge4Zotero.events.onInit();
  },
  false
);
