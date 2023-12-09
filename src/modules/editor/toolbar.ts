import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import { getLineAtCursor, getSectionAtCursor } from "../../utils/editor";
import { showHint } from "../../utils/hint";
import { getNoteLink, getNoteLinkParams } from "../../utils/link";
import { getString } from "../../utils/locale";
import {
  addLineToNote,
  getNoteTreeFlattened,
  getNoteType,
} from "../../utils/note";
import { getPref } from "../../utils/prefs";
import { slice } from "../../utils/str";

export async function initEditorToolbar(editor: Zotero.EditorInstance) {
  const noteItem = editor._item;
  const noteType = getNoteType(noteItem.id);
  const toolbar = await registerEditorToolbar(editor, makeId("toolbar"));

  // Settings
  const settingsButton = await registerEditorToolbarDropdown(
    editor,
    toolbar,
    makeId("settings"),
    ICONS.settings,
    getString("editor.toolbar.settings.title"),
    "end",
    (e) => {},
  );

  settingsButton.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    function removePopup() {
      const popup = editor._iframeWindow.document.querySelector(
        `#${makeId("settings-popup")}`,
      );
      if (popup) {
        popup.remove();
        settingsButton
          .querySelector(".toolbar-button")
          ?.classList.remove("active");
        editor._iframeWindow.document.removeEventListener("click", removePopup);
        return true;
      }
      return false;
    }

    if (removePopup()) {
      return;
    }

    const currentLine = getLineAtCursor(editor);
    const currentSection = getSectionAtCursor(editor);
    const settingsMenuData: PopupData[] = [
      {
        id: makeId("settings-openWorkspace"),
        text: getString("editor.toolbar.settings.openWorkspace"),
        callback: (e) => {
          addon.hooks.onOpenWorkspace("tab");
        },
      },
      {
        id: makeId("settings-setWorkspace"),
        text: getString("editor.toolbar.settings.setWorkspace"),
        callback: (e) => {
          addon.hooks.onSetWorkspaceNote(e.editor._item.id, "main");
        },
      },
      {
        id: makeId("settings-previewInWorkspace"),
        text: getString("editor.toolbar.settings.previewInWorkspace"),
        callback: (e) => {
          addon.hooks.onOpenWorkspace("tab");
          addon.hooks.onSetWorkspaceNote(e.editor._item.id, "preview");
        },
      },
      {
        id: makeId("settings-showInLibrary"),
        text: getString("editor.toolbar.settings.showInLibrary"),
        callback: (e) => {
          ZoteroPane.selectItems([e.editor._item.id]);
        },
      },
    ];

    if (currentLine >= 0) {
      settingsMenuData.push(
        ...(<PopupData[]>[
          {
            type: "splitter",
          },
          {
            id: makeId("settings-export"),
            text: getString("editor.toolbar.settings.export"),
            callback: (e) => {
              if (addon.api.sync.isSyncNote(noteItem.id)) {
                addon.hooks.onShowSyncInfo(noteItem.id);
              } else {
                addon.hooks.onShowExportNoteOptions([noteItem.id]);
              }
            },
          },
          {
            type: "splitter",
          },
          {
            id: makeId("settings-insertTemplate"),
            text: getString("editor.toolbar.settings.insertTemplate"),
            callback: (e) => {
              addon.hooks.onShowTemplatePicker("insert", {
                noteId: e.editor._item.id,
                lineIndex: currentLine,
              });
            },
          },
          {
            type: "splitter",
          },
          {
            id: makeId("settings-copyLink"),
            text: getString("editor.toolbar.settings.copyLink", {
              args: {
                line: currentLine,
              },
            }),
            callback: (e) => {
              const link =
                getNoteLink(e.editor._item, {
                  lineIndex: currentLine,
                }) || "";
              new ztoolkit.Clipboard()
                .addText(link, "text/unicode")
                .addText(
                  `<a href="${link}">${
                    e.editor._item.getNoteTitle().trim() || link
                  }</a>`,
                  "text/html",
                )
                .copy();
              showHint(`Link ${link} copied`);
            },
          },
          {
            id: makeId("settings-copyLinkAtSection"),
            text: getString("editor.toolbar.settings.copyLinkAtSection", {
              args: {
                section: currentSection,
              },
            }),
            callback: (e) => {
              const link =
                getNoteLink(e.editor._item, {
                  sectionName: currentSection,
                }) || "";
              new ztoolkit.Clipboard()
                .addText(link, "text/unicode")
                .addText(
                  `<a href="${link}#${currentSection}">${
                    e.editor._item.getNoteTitle().trim() || link
                  }</a>`,
                  "text/html",
                )
                .copy();
              showHint(`Link ${link} copied`);
            },
          },
          {
            id: makeId("settings-updateRelatedNotes"),
            text: getString("editor-toolbar-settings-updateRelatedNotes"),
            callback: (e) => {
              addon.api.note.updateRelatedNotes(e.editor._item.id);
            },
          },
        ]),
      );
    }

    const parentAttachment = await noteItem.parentItem?.getBestAttachment();
    if (parentAttachment) {
      settingsMenuData.push(
        ...(<PopupData[]>[
          {
            type: "splitter",
          },
          {
            id: makeId("settings-openParent"),
            text: getString("editor.toolbar.settings.openParent"),
            callback: (e) => {
              ZoteroPane.viewAttachment([parentAttachment.id]);
              Zotero.Notifier.trigger("open", "file", parentAttachment.id);
            },
          },
        ]),
      );
    }

    if (addon.api.sync.isSyncNote(noteItem.id)) {
      settingsMenuData.splice(5, 0, {
        id: makeId("settings-refreshSyncing"),
        text: getString("editor.toolbar.settings.refreshSyncing"),
        callback: (e) => {
          addon.hooks.onSyncing(undefined, {
            quiet: false,
            skipActive: false,
            reason: "manual-editor",
          });
        },
      });
    }

    registerEditorToolbarPopup(
      editor,
      settingsButton,
      `${config.addonRef}-settings-popup`,
      "right",
      settingsMenuData,
    ).then((popup) => {
      settingsButton.querySelector(".toolbar-button")?.classList.add("active");
      editor._iframeWindow.document.addEventListener("click", removePopup);
    });
  });

  // Center button
  if (noteType === "main") {
    registerEditorToolbarElement(
      editor,
      toolbar,
      "middle",
      ztoolkit.UI.createElement(editor._iframeWindow.document, "div", {
        properties: { innerHTML: getString("editor.toolbar.main") },
      }),
    );
  } else {
    const onTriggerMenu = (ev: MouseEvent) => {
      editor._iframeWindow.focus();
      const linkMenu: PopupData[] = getLinkMenuData(editor);
      editor._iframeWindow.document
        .querySelector(`#${makeId("link")}`)!
        .querySelector(".toolbar-button")!.innerHTML = ICONS.linkAfter;

      const popup = registerEditorToolbarPopup(
        editor,
        linkButton,
        `${config.addonRef}-link-popup`,
        "middle",
        linkMenu,
      );
    };

    const onExitMenu = (ev: MouseEvent) => {
      editor._iframeWindow.document
        .querySelector(`#${makeId("link-popup")}`)
        ?.remove();
      editor._iframeWindow.document
        .querySelector(`#${makeId("link")}`)!
        .querySelector(".toolbar-button")!.innerHTML = ICONS.addon;
    };

    const onClickMenu = async (ev: MouseEvent) => {
      const mainNote = Zotero.Items.get(addon.data.workspace.mainId) || null;
      if (!mainNote?.isNote()) {
        return;
      }
      const lineIndex = parseInt(
        (ev.target as HTMLDivElement).id.split("-").pop() || "-1",
      );
      const forwardLink = getNoteLink(noteItem);
      const backLink = getNoteLink(mainNote, { ignore: true, lineIndex });
      addLineToNote(
        mainNote,
        await addon.api.template.runTemplate(
          "[QuickInsertV2]",
          "link, linkText, subNoteItem, noteItem",
          [
            forwardLink,
            noteItem.getNoteTitle().trim() || forwardLink,
            noteItem,
            mainNote,
          ],
        ),
        lineIndex,
      );
      addLineToNote(
        noteItem,
        await addon.api.template.runTemplate(
          "[QuickBackLinkV2]",
          "link, linkText, subNoteItem, noteItem",
          [
            backLink,
            mainNote.getNoteTitle().trim() || "Workspace Note",
            noteItem,
            mainNote,
            "",
          ],
        ),
      );
      onExitMenu(ev);
      ev.stopPropagation();
    };

    const linkButton = await registerEditorToolbarDropdown(
      editor,
      toolbar,
      makeId("link"),
      ICONS.addon,
      getString("editor.toolbar.link.title"),
      "middle",
      onClickMenu,
    );

    linkButton.addEventListener("mouseenter", onTriggerMenu);
    linkButton.addEventListener("mouseleave", onExitMenu);
    linkButton.addEventListener("mouseleave", onExitMenu);
    linkButton.addEventListener("click", (ev) => {
      if ((ev.target as HTMLElement).classList.contains("option")) {
        onClickMenu(ev);
      }
    });
    editor._iframeWindow.document.addEventListener("click", onExitMenu);
  }

  // Export
  // const exportButton = await registerEditorToolbarDropdown(
  //   editor,
  //   toolbar,
  //   makeId("export"),
  //   ICONS.export,
  //   getString("editor.toolbar.export.title"),
  //   "end",
  //   (e) => {
  //     if (addon.api.sync.isSyncNote(noteItem.id)) {
  //       addon.hooks.onShowSyncInfo(noteItem.id);
  //     } else {
  //       addon.hooks.onShowExportNoteOptions([noteItem.id]);
  //     }
  //   }
  // );
}

