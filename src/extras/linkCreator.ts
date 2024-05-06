import { getPref, setPref } from "../utils/prefs";
import { InboundCreator } from "../elements/linkCreator/inboundCreator";
import { OutboundCreator } from "../elements/linkCreator/outboundCreator";

let tabbox: XUL.TabBox;
let inboundCreator: InboundCreator;
let outboundCreator: OutboundCreator;

let io: {
  currentNoteID: number;
  currentLineIndex?: number;
  openedNoteIDs?: number[];
  deferred: _ZoteroTypes.DeferredPromise<void>;

  targetNoteID?: number;
  content?: string;
  lineIndex?: number;
};

window.onload = async function () {
  if (document.readyState === "complete") {
    setTimeout(init, 0);
    return;
  }
  document.addEventListener("DOMContentLoaded", init, { once: true });
};

window.onunload = function () {
  io.deferred && io.deferred.resolve();
  setPref(
    "windows.linkCreator.size",
    `${document.documentElement.getAttribute(
      "width",
    )},${document.documentElement.getAttribute("height")}`,
  );
  setPref("windows.linkCreator.tabIndex", tabbox.selectedIndex);
};

function init() {
  // Set font size from pref
  const sbc = document.getElementById("top-container");
  Zotero.UIProperties.registerRoot(sbc);

  setTimeout(() => {
    const size = ((getPref("windows.linkCreator.size") as string) || "").split(
      ",",
    );
    window.resizeTo(Number(size[0] || "800"), Number(size[1] || "600"));
  }, 0);

  io = window.arguments[0];

  tabbox = document.querySelector("#top-container")!;
  tabbox.selectedIndex =
    (getPref("windows.linkCreator.tabIndex") as number) || 0;
  tabbox.addEventListener("select", loadSelectedPanel);

  inboundCreator = document.querySelector(
    "bn-inbound-creator",
  ) as InboundCreator;
  outboundCreator = document.querySelector(
    "bn-outbound-creator",
  ) as OutboundCreator;
  loadSelectedPanel();

  document.addEventListener("dialogaccept", doAccept);
}

async function loadSelectedPanel() {
  const content = getSelectedContent();
  await content.load(io);
}

async function acceptSelectedPanel() {
  await getSelectedContent().accept(io);
}

function getSelectedContent() {
  return tabbox.selectedPanel.querySelector("[data-bn-type=content]") as any;
}

async function doAccept() {
  await acceptSelectedPanel();
}
