/*
 * This file realizes note tools.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class NoteController extends AddonBase {
  public currentLine: any;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.currentLine = [];
  }

  public async onSelectionChange(editor: Zotero.EditorInstance) {
    // Update current line index
    const _window = editor._iframeWindow;
    const selection = _window.document.getSelection();
    if (!selection || !selection.focusNode) {
      return;
    }
    const realElement = selection.focusNode.parentElement;
    let focusNode = selection.focusNode as XUL.Element;
    if (!focusNode || !realElement) {
      return;
    }

    function getChildIndex(node) {
      return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
    }

    // Make sure this is a direct child node of editor
    try {
      while (
        focusNode.parentElement &&
        (!focusNode.parentElement.className ||
          focusNode.parentElement.className.indexOf("primary-editor") === -1)
      ) {
        focusNode = focusNode.parentNode as XUL.Element;
      }
    } catch (e) {
      return;
    }

    if (!focusNode.parentElement) {
      return;
    }

    let currentLineIndex = getChildIndex(focusNode);

    // Parse list
    const diveTagNames = ["OL", "UL", "LI"];

    // Find list elements before current line
    const listElements = Array.prototype.filter.call(
      Array.prototype.slice.call(
        focusNode.parentElement.childNodes,
        0,
        currentLineIndex
      ),
      (e) => diveTagNames.includes(e.tagName)
    );

    for (const e of listElements) {
      currentLineIndex += this._Addon.NoteParse.parseListElements(e).length - 1;
    }

    // Find list index if current line is inside a list
    if (diveTagNames.includes(focusNode.tagName)) {
      const eleList = this._Addon.NoteParse.parseListElements(focusNode);
      for (const i in eleList) {
        if (realElement.parentElement === eleList[i]) {
          currentLineIndex += Number(i);
          break;
        }
      }
    }
    Zotero.debug(`Knowledge4Zotero: line ${currentLineIndex} selected.`);
    console.log(currentLineIndex);
    Zotero.debug(
      `Current Element: ${focusNode.outerHTML}; Real Element: ${realElement.outerHTML}`
    );
    this.currentLine[editor._item.id] = currentLineIndex;
    if (realElement.tagName === "A") {
      let link = (realElement as HTMLLinkElement).href;
      let linkedNote = (await this._Addon.NoteUtils.getNoteFromLink(link)).item;
      if (linkedNote) {
        let t = 0;
        let linkPopup = _window.document.querySelector(".link-popup");
        while (
          !(
            linkPopup &&
            (linkPopup.querySelector("a") as unknown as HTMLLinkElement)
              .href === link
          ) &&
          t < 100
        ) {
          t += 1;
          linkPopup = _window.document.querySelector(".link-popup");
          await Zotero.Promise.delay(30);
        }
        await this._Addon.EditorViews.updateEditorPopupButtons(editor, link);
      } else {
        await this._Addon.EditorViews.updateEditorPopupButtons(
          editor,
          undefined
        );
      }
    }
  }
}

export default NoteController;