function getLinkMenuData(editor: Zotero.EditorInstance): PopupData[] {
  const workspaceNote = Zotero.Items.get(addon.data.workspace.mainId) || null;
  const currentNote = editor._item;
  if (!workspaceNote?.isNote()) {
    return [
      {
        id: makeId("link-popup-nodata"),
        text: getString("editor.toolbar.link.popup.nodata"),
      },
    ];
  }
  const nodes = getNoteTreeFlattened(workspaceNote, {
    keepLink: true,
  });
  const menuData: PopupData[] = [];
  for (const node of nodes) {
    if (node.model.level === 7) {
      const lastMenu =
        menuData.length > 0 ? menuData[menuData.length - 1] : null;
      const linkNote = getNoteLinkParams(node.model.link).noteItem;
      if (linkNote && linkNote.id === currentNote.id && lastMenu) {
        lastMenu.suffix = "🔗";
      }
      continue;
    }
    menuData.push({
      id: makeId(
        `link-popup-${
          getPref("editor.link.insertPosition")
            ? node.model.lineIndex - 1
            : node.model.endIndex
        }`,
      ),
      text: node.model.name,
      prefix: "·".repeat(node.model.level - 1),
    });
  }
  return menuData;
}

async function registerEditorToolbar(
  editor: Zotero.EditorInstance,
  id: string,
) {
  await editor._initPromise;
  const _document = editor._iframeWindow.document;
  const toolbar = ztoolkit.UI.createElement(_document, "div", {
    attributes: {
      id,
    },
    classList: ["toolbar"],
    children: [
      {
        tag: "div",
        classList: ["start"],
      },
      {
        tag: "div",
        classList: ["middle"],
      },
      {
        tag: "div",
        classList: ["end"],
      },
    ],
    ignoreIfExists: true,
  }) as HTMLDivElement;
  _document.querySelector(".editor")?.childNodes[0].before(toolbar);
  return toolbar;
}

