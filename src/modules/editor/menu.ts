import { config } from "../../../package.json";
import {
  copyNoteLink,
  getLineAtCursor,
  getSectionAtCursor,
  isImageAtCursor,
  updateImageDimensionsAtCursor,
} from "../../utils/editor";
import { getString } from "../../utils/locale";
import { getEditorCore } from "../../utils/editor";

export function initEditorMenu(editor: Zotero.EditorInstance) {
  const makeId = (key: string) =>
    `${config.addonRef}-editor-menu-${editor.instanceID}-${key}`;
  (editor._popup as XULMenuElement).addEventListener(
    "popupshowing",
    async (ev) => {
      if (ev.target !== editor._popup) {
        return;
      }
      (editor._popup as XULMenuElement)
        .querySelectorAll(`.${config.addonRef}`)
        .forEach((elem) => {
          elem.remove();
        });

      if (isImageAtCursor(editor)) {
        ztoolkit.Menu.register(editor._popup, {
          tag: "menuitem",
          id: makeId("resizeImage"),
          classList: [config.addonRef],
          label: getString("menuEditor-resizeImage"),
          icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
          commandListener: (ev) => {
            const newWidth = parseFloat(
              editor._iframeWindow.prompt(
                getString("editor-resizeImage-prompt"),
                // @ts-ignore
                getEditorCore(editor).view.state.selection.node?.attrs?.width,
              ) || "",
            );
            if (newWidth && newWidth > 10) {
              updateImageDimensionsAtCursor(editor, newWidth);
            }
          },
        });
      }

      const currentLine = getLineAtCursor(editor);
      const currentSection = (await getSectionAtCursor(editor)) || "";

      ztoolkit.Menu.register(editor._popup, {
        tag: "menu",
        id: makeId("copyMenus"),
        classList: [config.addonRef],
        label: getString("menuEditor-copy"),
        icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
        children: [
          {
            tag: "menuitem",
            id: makeId("copyLine"),
            classList: [config.addonRef],
            label: getString("menuEditor-copyLine", {
              args: {
                line: currentLine,
              },
            }),
            commandListener: (ev) => {
              copyNoteLink(editor, "line");
            },
          },
          {
            tag: "menuitem",
            id: makeId("copySection"),
            classList: [config.addonRef],
            label: getString("menuEditor-copySection", {
              args: {
                section: currentSection,
              },
            }),
            commandListener: (ev) => {
              copyNoteLink(editor, "section");
            },
          },
        ],
      });
    },
  );
}
