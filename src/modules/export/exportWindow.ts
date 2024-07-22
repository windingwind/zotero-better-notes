import { config } from "../../../package.json";
import { getPref, setPref } from "../../utils/prefs";
import { fill, slice } from "../../utils/str";

enum OPTIONS {
  "embedLink",
  "standaloneLink",
  "keepLink",
  "exportMD",
  "setAutoSync",
  "withYAMLHeader",
  "exportDocx",
  "exportPDF",
  "exportFreeMind",
  "exportNote",
}

export async function showExportNoteOptions(
  noteIds: number[],
  overwriteOptions: Record<string, any> = {},
) {
  const items = Zotero.Items.get(noteIds);
  const noteItems: Zotero.Item[] = [];
  items.forEach((item) => {
    if (item.isNote()) {
      noteItems.push(item);
    }
    if (item.isRegularItem()) {
      noteItems.splice(0, 0, ...Zotero.Items.get(item.getNotes()));
    }
  });
  if (noteItems.length === 0) {
    return;
  }
  const dataKeys = Object.keys(OPTIONS).filter(
    (value) => typeof value === "string",
  );
  const data = dataKeys.reduce(
    (acc, key) => {
      acc[key] = getPref(`export.${key}`) as boolean;
      return acc;
    },
    {} as Record<string, any>,
  );

  data.loadCallback = () => {
    const doc = dialog.window.document;
    const standaloneLinkRadio = doc.querySelector(
      "#standaloneLink",
    ) as HTMLInputElement;
    const autoSyncRadio = doc.querySelector("#setAutoSync") as HTMLInputElement;
    function updateSyncCheckbox() {
      const standaloneLinkEnabled = standaloneLinkRadio.checked;
      if (!standaloneLinkEnabled) {
        autoSyncRadio.checked = false;
        autoSyncRadio.disabled = true;
      } else {
        autoSyncRadio.disabled = false;
      }
    }
    Array.from(doc.querySelectorAll('input[name="linkMode"]')).forEach((elem) =>
      elem.addEventListener("change", updateSyncCheckbox),
    );
    updateSyncCheckbox();
  };

  data.l10nFiles = `${config.addonRef}-export.ftl`;

  const dialog = new ztoolkit.Dialog(18, 1)
    .setDialogData(data)
    .addCell(0, 0, {
      tag: "div",
      styles: {
        display: "grid",
        gridTemplateColumns: "1fr 20px",
        rowGap: "10px",
        columnGap: "5px",
      },
      children: [
        {
          tag: "label",
          attributes: {
            "data-l10n-id": `${config.addonRef}-target`,
            "data-l10n-args": JSON.stringify({
              left: noteItems.length - 1,
              title: fill(slice(noteItems[0].getNoteTitle(), 40), 40),
            }),
          },
        },
      ],
    })
    .addCell(1, 0, makeHeadingLine("options-linkMode"))
    .addCell(2, 0, makeRadioLine("embedLink", "linkMode"))
    .addCell(3, 0, makeRadioLine("standaloneLink", "linkMode"))
    .addCell(4, 0, makeRadioLine("keepLink", "linkMode"))
    .addCell(5, 0, makeHeadingLine("options-MD"))
    .addCell(6, 0, makeCheckboxLine("exportMD"))
    .addCell(7, 0, makeCheckboxLine("setAutoSync"))
    .addCell(8, 0, makeCheckboxLine("withYAMLHeader"))
    .addCell(9, 0, makeCheckboxLine("autoMDFileName"))
    .addCell(10, 0, makeHeadingLine("options-Docx"))
    .addCell(11, 0, makeCheckboxLine("exportDocx"))
    .addCell(12, 0, makeHeadingLine("options-PDF"))
    .addCell(13, 0, makeCheckboxLine("exportPDF"))
    .addCell(14, 0, makeHeadingLine("options-mm"))
    .addCell(15, 0, makeCheckboxLine("exportFreeMind"))
    .addCell(16, 0, makeHeadingLine("options-note"))
    .addCell(17, 0, makeCheckboxLine("exportNote"))
    .addButton(`${config.addonRef}-confirm`, "confirm")
    .addButton(`${config.addonRef}-cancel`, "cancel")
    .open(`${config.addonRef}-title`, {
      resizable: true,
      centerscreen: true,
      width: 350,
      height: 600,
      noDialogMode: true,
    });

  await data.unloadLock?.promise;
  if (data._lastButtonId === "confirm") {
    await addon.api.$export.exportNotes(
      noteItems,
      Object.assign(data as Record<string, boolean>, overwriteOptions),
    );
    dataKeys.forEach((key) => {
      setPref(`export.${key}`, Boolean(data[key]));
    });
  }
}

function makeHeadingLine(l10nID: string) {
  return {
    tag: "div",
    styles: {
      display: "grid",
      gridTemplateColumns: "1fr 20px",
      rowGap: "10px",
      columnGap: "5px",
    },
    children: [
      {
        tag: "h3",
        attributes: {
          "data-l10n-id": `${config.addonRef}-${l10nID}`,
        },
      },
    ],
  };
}

function makeCheckboxLine(dataKey: string, callback?: (ev: Event) => void) {
  return {
    tag: "div",
    styles: {
      display: "grid",
      gridTemplateColumns: "1fr 20px",
      rowGap: "10px",
      columnGap: "5px",
    },
    children: [
      {
        tag: "label",
        attributes: {
          for: dataKey,
          "data-l10n-id": `${config.addonRef}-${dataKey}`,
        },
      },
      {
        tag: "input",
        id: dataKey,
        attributes: {
          "data-bind": dataKey,
          "data-prop": "checked",
        },
        properties: {
          type: "checkbox",
        },
        listeners: callback
          ? [
              {
                type: "change",
                listener: callback,
              },
            ]
          : [],
      },
    ],
  };
}

function makeRadioLine(
  dataKey: string,
  radioName: string,
  callback?: (ev: Event) => void,
) {
  return {
    tag: "div",
    styles: {
      display: "grid",
      gridTemplateColumns: "1fr 20px",
      rowGap: "10px",
      columnGap: "5px",
    },
    children: [
      {
        tag: "label",
        attributes: {
          for: dataKey,
          "data-l10n-id": `${config.addonRef}-${dataKey}`,
        },
      },
      {
        tag: "input",
        id: dataKey,
        attributes: {
          "data-bind": dataKey,
          "data-prop": "checked",
        },
        properties: {
          type: "radio",
          name: radioName,
          value: dataKey,
        },
        listeners: callback
          ? [
              {
                type: "change",
                listener: callback,
              },
            ]
          : [],
      },
    ],
  };
}
