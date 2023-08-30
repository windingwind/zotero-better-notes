import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import { getString } from "../../utils/locale";
import { getNoteTreeFlattened } from "../../utils/note";
import { getPref } from "../../utils/prefs";
import { waitUtilAsync } from "../../utils/wait";
import { OutlineType } from "../../utils/workspace";
import { saveFreeMind as _saveFreeMind } from "../export/freemind";

function makeId(key: string) {
  return `betternotes-workspace-${key}`;
}

export function initWorkspace(container: XUL.Box | undefined) {
  if (!container) {
    return;
  }
  function makeTooltipProp(
    id: string,
    content: string,
    title: string,
    callback: (ev: Event) => void,
  ) {
    return {
      tag: "div",
      id,
      classList: ["tooltip"],
      children: [
        {
          tag: "button",
          namespace: "html",
          classList: ["tool-button"],
          properties: {
            innerHTML: content,
          },
          listeners: [
            {
              type: "click",
              listener: callback,
            },
          ],
        },
        {
          tag: "span",
          classList: ["tooltiptext"],
          properties: {
            innerHTML: title,
          },
        },
      ],
    };
  }
  ztoolkit.UI.appendElement(
    {
      tag: "hbox",
      id: makeId("top-container"),
      styles: { width: "100%", height: "100%" },
      properties: {},
      attributes: {
        flex: "1",
      },
      children: [
        {
          tag: "vbox",
          id: makeId("outline-container"),
          styles: {
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
          attributes: {
            width: "330",
            minwidth: "300",
            flex: "1",
          },
          children: [
            {
              tag: "link",
              properties: {
                rel: "stylesheet",
                href: `chrome://${config.addonRef}/content/tooltip.css`,
              },
            },
            {
              tag: "div",
              id: makeId("outline-content"),
              styles: {
                height: "100%",
              },
              children: [
                {
                  tag: "iframe",
                  id: makeId("outline-iframe"),
                  properties: {
                    width: "100%",
                  },
                  styles: {
                    border: "0",
                    height: "100%",
                  },
                },
              ],
            },
            {
              tag: "div",
              id: makeId("outline-buttons"),
              styles: {
                height: "50px",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                margin: "10px 20px 10px 20px",
              },
              children: [
                makeTooltipProp(
                  makeId("switchOutline"),
                  ICONS.switchOutline,
                  getString("workspace.switchOutline"),
                  (ev) => {
                    setOutline(container);
                  },
                ),
                makeTooltipProp(
                  makeId("saveOutlineImage"),
                  ICONS.saveOutlineImage,
                  getString("workspace.saveOutlineImage"),
                  (ev) => {
                    saveImage(container);
                  },
                ),
                makeTooltipProp(
                  makeId("saveOutlineFreeMind"),
                  ICONS.saveOutlineFreeMind,
                  getString("workspace.saveOutlineFreeMind"),
                  (ev) => {
                    saveFreeMind();
                  },
                ),
              ],
            },
          ],
        },
        {
          tag: "splitter",
          id: makeId("outline-splitter"),
          attributes: { collapse: "before" },
          children: [
            {
              tag: "grippy",
            },
          ],
        },
        {
          tag: "vbox",
          id: makeId("editor-main-container"),
          attributes: {
            flex: "1",
            width: "700",
          },
        },
        {
          tag: "splitter",
          id: makeId("preview-splitter"),
          attributes: { collapse: "after", state: "collapsed" },
          children: [
            {
              tag: "grippy",
            },
          ],
        },
        {
          tag: "vbox",
          id: makeId("editor-preview-container"),
          attributes: {
            flex: "1",
            width: "500",
          },
        },
      ],
    },
    container,
  );
  // Manually add custom editor items in Zotero 7
  // @ts-ignore
  const customElements = container.ownerGlobal
    .customElements as CustomElementRegistry;
  const mainEditorContainer = container.querySelector(
    `#${makeId("editor-main-container")}`,
  );
  const previewEditorContainer = container.querySelector(
    `#${makeId("editor-preview-container")}`,
  );
  const mainEditor = new (customElements.get("note-editor")!)();
  mainEditor.id = makeId("editor-main");
  mainEditor.setAttribute("flex", "1");
  const previewEditor = new (customElements.get("note-editor")!)();
  previewEditor.id = makeId("editor-preview");
  previewEditor.setAttribute("flex", "1");
  mainEditorContainer?.append(mainEditor);
  previewEditorContainer?.append(previewEditor);

  const outlineContainer = container.querySelector(
    `#${makeId("outline-container")}`,
  ) as XUL.Box;
  const outlineMut = new (ztoolkit.getGlobal("MutationObserver"))(
    (mutations) => {
      if (outlineContainer.getAttribute("collapsed") === "true") {
        outlineContainer.style.removeProperty("display");
      } else {
        outlineContainer.style.display = "flex";
      }
    },
  );
  outlineMut.observe(outlineContainer, {
    attributes: true,
    attributeFilter: ["collapsed"],
  });

  setOutline(container, OutlineType.treeView);
  initWorkspaceEditor(container, "main", addon.data.workspace.mainId);
}

export async function initWorkspaceEditor(
  container: XUL.Box | undefined,
  type: "main" | "preview",
  noteId: number,
  options: {
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  const noteItem = Zotero.Items.get(noteId);
  if (!noteItem || !noteItem.isNote()) {
    if (window.confirm(getString("alert.notValidWorkspaceNote"))) {
      await addon.hooks.onCreateWorkspaceNote();
    }
    return;
  }
  const editorElem = container?.querySelector(
    `#${makeId("editor-" + type)}`,
  ) as EditorElement;
  await waitUtilAsync(() => Boolean(editorElem._initialized))
    .then(() => ztoolkit.log("ok"))
    .catch(() => ztoolkit.log("fail"));
  if (!editorElem._initialized) {
    throw new Error("initNoteEditor: waiting initialization failed");
  }
  editorElem.mode = "edit";
  editorElem.viewMode = "library";
  editorElem.parent = undefined;
  editorElem.item = noteItem;
  await waitUtilAsync(() => Boolean(editorElem._editorInstance));
  await editorElem._editorInstance._initPromise;
  if (typeof options.lineIndex === "number") {
    addon.api.editor.scroll(editorElem._editorInstance, options.lineIndex);
  }
  if (typeof options.sectionName === "string") {
    addon.api.editor.scrollToSection(
      editorElem._editorInstance,
      options.sectionName,
    );
  }
  return;
}

function getContainerType(
  container: XUL.Box | undefined,
): "tab" | "window" | "unknown" {
  if (!container) {
    return "unknown";
  }
  return (container.getAttribute("workspace-type") || "unknown") as
    | "tab"
    | "window"
    | "unknown";
}

export function toggleOutlinePane(visibility?: boolean, container?: XUL.Box) {
  const splitter = container?.querySelector(`#${makeId("outline-splitter")}`);
  if (typeof visibility === "undefined") {
    visibility = splitter?.getAttribute("state") === "collapsed";
  }
  splitter?.setAttribute("state", visibility ? "open" : "collapsed");
}

export function togglePreviewPane(visibility?: boolean, container?: XUL.Box) {
  const splitter = container?.querySelector(`#${makeId("preview-splitter")}`);
  if (typeof visibility === "undefined") {
    visibility = splitter?.getAttribute("state") === "collapsed";
  }
  splitter?.setAttribute("state", visibility ? "open" : "collapsed");
}

export function toggleNotesPane(visibility?: boolean) {
  const splitter = document?.querySelector("#zotero-context-splitter");
  if (typeof visibility === "undefined") {
    visibility = splitter?.getAttribute("state") === "collapsed";
  }
  splitter?.setAttribute("state", visibility ? "open" : "collapsed");
}

export function getWorkspaceEditor(
  workspaceType: "tab" | "window",
  editorType: "main" | "preview" = "main",
) {
  const container =
    workspaceType === "tab"
      ? addon.data.workspace.tab.container
      : addon.data.workspace.window.container;
  return (
    container?.querySelector(`#${makeId(`editor-${editorType}`)}`) as
      | EditorElement
      | undefined
  )?._editorInstance;
}

const SRC_LIST = [
  "",
  `chrome://${config.addonRef}/content/treeView.html`,
  `chrome://${config.addonRef}/content/mindMap.html`,
  `chrome://${config.addonRef}/content/bubbleMap.html`,
];

function setOutline(
  container: XUL.Box,
  newType: OutlineType = OutlineType.empty,
) {
  if (newType === OutlineType.empty) {
    newType = addon.data.workspace.outline + 1;
  }
  if (newType > OutlineType.bubbleMap) {
    newType = OutlineType.treeView;
  }
  addon.data.workspace.outline = newType;
  (
    container.querySelector(`#${makeId("saveOutlineImage")}`) as HTMLDivElement
  ).hidden = newType === OutlineType.treeView;
  (
    container.querySelector(
      `#${makeId("saveOutlineFreeMind")}`,
    ) as HTMLDivElement
  ).hidden = newType === OutlineType.treeView;
  const iframe = container.querySelector(
    `#${makeId("outline-iframe")}`,
  ) as HTMLIFrameElement;
  iframe.setAttribute("src", SRC_LIST[addon.data.workspace.outline]);
  updateOutline(container);
  updateOutlineButtons(container);
}

export async function updateOutline(container: XUL.Box) {
  const iframe = container.querySelector(
    `#${makeId("outline-iframe")}`,
  ) as HTMLIFrameElement;
  await waitUtilAsync(
    () => iframe.contentWindow?.document.readyState === "complete",
  );
  iframe.contentWindow?.postMessage(
    {
      type: "setMindMapData",
      nodes: getNoteTreeFlattened(
        Zotero.Items.get(addon.data.workspace.mainId),
        { keepLink: true },
      ),
      workspaceType: getContainerType(container),
      expandLevel: getPref("workspace.outline.expandLevel"),
    },
    "*",
  );
}

function updateOutlineButtons(container: XUL.Box) {
  const outlineType = addon.data.workspace.outline;
  const isTreeView = outlineType === OutlineType.treeView;
  (
    container.querySelector(`#${makeId("saveOutlineImage")}`) as HTMLDivElement
  ).style.visibility = isTreeView ? "hidden" : "visible";
  (
    container.querySelector(
      `#${makeId("saveOutlineFreeMind")}`,
    ) as HTMLDivElement
  ).style.visibility = isTreeView ? "hidden" : "visible";
}

function saveImage(container: XUL.Box) {
  const iframe = container.querySelector(
    `#${makeId("outline-iframe")}`,
  ) as HTMLIFrameElement;
  iframe.contentWindow?.postMessage(
    {
      type: "saveSVG",
    },
    "*",
  );
}

async function saveFreeMind() {
  // TODO: uncouple this part
  const filename = await new ztoolkit.FilePicker(
    `${Zotero.getString("fileInterface.export")} FreeMind XML`,
    "save",
    [["FreeMind XML File(*.mm)", "*.mm"]],
    `${Zotero.Items.get(addon.data.workspace.mainId).getNoteTitle()}.mm`,
  ).open();
  if (filename) {
    await _saveFreeMind(filename, addon.data.workspace.mainId);
  }
}
