import { VirtualizedTableHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";

document.addEventListener("DOMContentLoaded", (ev) => {
  init();
});

document.addEventListener("dialogaccept", () => accept());

let args = window.arguments[0] as any;
if (!args._initPromise) {
  args = args.wrappedJSObject;
}
const templateData = (args.templates as string[]) || [];
templateData.sort();
const multiSelect = args.multiSelect;
let tableHelper: VirtualizedTableHelper;

function init() {
  args._initPromise.resolve();
  initTable();
  requestIdleCallback(() => {
    window.sizeToContent();
  });
}

function accept() {
  const selected = tableHelper.treeInstance.selection.selected;
  args.selected = Array.from(selected).map(
    (index: number) => templateData[index],
  );
}

// @ts-ignore - plugin instance
const getString = (Zotero[config.addonRef] as typeof addon).api.utils.getString;

function initTable() {
  tableHelper = new VirtualizedTableHelper(window)
    .setContainerId("table-container")
    .setProp({
      id: "templates-table",
      // Do not use setLocale, as it modifies the Zotero.Intl.strings
      // Set locales directly to columns
      columns: [
        {
          dataKey: "type",
          label: "templateEditor-templateType",
          width: 60,
          fixedWidth: true,
        },
        {
          dataKey: "name",
          label: "templateEditor-templateName",
          fixedWidth: false,
        },
      ].map((column) =>
        Object.assign(column, {
          label: getString(column.label),
        }),
      ),
      showHeader: true,
      multiSelect: multiSelect,
      staticColumns: true,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => templateData.length)
    .setProp("getRowData", getRowData)
    .setProp("getRowString", (index) => templateData[index] || "")
    .setProp("renderItem", (index, selection, oldElem, columns) => {
      let div;
      if (oldElem) {
        div = oldElem;
        div.innerHTML = "";
      } else {
        div = document.createElement("div");
        div.className = "row";
      }

      div.classList.toggle("selected", selection.isSelected(index));
      div.classList.toggle("focused", selection.focused == index);
      const rowData = getRowData(index);

      for (const column of columns) {
        const span = document.createElement("span");
        // @ts-ignore
        span.className = `cell ${column?.className}`;
        const cellData = rowData[column.dataKey as keyof typeof rowData];
        span.textContent = cellData;
        if (column.dataKey === "type") {
          span.style.backgroundColor = getRowLabelColor(cellData);
          span.style.borderRadius = "4px";
          span.style.paddingInline = "4px";
          span.style.marginInline = "2px -2px";
          span.style.textAlign = "center";
          span.textContent = getString(
            "templateEditor-templateDisplayType",
            cellData,
          );
        }
        div.append(span);
      }
      return div;
    })
    .render();
}

function getRowData(index: number) {
  const rowData = templateData[index];
  if (!rowData) {
    return {
      name: "",
      type: "unknown",
    };
  }
  let templateType = "unknown";
  let templateDisplayName = rowData;
  if (rowData.toLowerCase().startsWith("[item]")) {
    templateType = "item";
    templateDisplayName = rowData.slice(6);
  } else if (rowData.toLowerCase().startsWith("[text]")) {
    templateType = "text";
    templateDisplayName = rowData.slice(6);
  }
  return {
    name: templateDisplayName,
    type: templateType,
  };
}

function getRowLabelColor(type: string) {
  switch (type) {
    case "system":
      return "var(--accent-yellow)";
    case "item":
      return "var(--accent-green)";
    case "text":
      return "var(--accent-azure)";
    default:
      return "var(--accent-red)";
  }
}
