import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import { getLineAtCursor, getSectionAtCursor } from "../../utils/editor";
import { showHint } from "../../utils/hint";
import { getNoteLink } from "../../utils/link";
import { getString } from "../../utils/locale";
import { openLinkNoteDialog } from "../../utils/linkNote";
import { slice } from "../../utils/str";

export async function initEditorToolbar(editor: Zotero.EditorInstance) {
  const noteItem = editor._item;

  const _document = editor._iframeWindow.document;
  registerEditorToolbarElement(
    editor,
    _document.querySelector(".toolbar") as HTMLDivElement,
    "start",
    ztoolkit.UI.createElement(_document, "button", {
      classList: ["toolbar-button"],
      properties: {
        innerHTML: ICONS.addon,
        title: "Link current note to another note",
      },
      listeners: [
        {
          type: "click",
          listener: (e) => {
            openLinkNoteDialog(noteItem);
          },
        },
      ],
    }) as HTMLButtonElement,
  );

  const settingsButton = editor._iframeWindow.document.querySelector(
    ".toolbar .end .dropdown .toolbar-button",
  ) as HTMLDivElement;

  const MutationObserver = // @ts-ignore
    editor._iframeWindow.MutationObserver as typeof window.MutationObserver;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(async (mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class" &&
        mutation.target === settingsButton
      ) {
        if (settingsButton.classList.contains("active")) {
          const dropdown = settingsButton.parentElement!;
          const popup = dropdown.querySelector(".popup") as HTMLDivElement;
          ztoolkit.log(popup);
          registerEditorToolbarPopup(editor, popup, await getMenuData(editor));
        }
      }
    });
  });
  observer.observe(settingsButton, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

async function getMenuData(editor: Zotero.EditorInstance) {
  const noteItem = editor._item;

  const currentLine = getLineAtCursor(editor);
  const currentSection = slice(getSectionAtCursor(editor) || "", 10);
  const settingsMenuData: PopupData[] = [
    {
      id: makeId("settings-openWorkspace"),
      text: getString("editor.toolbar.settings.openWorkspace"),
      callback: (e) => {
        addon.hooks.onOpenWorkspace(noteItem, "tab");
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

  return settingsMenuData;
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
  popup: HTMLDivElement,
  popupLines: PopupData[],
) {
  await editor._initPromise;
  ztoolkit.UI.appendElement(
    {
      tag: "fragment",
      children: popupLines.map((props) => {
        return props.type === "splitter"
          ? {
              tag: "div",
              classList: ["separator"],
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
                  slice((props.prefix || "") + props.text, 50) +
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
    },
    popup,
  ) as HTMLDivElement;
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
