import { getFileContent } from "../../utils/str";

export async function injectEditorScripts(win: Window) {
  ztoolkit.UI.appendElement(
    {
      tag: "script",
      id: "betternotes-script",
      properties: {
        innerHTML: await getFileContent(
          rootURI + "chrome/content/scripts/editorScript.js",
        ),
      },
      ignoreIfExists: true,
    },
    win.document.head,
  );
}

export async function injectEditorCSS(win: Window) {
  ztoolkit.UI.appendElement(
    {
      tag: "style",
      id: "betternotes-style",
      properties: {
        innerHTML: await getFileContent(rootURI + "chrome/content/styles/editor.css"),
      },
      ignoreIfExists: true,
    },
    win.document.head,
  );
}
