import { getPref, setPref } from "../utils/prefs";

let io: {
  targetData: {
    left: number;
    title: string;
  };
  accepted: boolean;
  useBuiltInExport: boolean;
  deferred: _ZoteroTypes.Promise.DeferredPromise<void>;
  embedLink: boolean;
  standaloneLink: boolean;
  exportNote: boolean;
  exportMD: boolean;
  setAutoSync: boolean;
  autoMDFileName: boolean;
  withYAMLHeader: boolean;
  exportDocx: boolean;
  exportPDF: boolean;
  exportFreeMind: boolean;
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
};

function init() {
  const dialog = document.querySelector("dialog")!;
  Zotero.UIProperties.registerRoot(dialog);

  io = window.arguments[0];

  window.addEventListener("dialogaccept", doAccept);
  window.addEventListener("dialogextra1", () => doUseBuiltInExport());

  document
    .querySelector("#format")!
    .addEventListener("command", onFormatChange);

  document
    .querySelector("#linkMode")!
    .addEventListener("command", updateMarkdownOptions);

  document
    .querySelector("#markdown-autoSync")!
    .addEventListener("command", updateMarkdownOptions);

  (document.querySelector("#target") as XULElement).dataset.l10nArgs =
    JSON.stringify(io.targetData);

  restore();

  onFormatChange();
  updateMarkdownOptions();
}

function restore() {
  let format = getPref("export.format") as string;
  if (!["markdown", "msword", "pdf", "freemind", "note"].includes(format)) {
    format = "markdown";
  }
  (document.querySelector("#format") as XULMenuListElement).value = format;

  let linkMode = getPref("export.linkMode") as string;
  if (!["keep", "embed", "standalone", "remove"].includes(linkMode)) {
    linkMode = "keep";
  }
  (document.querySelector("#linkMode") as XULRadioGroupElement).value =
    linkMode;

  const markdownPrefs = ["autoSync", "withYAMLHeader", "autoFilename"];
  for (const pref of markdownPrefs) {
    (
      document.querySelector(`#markdown-${pref}`) as XULCheckboxElement
    ).checked = getPref(`export.markdown-${pref}`) as boolean;
  }
}

function cache() {
  setPref(
    "export.format",
    (document.querySelector("#format") as XULMenuListElement).value,
  );
  setPref(
    "export.linkMode",
    (document.querySelector("#linkMode") as XULRadioGroupElement).value,
  );

  const markdownPrefs = ["autoSync", "withYAMLHeader", "autoFilename"];
  for (const pref of markdownPrefs) {
    setPref(
      `export.markdown-${pref}`,
      (document.querySelector(`#markdown-${pref}`) as XULCheckboxElement)
        .checked,
    );
  }
}

function onFormatChange() {
  const format = (document.querySelector("#format") as XULMenuListElement)
    .value;
  const isMD = format === "markdown";

  (document.querySelector("#markdown-options") as XULBoxElement).hidden = !isMD;

  window.sizeToContent();
}

function updateMarkdownOptions() {
  const linkModeRadio = document.querySelector(
    "#linkMode",
  ) as XULRadioGroupElement;
  const autoSyncRadio = document.querySelector(
    "#markdown-autoSync",
  ) as XULCheckboxElement;

  if (linkModeRadio.value !== "standalone") {
    autoSyncRadio.checked = false;
    autoSyncRadio.disabled = true;
  } else {
    autoSyncRadio.disabled = false;
  }

  const autoFilename = document.querySelector(
    "#markdown-autoFilename",
  ) as XULCheckboxElement;
  const withYAMLHeader = document.querySelector(
    "#markdown-withYAMLHeader",
  ) as XULCheckboxElement;

  if (autoSyncRadio.checked) {
    autoFilename.checked = true;
    autoFilename.disabled = true;
    withYAMLHeader.checked = true;
    withYAMLHeader.disabled = true;
  } else {
    autoFilename.disabled = false;
    withYAMLHeader.disabled = false;
  }
}

function doAccept() {
  cache();

  // Format
  const format = (document.querySelector("#format") as XULMenuListElement)
    .value;
  io.exportMD = format === "markdown";
  io.exportDocx = format === "msword";
  io.exportPDF = format === "pdf";
  io.exportFreeMind = format === "freemind";
  io.exportNote = format === "note";

  // Markdown options
  io.autoMDFileName = (
    document.querySelector("#markdown-autoFilename") as XULCheckboxElement
  ).checked;
  io.withYAMLHeader = (
    document.querySelector("#markdown-withYAMLHeader") as XULCheckboxElement
  ).checked;
  io.setAutoSync = (
    document.querySelector("#markdown-autoSync") as XULCheckboxElement
  ).checked;

  // Link mode
  const linkMode = (document.querySelector("#linkMode") as XULRadioGroupElement)
    .value;
  io.embedLink = linkMode === "embed";
  io.standaloneLink = linkMode === "standalone";

  io.accepted = true;
}

function doUseBuiltInExport() {
  io.useBuiltInExport = true;
  window.close();
}
