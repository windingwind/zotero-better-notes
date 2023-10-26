import { itemPicker } from "../../utils/itemPicker";
import { getString } from "../../utils/locale";
import { fill, slice } from "../../utils/str";

export { runTemplate, runTextTemplate, runItemTemplate };

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
  },
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

  if (!options.stage) {
    options.stage = "default";
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
    // We skip the pragma line later
    startIndex = -1;
  }
  if (endIndex < 0) {
    endIndex = templateLines.length;
  }
  // Check the markdown pragma
  templateLines = templateLines.slice(startIndex + 1, endIndex);
  let useMarkdown = false;
  const mdIndex = templateLines.findIndex((line) =>
    line.startsWith("// @use-markdown"),
  );
  if (mdIndex >= 0) {
    useMarkdown = true;
  }
  // Skip other pragmas
  templateLines = templateLines.filter((line) => !line.startsWith("// @"));
  templateText = templateLines.join("\n");

  function constructFunction(content: string) {
    return `$\{await new Promise(async (_resolve) => {
      const _call = async () => {
        ${content}
      };
      _resolve(await _call());})}`;
  }

  // Replace string inside ${{}}$ to async function
  templateText = templateText.replace(
    /\$\{\{([\s\S]*?)\}\}\$/g,
    (match, content) => {
      return constructFunction(content);
    },
  );

  try {
    const func = new AsyncFunction(argString, "return `" + templateText + "`");
    const res = await func(...argList);
    ztoolkit.log(res);
    return useMarkdown ? await addon.api.convert.md2html(res) : res;
  } catch (e) {
    ztoolkit.log(e);
    if (options.dryRun) {
      return "Template Preview Error: " + String(e);
    }
    window.alert(`Template ${key} Error: ${e}`);
    return "";
  }
}

async function runTextTemplate(
  key: string,
  options: {
    targetNoteId?: number;
    dryRun?: boolean;
  },
) {
  const { targetNoteId, dryRun } = options;
  const targetNoteItem = Zotero.Items.get(targetNoteId || -1);
  const sharedObj = {};
  return await runTemplate(
    key,
    "targetNoteItem, sharedObj",
    [targetNoteItem, sharedObj],
    {
      dryRun,
    },
  );
}

async function runItemTemplate(
  key: string,
  options: {
    itemIds?: number[];
    targetNoteId?: number;
    dryRun?: boolean;
  },
): Promise<string> {
  /**
   * args:
   * beforeloop stage: items, copyNoteImage, sharedObj(for temporary variables, shared by all stages)
   * default stage: topItem, itemNotes, copyNoteImage, sharedObj
   * afterloop stage: items, copyNoteImage, sharedObj
   */
  let { itemIds } = options;
  const { targetNoteId, dryRun } = options;
  if (!itemIds) {
    itemIds = await getItemTemplateData();
  }
  if (itemIds?.length === 0) {
    return "";
  }

  let targetNoteItem: Zotero.Item | undefined = Zotero.Items.get(
    targetNoteId || -1,
  );
  if (!targetNoteItem) {
    targetNoteItem = undefined;
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
      "items, targetNoteItem, copyNoteImage, sharedObj",
      [items, targetNoteItem, copyNoteImage, sharedObj],
      {
        stage: "beforeloop",
        useDefault: false,
        dryRun,
      },
    ),
  );

  for (const topItem of items) {
    const itemNotes = topItem.isNote()
      ? []
      : Zotero.Items.get(topItem.getNotes());
    results.push(
      await runTemplate(
        key,
        "topItem, targetNoteItem, itemNotes, copyNoteImage, sharedObj",
        [topItem, targetNoteItem, itemNotes, copyNoteImage, sharedObj],
        {
          dryRun,
        },
      ),
    );
  }

  results.push(
    await runTemplate(
      key,
      "items, targetNoteItem, copyNoteImage, sharedObj",
      [items, targetNoteItem, copyNoteImage, sharedObj],
      {
        stage: "afterloop",
        useDefault: false,
        dryRun,
      },
    ),
  );

  const html = results.join("\n");
  return await addon.api.convert.note2html(copyImageRefNotes, {
    targetNoteItem,
    html,
  });
}

async function getItemTemplateData() {
  const librarySelectedIds = addon.data.template.picker.data.librarySelectedIds;
  if (librarySelectedIds && librarySelectedIds.length !== 0) {
    const firstSelectedItem = Zotero.Items.get(librarySelectedIds[0]);
    const data = {} as Record<string, any>;
    data;
    new ztoolkit.Dialog(1, 1)
      .setDialogData(data)
      .addCell(0, 0, {
        tag: "div",
        properties: {
          innerHTML: `${fill(
            slice(
              (firstSelectedItem.getField("title") as string) ||
                firstSelectedItem.key,
              40,
            ),
            40,
          )} ${
            librarySelectedIds.length > 1
              ? `and ${librarySelectedIds.length - 1} more`
              : ""
          } ${getString("templatePicker.itemData.info")}`,
        },
      })
      .addButton(getString("templatePicker.itemData.useLibrary"), "useLibrary")
      .addButton(getString("templatePicker.itemData.useCustom"), "useCustom")
      .open(getString("templatePicker.itemData.title"));
    await data.unloadLock.promise;
    if (data._lastButtonId === "useLibrary") {
      return librarySelectedIds;
    } else if (data._lastButtonId == "useCustom") {
      return await itemPicker();
    } else {
      return [];
    }
  }
  return await itemPicker();
}
