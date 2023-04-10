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

export function initEditorPopup(editor: Zotero.EditorInstance) {
  const ob = new (ztoolkit.getGlobal("MutationObserver"))((muts) => {
    for (const mut of muts) {
      ztoolkit.log(mut);
      if (
        (mut.addedNodes.length &&
          (mut.addedNodes[0] as HTMLElement).querySelector(".link-popup")) ||
        (mut.attributeName === "href" &&
          mut.target.parentElement?.classList.contains("link"))
      ) {
        updateEditorLinkPopup(editor);
      } else if (
        mut.addedNodes.length &&
        (mut.addedNodes[0] as HTMLElement).querySelector(".image-popup")
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
    }
  );
}

async function updateEditorLinkPopup(editor: Zotero.EditorInstance) {
  const _window = editor._iframeWindow;
  const link = getURLAtCursor(editor);
  const linkParams = getNoteLinkParams(link);
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
      listeners: [
        {
          type: "click",
          listener: async (e) => {
            if (!linkParams.ignore) {
              const templateText = await addon.api.template.runTemplate(
                "[QuickImportV2]",
                "link, noteItem",
                [link, editorNote]
              );
              // auto insert to anchor position
              updateURLAtCursor(
                editor,
                undefined,
                getNoteLink(
                  linkNote,
                  Object.assign({}, linkParams, { ignore: true })
                )!
              );
              insert(editor, templateText);
            } else {
              updateURLAtCursor(
                editor,
                undefined,
                getNoteLink(
                  linkNote,
                  Object.assign({}, linkParams, { ignore: null })
                )!
              );
              const lineIndex = getLineAtCursor(editor);
              del(
                editor,
                getPositionAtLine(editor, lineIndex),
                getPositionAtLine(editor, lineIndex + 1)
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
      listeners: [
        {
          type: "click",
          listener: async (e) => {
            updateURLAtCursor(
              editor,
              linkNote.getNoteTitle(),
              getURLAtCursor(editor)
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
      listeners: [
        {
          type: "click",
          listener: async (e) => {
            ZoteroPane.openNoteWindow(linkNote.id);
          },
        },
      ],
    });

    _window.document
      .querySelector(".link-popup")
      ?.append(insertButton, updateButton, openButton);
    // if (linkPopup) {
    //   if (Zotero.Prefs.get("Knowledge4Zotero.linkAction.preview") as boolean) {
    //     let previewContainer =
    //       _window.document.getElementById("note-link-preview");
    //     if (previewContainer) {
    //       previewContainer.remove();
    //     }
    //     previewContainer = ztoolkit.UI.createElement(
    //       _window.document,
    //       "div"
    //     ) as HTMLDivElement;
    //     previewContainer.id = "note-link-preview";
    //     previewContainer.className = "ProseMirror primary-editor";
    //     previewContainer.innerHTML =
    //       await this._Addon.NoteParse.parseNoteStyleHTML(linkNote);
    //     previewContainer.addEventListener("click", (e) => {
    //       this._Addon.WorkspaceWindow.setWorkspaceNote("preview", linkNote);
    //     });
    //     linkPopup.append(previewContainer);
    //     previewContainer.setAttribute(
    //       "style",
    //       `width: 98%;height: ${
    //         linkPopup ? Math.min(linkPopup.offsetTop, 300) : 300
    //       }px;position: absolute;background: white;bottom: 36px;overflow: hidden;box-shadow: 0 0 5px 5px rgba(0,0,0,0.2);border-radius: 5px;cursor: pointer;opacity: 0.9;`
    //     );
    //     previewContainer
    //       .querySelector("div[data-schema-version]")
    //       ?.childNodes.forEach((node) => {
    //         if ((node as Element).setAttribute) {
    //           (node as Element).setAttribute("style", "margin: 0");
    //         } else {
    //           node.remove();
    //         }
    //       });
    //   }
    // }
  } else {
    Array.from(_window.document.querySelectorAll(".link-popup-extra")).forEach(
      (elem) => elem.remove()
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
            title: getString("editor.previewImage.title"),
          },
          removeIfExists: true,
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
                addon.api.window.showImageViewer(
                  imageList.map((elem) => elem.src),
                  imageList.indexOf(
                    editor._iframeWindow.document
                      .querySelector(".primary-editor")
                      ?.querySelector(".selected")
                      ?.querySelector("img") as HTMLImageElement
                  ),
                  editor._item.getNoteTitle()
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
            title: getString("editor.resizeImage.title"),
          },
          removeIfExists: true,
          listeners: [
            {
              type: "click",
              listener: (e) => {
                const newWidth = parseFloat(
                  editor._iframeWindow.prompt(
                    getString("editor.resizeImage.prompt"),
                    // @ts-ignore
                    getEditorCore(editor).view.state.selection.node?.attrs
                      ?.width
                  ) || ""
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
    editor._iframeWindow.document.querySelector(".image-popup")!
  );
}
