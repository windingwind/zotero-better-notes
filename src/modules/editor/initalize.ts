import { initEditorImagePreviewer } from "./image";
import { injectEditorCSS, injectEditorScripts } from "./inject";
import { initEditorLinkPreview } from "./linkPreview";
import { initEditorMenu } from "./menu";
import { initEditorPopup } from "./popup";
import { initEditorToolbar } from "./toolbar";

export function registerEditorInstanceHook() {
  Zotero.Notes.registerEditorInstance = new Proxy(
    Zotero.Notes.registerEditorInstance,
    {
      apply: (
        target,
        thisArg,
        argumentsList: [instance: Zotero.EditorInstance],
      ) => {
        target.apply(thisArg, argumentsList);
        argumentsList.forEach(onEditorInstanceCreated);
      },
    },
  );
  Zotero.Notes._editorInstances.forEach(onEditorInstanceCreated);
}

async function onEditorInstanceCreated(editor: Zotero.EditorInstance) {
  await editor._initPromise;
  if (!addon.data.alive) {
    return;
  }

  // item.getNote may not be initialized yet
  if (Zotero.ItemTypes.getID("note") !== editor._item.itemTypeID) {
    return;
  }
  await injectEditorScripts(editor._iframeWindow);
  injectEditorCSS(editor._iframeWindow);
  initEditorImagePreviewer(editor);
  await initEditorToolbar(editor);
  initEditorPopup(editor);
  initEditorMenu(editor);
  initEditorLinkPreview(editor);
}
