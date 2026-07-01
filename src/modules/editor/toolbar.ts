import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import {
  copyNoteLink,
  getEditorAPI,
  getLineAtCursor,
  getSectionAtCursor,
} from "../../utils/editor";
import { getString } from "../../utils/locale";
import { openLinkCreator } from "../../utils/linkCreator";
import { slice } from "../../utils/str";
import { waitUtilAsync } from "../../utils/wait";

export async function initEditorToolbar(editor: Zotero.EditorInstance) {
  if (editor._disableUI) {
    return;
  }

  const noteItem = editor._item;

  const win = editor._iframeWindow;
  try {
    // Stop waiting as soon as the iframe is torn down, otherwise the condition
    // throws "can't access dead object" on every poll.
    await waitUtilAsync(
      () =>
        Components.utils.isDeadWrapper(win) ||
        !!win.document.querySelector(".toolbar"),
    );
  } catch (e) {
    ztoolkit.log("Editor toolbar not found");
    return;
  }
  if (Components.utils.isDeadWrapper(win)) {
    return;
  }
  const _document = win.document;
  const toolbar = _document.querySelector(".toolbar") as HTMLDivElement;
  if (!toolbar) {
    ztoolkit.log("Editor toolbar not found");
    return;
  }
  // Link creator
  registerEditorToolbarElement(
    editor,
    toolbar,
    "start",
    ztoolkit.UI.createElement(_document, "button", {
      classList: ["toolbar-button"],
      properties: {
        innerHTML: ICONS.linkCreator,
        title: "Link creator",
      },
      listeners: [
        {
          type: "click",
          listener: (e) => {
            editor.saveSync();
            openLinkCreator(noteItem, {
              lineIndex: getLineAtCursor(editor),
            });
          },
        },
      ],
    }) as HTMLButtonElement,
  );

  if (editor._tabID) {
    const sidebarState =
      Zotero.getMainWindow().Zotero_Tabs.getSidebarState("note");
    registerEditorToolbarElement(
      editor,
      toolbar,
      "start",
      ztoolkit.UI.createElement(_document, "button", {
        classList: ["toolbar-button", "bn-toggle-left-pane"],
        properties: {
          innerHTML: ICONS.workspaceToggle,
          title: "Toggle left pane",
        },
        styles: {
          display: sidebarState.open ? "none" : "inherit",
        },
        listeners: [
          {
            type: "click",
            listener: () => {
              Zotero.Notes.toggleSidebar(true);
            },
          },
        ],
      }),
    );
  }

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

  // Add a "To-do List" entry to the note-editor's format dropdown, alongside
  // the built-in list options. The dropdown's popup is created by React only
  // while open, so we re-inject whenever it appears.
  const textDropdown = _document.querySelector(".toolbar .text-dropdown");
  if (textDropdown) {
    const formatObserver = new MutationObserver(() => {
      try {
        const blockOptions = textDropdown.querySelector(".block-options");
        if (blockOptions) {
          injectTodoFormatOption(editor, blockOptions as HTMLElement);
        }
      } catch (e) {
        // The iframe may be tearing down mid-observation; ignore.
      }
    });
    formatObserver.observe(textDropdown, { childList: true, subtree: true });
  }
}

function injectTodoFormatOption(
  editor: Zotero.EditorInstance,
  blockOptions: HTMLElement,
) {
  if (blockOptions.querySelector(".bn-todo-option")) {
    return;
  }
  const api = getEditorAPI(editor);
  const doc = blockOptions.ownerDocument;
  const active = api.isTaskListActive();

  const button = ztoolkit.UI.createElement(doc, "button", {
    classList: active
      ? ["option", "bn-todo-option", "active"]
      : ["option", "bn-todo-option"],
    attributes: {
      role: "menuitem",
    },
    properties: {
      innerHTML: `<span>☑ ${getString("editor-toolbar-todoList")}</span>`,
    },
    listeners: [
      {
        // Keep the editor selection so the toggle acts on the current line.
        type: "mousedown",
        listener: (e) => e.preventDefault(),
      },
      {
        type: "click",
        listener: () => {
          api.toggleTaskList();
        },
      },
    ],
  });

  // Place it right after the built-in bullet-list option (identified by its
  // non-localized "•" glyph).
  const options = Array.from(
    blockOptions.querySelectorAll("button.option"),
  ) as HTMLElement[];
  const bulletButton = options.find(
    (el) => el !== button && (el.textContent || "").includes("•"),
  );
  // On a checkbox row the bullet-list option is also "active"; don't show two.
  if (active && bulletButton) {
    bulletButton.classList.remove("active");
  }
  if (bulletButton) {
    bulletButton.after(button);
  } else {
    blockOptions.append(button);
  }
}

