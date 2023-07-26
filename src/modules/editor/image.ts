import { getPref } from "../../utils/prefs";

export function initEditorImagePreviewer(editor: Zotero.EditorInstance) {
  const openPreview = (e: MouseEvent) => {
    const imgs = editor._iframeWindow.document
      .querySelector(".primary-editor")
      ?.querySelectorAll("img");
    if (!imgs) {
      return;
    }
    const imageList = Array.from(imgs);
    addon.hooks.onShowImageViewer(
      imageList.map((elem) => elem.src),
      imageList.indexOf(e.target as HTMLImageElement),
      editor._item.getNoteTitle(),
    );
  };
  editor._iframeWindow.document.addEventListener("dblclick", (e) => {
    if ((e.target as HTMLElement).tagName === "IMG") {
      openPreview(e);
    }
  });
  editor._iframeWindow.document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).tagName === "IMG" && e.ctrlKey) {
      openPreview(e);
    }
  });
}