async function registerEditorToolbarDropdown(
  editor: Zotero.EditorInstance,
  toolbar: HTMLDivElement,
  id: string,
  icon: string,
  title: string,
  position: "start" | "middle" | "end",
  callback: (e: MouseEvent & { editor: Zotero.EditorInstance }) => any,
) {
  await editor._initPromise;
  const _document = editor._iframeWindow.document;
  const dropdown = ztoolkit.UI.createElement(_document, "div", {
    attributes: {
      id,
      title,
    },
    classList: ["dropdown", "more-dropdown"],
    children: [
      {
        tag: "button",
        attributes: {
          title,
        },
        properties: {
          innerHTML: icon,
        },
        classList: ["toolbar-button"],
        listeners: [
          {
            type: "click",
            listener: (e) => {
              Object.assign(e, { editor });
              if (callback) {
                callback(
                  e as any as MouseEvent & { editor: Zotero.EditorInstance },
                );
              }
            },
          },
        ],
      },
    ],
    skipIfExists: true,
  });
  toolbar.querySelector(`.${position}`)?.append(dropdown);
  return dropdown;
}

declare interface PopupData {
  type?: "item" | "splitter";
  id?: string;
  text?: string;
  prefix?: string;
  suffix?: string;
  callback?: (e: MouseEvent & { editor: Zotero.EditorInstance }) => any;
}

async function registerEditorToolbarPopup(
  editor: Zotero.EditorInstance,
  dropdown: HTMLDivElement,
  id: string,
  align: "middle" | "left" | "right",
  popupLines: PopupData[],
) {
  await editor._initPromise;
  const popup = ztoolkit.UI.appendElement(
    {
      tag: "div",
      classList: ["popup"],
      id,
      children: popupLines.map((props) => {
        return props.type === "splitter"
          ? {
              tag: "hr",
              properties: {
                id: props.id,
              },
            }
          : {
              tag: "button",
              classList: ["option"],
              properties: {
                id: props.id,
                innerHTML:
                  slice((props.prefix || "") + props.text, 30) +
                  (props.suffix || ""),
                title: "",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e) => {
                    Object.assign(e, { editor });
                    props.callback &&
                      props.callback(
                        e as any as MouseEvent & {
                          editor: Zotero.EditorInstance;
                        },
                      );
                  },
                },
              ],
            };
      }),
      removeIfExists: true,
    },
    dropdown,
  ) as HTMLDivElement;
  let style: string = "";
  if (align === "middle") {
    style = `right: -${popup.offsetWidth / 2 - 15}px;`;
  } else if (align === "left") {
    style = "left: 0; right: auto;";
  } else if (align === "right") {
    style = "right: 0;";
  }
  popup.setAttribute("style", style);
  return popup;
}

async function registerEditorToolbarElement(
  editor: Zotero.EditorInstance,
  toolbar: HTMLDivElement,
  position: "start" | "middle" | "end",
  elem: HTMLElement,
) {
  await editor._initPromise;
  toolbar.querySelector(`.${position}`)?.append(elem);
  return elem;
}

function makeId(key: string) {
  return `${config.addonRef}-${key}`;
}
