import { getString } from "../../utils/locale";
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

export async function showExportNoteOptions(noteIds: number[]) {
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
    (value) => typeof value === "string"
  );
  const data = dataKeys.reduce((acc, key) => {
    acc[key] = getPref(`export.${key}`) as boolean;
    return acc;
  }, {} as Record<string, any>);

  data.loadCallback = () => {
    const doc = dialog.window.document;
    const standaloneLinkRadio = doc.querySelector(
      "#standaloneLink"
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
      elem.addEventListener("change", updateSyncCheckbox)
    );
    updateSyncCheckbox();
  };

  const dialog = new ztoolkit.Dialog(17, 1)
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
          properties: {
            innerHTML: `${getString("export.target")}: ${fill(
              slice(noteItems[0].getNoteTitle(), 40),
              40
            )}${
              noteItems.length > 1 ? ` and ${noteItems.length - 1} more` : ""
            }`,
          },
        },
      ],
    })
    .addCell(1, 0, makeHeadingLine(getString("export.options.linkMode")))
    .addCell(2, 0, makeRadioLine("embedLink", "linkMode"))
    .addCell(3, 0, makeRadioLine("standaloneLink", "linkMode"))
    .addCell(4, 0, makeRadioLine("keepLink", "linkMode"))
    .addCell(5, 0, makeHeadingLine(getString("export.options.MD")))
    .addCell(6, 0, makeCheckboxLine("exportMD"))
    .addCell(7, 0, makeCheckboxLine("setAutoSync"))
    .addCell(8, 0, makeCheckboxLine("withYAMLHeader"))
    .addCell(9, 0, makeHeadingLine(getString("export.options.Docx")))
    .addCell(10, 0, makeCheckboxLine("exportDocx"))
    .addCell(11, 0, makeHeadingLine(getString("export.options.PDF")))
    .addCell(12, 0, makeCheckboxLine("exportPDF"))
    .addCell(13, 0, makeHeadingLine(getString("export.options.mm")))
    .addCell(14, 0, makeCheckboxLine("exportFreeMind"))
    .addCell(15, 0, makeHeadingLine(getString("export.options.note")))
    .addCell(16, 0, makeCheckboxLine("exportNote"))
    .addButton(getString("export.confirm"), "confirm")
    .addButton(getString("export.cancel"), "cancel")
    .open(getString("export.title"), {
      resizable: true,
      centerscreen: true,
      fitContent: true,
      noDialogMode: true,
    });

  await data.unloadLock?.promise;
  if (data._lastButtonId === "confirm") {
    addon.api.$export.exportNotes(noteItems, data as Record<string, boolean>);
    dataKeys.forEach((key) => {
      setPref(`export.${key}`, Boolean(data[key]));
    });
  }
}

function makeHeadingLine(text: string) {
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
        properties: {
          innerHTML: text,
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
        },
        properties: {
          innerHTML: getString(`export.${dataKey}`),
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
  callback?: (ev: Event) => void
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
        },
        properties: {
          innerHTML: getString(`export.${dataKey}`),
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
