import { ICONS } from "../../utils/config";
import {
  del,
  getEditorCore,
  getLineAtCursor,
  getPositionAtLine,
  getURLAtCursor,
  insert,
  updateImageDimensionsAtCursor,
  updateURLAtCursor,
} from "../../utils/editor";
import { getNoteLink, getNoteLinkParams } from "../../utils/link";
import { getString } from "../../utils/locale";
import { waitUtilAsync } from "../../utils/wait";
import { getWorkspaceUID } from "../../utils/workspace";

export function initEditorPopup(editor: Zotero.EditorInstance) {
  if (editor._disableUI) {
    return;
  }
  const ob = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    for (const mut of muts) {
      ztoolkit.log(mut);
      if (
        (mut.addedNodes.length &&
          mut.addedNodes[0]?.hasChildNodes() &&
          (mut.addedNodes[0] as HTMLElement)?.querySelector(".link-popup")) ||
        (mut.attributeName === "href" &&
          mut.target.parentElement?.classList.contains("link"))
      ) {
        updateEditorLinkPopup(editor);
      } else if (
        mut.addedNodes.length &&
        mut.addedNodes[0]?.hasChildNodes() &&
        (mut.addedNodes[0] as HTMLElement)?.querySelector(".image-popup")
      ) {
        updateEditorImagePopup(editor);
      }
    }
  });
  ob.observe(
    editor._iframeWindow.document.querySelector(".relative-container")!,
    {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href"],
    },
  );
}

async function updateEditorLinkPopup(editor: Zotero.EditorInstance) {
  const _window = editor._iframeWindow;
  const link = getURLAtCursor(editor);
  const linkParams = getNoteLinkParams(link);
  Object.assign(linkParams, {
    forceTakeover: true,
    workspaceUID: getWorkspaceUID(editor._popup)!,
  });
  const linkNote = linkParams.noteItem;
  const editorNote = editor._item;
  // If the note is invalid, we remove the buttons
  if (linkNote) {
    const insertButton = ztoolkit.UI.createElement(_window.document, "button", {
      id: "link-popup-insert",
      properties: {
        title: `Import Linked Note: ${linkNote.getNoteTitle()}`,
        innerHTML: ICONS["embedLinkContent"],
      },
      classList: ["link-popup-extra"],
      removeIfExists: true,
      // The popup is removed when link is not in selection. Do not need to record it.
      enableElementRecord: false,
      listeners: [
        {
          type: "click",
          listener: async (e) => {
            if (!linkParams.ignore) {
              const templateText = await addon.api.template.runTemplate(
                "[QuickImportV2]",
                "link, noteItem",
                [link, editorNote],
              );
              // auto insert to anchor position
              updateURLAtCursor(
                editor,
                undefined,
                getNoteLink(
                  linkNote,
                  Object.assign({}, linkParams, { ignore: true }),
                )!,
              );
              insert(editor, templateText);
            } else {
              updateURLAtCursor(
                editor,
                undefined,
                getNoteLink(
                  linkNote,
                  Object.assign({}, linkParams, { ignore: null }),
                )!,
              );
              const lineIndex = getLineAtCursor(editor);
              del(
                editor,
                getPositionAtLine(editor, lineIndex),
                getPositionAtLine(editor, lineIndex + 1),
              );
            }
          },
        },
      ],
    });

    const updateButton = ztoolkit.UI.createElement(_window.document, "button", {
      id: "link-popup-update",
      properties: {
        title: `Update Link Text: ${linkNote.getNoteTitle()}`,
        innerHTML: ICONS["updateLinkText"],
      },
      classList: ["link-popup-extra"],
      removeIfExists: true,
      enableElementRecord: false,
      listeners: [
        {
          type: "click",
          listener: async (e) => {
            updateURLAtCursor(
              editor,
              linkNote.getNoteTitle(),
              getURLAtCursor(editor),
            );
          },
        },
      ],
    });

    const openButton = ztoolkit.UI.createElement(_window.document, "button", {
      id: "link-popup-open",
      properties: {
        title: "Open in new window",
        innerHTML: ICONS["openInNewWindow"],
      },
      classList: ["link-popup-extra"],
      removeIfExists: true,
      enableElementRecord: false,
      listeners: [
        {
          type: "click",
          listener: async (e) => {
            addon.hooks.onOpenNote(
              linkNote.id,
              (e as MouseEvent).shiftKey ? "window" : "preview",
              linkParams,
            );
          },
        },
      ],
    });

    const linkPopup = _window.document.querySelector(".link-popup");
    if (!linkPopup) {
      return;
    }
    // Ensure the builtin buttons are appended
    await waitUtilAsync(() => linkPopup.querySelectorAll("button").length >= 2);
    linkPopup?.append(insertButton, updateButton, openButton);
  } else {
    Array.from(_window.document.querySelectorAll(".link-popup-extra")).forEach(
      (elem) => (elem as HTMLElement)?.remove(),
    );
  }
}

function updateEditorImagePopup(editor: Zotero.EditorInstance) {
  ztoolkit.UI.appendElement(
    {
      tag: "fragment",
      children: [
        {
          tag: "button",
          id: "image-popup-preview",
          properties: {
            innerHTML: ICONS.previewImage,
            title: getString("editor-previewImage-title"),
          },
          removeIfExists: true,
          enableElementRecord: false,
          listeners: [
            {
              type: "click",
              listener: (e) => {
                const imgs = editor._iframeWindow.document
                  .querySelector(".primary-editor")
                  ?.querySelectorAll("img");
                if (!imgs) {
                  return;
                }
                const imageList = Array.from(imgs);
                addon.hooks.onShowImageViewer(
                  imageList.map((elem) => (elem as HTMLImageElement)?.src),
                  imageList.indexOf(
                    editor._iframeWindow.document
                      .querySelector(".primary-editor")
                      ?.querySelector(".selected")
                      ?.querySelector("img") as HTMLImageElement,
                  ),
                  editor._item.getNoteTitle(),
                );
              },
            },
          ],
        },
        {
          tag: "button",
          id: "image-popup-resize",
          properties: {
            innerHTML: ICONS.resizeImage,
            title: getString("editor-resizeImage-title"),
          },
          removeIfExists: true,
          listeners: [
            {
              type: "click",
              listener: (e) => {
                const newWidth = parseFloat(
                  editor._iframeWindow.prompt(
                    getString("editor-resizeImage-prompt"),
                    // @ts-ignore
                    getEditorCore(editor).view.state.selection.node?.attrs
                      ?.width,
                  ) || "",
                );
                if (newWidth && newWidth > 10) {
                  updateImageDimensionsAtCursor(editor, newWidth);
                }
              },
            },
          ],
        },
      ],
    },
    editor._iframeWindow.document.querySelector(".image-popup")!,
  );
}
