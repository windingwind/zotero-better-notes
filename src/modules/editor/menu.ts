import { config } from "../../../package.json";
import {
  isImageAtCursor,
  updateImageDimensionsAtCursor,
} from "../../utils/editor";
import { getString } from "../../utils/locale";
import { getEditorCore } from "../../utils/editor";

export function initEditorMenu(editor: Zotero.EditorInstance) {
  const makeId = (key: string) =>
    `${config.addonRef}-editor-menu-${editor.instanceID}-${key}`;
  // Prevent duplicate menu items
  if (editor._popup.getAttribute("bn-init") === addon.data.uid) {
    return;
  }
  editor._popup.setAttribute("bn-init", addon.data.uid);
  (editor._popup as XULMenuElement).addEventListener("popupshowing", (ev) => {
    const menuitemID = makeId("resizeImage");
    if (
      !(editor._popup as XULMenuElement).querySelector(`#${menuitemID}`) &&
      isImageAtCursor(editor)
    ) {
      ztoolkit.Menu.register(editor._popup, {
        tag: "menuitem",
        id: menuitemID,
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
  });
}
