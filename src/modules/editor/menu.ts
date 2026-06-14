import { config } from "../../../package.json";
import {
  copyNoteLink,
  getEditorCore,
  getLineAtCursor,
  getSectionAtCursor,
  isImageAtCursor,
  updateImageDimensionsAtCursor,
} from "../../utils/editor";
import { getString } from "../../utils/locale";

interface MenuElementOptions {
  tag: "menuitem" | "menu" | "menuseparator";
  id?: string;
  label?: string;
  /** data url (chrome://xxx.png) or base64 url (data:image/png;base64,xxx) */
  icon?: string;
  commandListener?: (ev: Event) => void;
  children?: MenuElementOptions[];
}

function createMenuElement(doc: Document, options: MenuElementOptions) {
  const classList = [config.addonRef];
  const styles: Partial<CSSStyleDeclaration> = {};
  if (options.icon) {
    // The iconic classes are not used on macOS (handled by the native theme).
    if (!Zotero.isMac) {
      classList.push(
        options.tag === "menu" ? "menu-iconic" : "menuitem-iconic",
      );
    }
    styles.listStyleImage = `url(${options.icon})`;
  }

  const elem = ztoolkit.UI.createElement(doc, options.tag, {
    namespace: "xul",
    id: options.id,
    classList,
    styles,
    attributes: {
      label: options.label || "",
    },
    listeners: options.commandListener
      ? [{ type: "command", listener: options.commandListener }]
      : [],
  });

  if (options.tag === "menu" && options.children?.length) {
    const popup = ztoolkit.UI.createElement(doc, "menupopup", {
      namespace: "xul",
    });
    options.children.forEach((child) => {
      popup.append(createMenuElement(doc, child));
    });
    elem.append(popup);
  }

  return elem;
}

export function initEditorMenu(editor: Zotero.EditorInstance) {
  const makeId = (key: string) =>
    `${config.addonRef}-editor-menu-${editor.instanceID}-${key}`;

  if (editor._popup.dataset.bnMenuInitialized === "true") {
    return;
  }
  editor._popup.dataset.bnMenuInitialized = "true";
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

      const doc = editor._popup.ownerDocument;
      const icon = `chrome://${config.addonRef}/content/icons/favicon.png`;

      if (isImageAtCursor(editor)) {
        editor._popup.append(
          createMenuElement(doc, {
            tag: "menuitem",
            id: makeId("resizeImage"),
            label: getString("menuEditor-resizeImage"),
            icon,
            commandListener: () => {
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
          }),
        );
      }

      const currentLine = getLineAtCursor(editor);
      const currentSection = (await getSectionAtCursor(editor)) || "";

      editor._popup.append(
        createMenuElement(doc, {
          tag: "menu",
          id: makeId("copyMenus"),
          label: getString("menuEditor-copy"),
          icon,
          children: [
            {
              tag: "menuitem",
              id: makeId("copyLine"),
              label: getString("menuEditor-copyLine", {
                args: {
                  line: currentLine,
                },
              }),
              commandListener: () => {
                copyNoteLink(editor, "line");
              },
            },
            {
              tag: "menuitem",
              id: makeId("copySection"),
              label: getString("menuEditor-copySection", {
                args: {
                  section: currentSection,
                },
              }),
              commandListener: () => {
                copyNoteLink(editor, "section");
              },
            },
          ],
        }),
      );
    },
  );
}