async function getMenuData(editor: Zotero.EditorInstance) {
  const noteItem = editor._item;

  const currentLine = getLineAtCursor(editor);
  const currentSection = (await getSectionAtCursor(editor)) || "";
  const settingsMenuData: PopupData[] = [
    {
      id: makeId("settings-openAsTab"),
      text: getString("editor-toolbar-settings-openAsTab"),
      callback: (e) => {
        addon.hooks.onOpenNote(noteItem.id, "tab");
      },
    },
    {
      id: makeId("settings-openAsWindow"),
      text: getString("editor-toolbar-settings-openAsWindow"),
      callback: (e) => {
        addon.hooks.onOpenNote(noteItem.id, "window", { forceTakeover: true });
      },
    },
    {
      id: makeId("settings-showInLibrary"),
      text: getString("editor-toolbar-settings-showInLibrary"),
      callback: (e) => {
        Zotero.getMainWindow().ZoteroPane.selectItems([e.editor._item.id]);
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
          text: getString("editor-toolbar-settings-export"),
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
          text: getString("editor-toolbar-settings-insertTemplate"),
          callback: (e) => {
            addon.hooks.onShowTemplatePicker("insert", {
              noteId: e.editor._item.id,
              lineIndex: currentLine,
            });
          },
        },
        {
          id: makeId("settings-refreshTemplates"),
          text: getString("editor-toolbar-settings-refreshTemplates"),
          callback: (e) => {
            addon.hooks.onRefreshTemplatesInNote(e.editor);
          },
        },
        {
          type: "splitter",
        },
        {
          id: makeId("settings-copyLink"),
          text: getString("editor-toolbar-settings-copyLink", {
            args: {
              line: currentLine,
            },
          }),
          callback: (e) => {
            copyNoteLink(e.editor, "line");
          },
        },
        {
          id: makeId("settings-copyLinkAtSection"),
          text: getString("editor-toolbar-settings-copyLinkAtSection", {
            args: {
              section: slice(currentSection, 10),
            },
          }),
          callback: (e) => {
            copyNoteLink(e.editor, "section");
          },
        },
        {
          id: makeId("settings-updateRelatedNotes"),
          text: getString("editor-toolbar-settings-updateRelatedNotes"),
          callback: (e) => {
            addon.api.relation.updateNoteLinkRelation(e.editor._item.id);
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
          text: getString("editor-toolbar-settings-openParent"),
          callback: (e) => {
            Zotero.getMainWindow().ZoteroPane.viewAttachment([
              parentAttachment.id,
            ]);
            Zotero.Notifier.trigger("open", "file", parentAttachment.id);
          },
        },
      ]),
    );
  }

  if (addon.api.sync.isSyncNote(noteItem.id)) {
    settingsMenuData.splice(5, 0, {
      id: makeId("settings-refreshSyncing"),
      text: getString("editor-toolbar-settings-refreshSyncing"),
      callback: (e) => {
        addon.hooks.onSyncing([noteItem], {
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

  popup.style.removeProperty("left");
  popup.style.right = "0px";
}

async function registerEditorToolbarElement(
  editor: Zotero.EditorInstance,
  toolbar: HTMLDivElement,
  position: "start" | "middle" | "end",
  elem: HTMLElement,
  after: boolean = false,
) {
  await editor._initPromise;
  const target = toolbar.querySelector(`.${position}`);
  if (target) {
    if (after) {
      target.append(elem);
    } else {
      target.prepend(elem);
    }
  }
  return elem;
}

function makeId(key: string) {
  return `${config.addonRef}-${key}`;
}
