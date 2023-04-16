import { itemPicker } from "../../utils/itemPicker";
import { copyEmbeddedImagesInHTML, renderNoteHTML } from "../../utils/note";

export { runTemplate, runItemTemplate };

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function runTemplate(
  key: string,
  argString: string = "",
  argList: any[] = [],
  options: {
    useDefault?: boolean;
    dryRun?: boolean;
    stage?: string;
  } = {
    useDefault: true,
    dryRun: false,
    stage: "default",
  }
): Promise<string> {
  ztoolkit.log(`runTemplate: ${key}`);
  if (argList.length > 0) {
    argString += ", ";
  }
  argString += "_env";
  argList.push({
    dryRun: options.dryRun,
  });
  let templateText = addon.api.template.getTemplateText(key);
  if (options.useDefault && !templateText) {
    templateText =
      addon.api.template.DEFAULT_TEMPLATES.find((t) => t.name === key)?.text ||
      "";
    if (!templateText) {
      return "";
    }
  }

  let templateLines = templateText.split("\n");
  let startIndex = templateLines.indexOf(`// @${options.stage}-begin`),
    endIndex = templateLines.indexOf(`// @${options.stage}-end`);
  if (
    startIndex < 0 &&
    endIndex < 0 &&
    typeof options.stage === "string" &&
    options.stage !== "default"
  ) {
    // Skip this stage
    return "";
  }
  if (startIndex < 0) {
    // We skip the flag line later
    startIndex = -1;
  }
  if (endIndex < 0) {
    endIndex = templateLines.length;
  }
  // Skip the flag lines
  templateLines = templateLines.slice(startIndex + 1, endIndex);
  let useMarkdown = false;
  let mdIndex = templateLines.indexOf("// @use-markdown");
  if (mdIndex >= 0) {
    useMarkdown = true;
    templateLines.splice(mdIndex, 1);
  }
  templateText = templateLines.join("\n");

  try {
    const func = new AsyncFunction(argString, "return `" + templateText + "`");
    const res = await func(...argList);
    ztoolkit.log(res);
    return useMarkdown ? await addon.api.convert.md2html(res) : res;
  } catch (e) {
    ztoolkit.log(e);
    if (options.dryRun) {
      return String(e);
    }
    window.alert(`Template ${key} Error: ${e}`);
    return "";
  }
}

async function runItemTemplate(
  key: string,
  options: {
    itemIds?: number[];
    targetNoteId?: number;
    dryRun?: boolean;
  }
): Promise<string> {
  /**
   * args:
   * beforeloop stage: items, copyNoteImage, sharedObj(for temporary variables, shared by all stages)
   * default stage: topItem, itemNotes, copyNoteImage, sharedObj
   * afterloop stage: items, copyNoteImage, sharedObj
   */
  let { itemIds, targetNoteId, dryRun } = options;
  if (!itemIds) {
    itemIds = await itemPicker();
  }

  const items = itemIds?.map((id) => Zotero.Items.get(id)) || [];

  const copyImageRefNotes: Zotero.Item[] = [];
  const copyNoteImage = (noteItem: Zotero.Item) => {
    copyImageRefNotes.push(noteItem);
  };

  const sharedObj = {};

  const results = [];

  results.push(
    await runTemplate(
      key,
      "items, copyNoteImage, sharedObj",
      [items, copyNoteImage, sharedObj],
      {
        stage: "beforeloop",
        useDefault: false,
        dryRun,
      }
    )
  );

  for (const topItem of items) {
    const itemNotes = topItem.isRegularItem()
      ? Zotero.Items.get(topItem.getNotes())
      : [];
    results.push(
      await runTemplate(
        key,
        "topItem, itemNotes, copyNoteImage, sharedObj",
        [topItem, itemNotes, copyNoteImage, sharedObj],
        {
          dryRun,
        }
      )
    );
  }

  results.push(
    await runTemplate(
      key,
      "items, copyNoteImage, sharedObj",
      [items, copyNoteImage, sharedObj],
      {
        stage: "afterloop",
        useDefault: false,
        dryRun,
      }
    )
  );

  let html = results.join("\n");
  const targetNoteItem = Zotero.Items.get(targetNoteId || -1);
  if (targetNoteItem && targetNoteItem.isNote()) {
    html = await copyEmbeddedImagesInHTML(
      html,
      targetNoteItem,
      copyImageRefNotes
    );
  } else {
    html = await renderNoteHTML(html, copyImageRefNotes);
  }
  return html;
}
