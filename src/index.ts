import Notero from "./Notero";

Zotero.Notero = new Notero();

window.addEventListener(
  "load",
  async function (e) {
    Zotero.Notero.events.onInit();
  },
  false
);
