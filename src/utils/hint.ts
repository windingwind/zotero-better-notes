import { config } from "../../package.json";
import { ProgressWindowHelper } from "zotero-plugin-toolkit";
import { PROGRESS_TITLE } from "./config";
import { waitUtilAsync } from "./wait";

ProgressWindowHelper.setIconURI(
  "default",
  `chrome://${config.addonRef}/content/icons/favicon.png`,
);

function showHint(text: string) {
  if (addon.data.hint.silent) return;
  return new ProgressWindowHelper(PROGRESS_TITLE)
    .createLine({ text, progress: 100, type: "default" })
    .show();
}

async function showHintWithLink(
  text: string,
  linkText: string,
  linkCallback: (ev: MouseEvent) => any,
) {
  if (addon.data.hint.silent) return;
  const progress = new ProgressWindowHelper(PROGRESS_TITLE)
    .createLine({ text, progress: 100, type: "default" })
    .show(-1);
  // Just a placeholder
  progress.addDescription(`<a href="https://zotero.org">${linkText}</a>`);

  await waitUtilAsync(() =>
    // @ts-ignore
    Boolean(progress.lines && progress.lines[0]._itemText),
  );
  // @ts-ignore
  progress.lines[0]._hbox.ownerDocument
    .querySelector("label[href]")
    .addEventListener("click", async (ev: MouseEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
      linkCallback(ev);
    });
  return progress;
}

export { showHint, showHintWithLink };
