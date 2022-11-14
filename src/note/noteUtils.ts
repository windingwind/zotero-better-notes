/*
 * This file realizes note tools.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class NoteUtils extends AddonBase {
  public currentLine: any;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.currentLine = [];
  }

  public getLinesInNote(note: Zotero.Item): string[] {
    if (!note) {
      return [];
    }
    let noteText: string = note.getNote();
    return this._Addon.NoteParse.parseHTMLLines(noteText);
  }

  public async setLinesToNote(note: Zotero.Item, noteLines: string[]) {
    if (!note) {
      return [];
    }
    let noteText: string = note.getNote();
    let containerIndex = noteText.search(/data-schema-version="8">/g);
    if (containerIndex === -1) {
      note.setNote(
        `<div data-schema-version="8">${noteLines.join("\n")}</div>`
      );
    } else {
      let noteHead = noteText.substring(0, containerIndex);
      note.setNote(
        `${noteHead}data-schema-version="8">${noteLines.join("\n")}</div>`
      );
    }

    await note.saveTx();
  }

  public async addLineToNote(
    note: Zotero.Item,
    text: string,
    lineIndex: number,
    forceMetadata: boolean = false,
    position: "before" | "after" = "after"
  ) {
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    if (lineIndex < 0) {
      lineIndex = this.currentLine[note.id];
      lineIndex = lineIndex && lineIndex >= 0 ? lineIndex : noteLines.length;
    } else if (lineIndex >= noteLines.length) {
      lineIndex = noteLines.length;
    }
    Zotero.debug(
      `insert to ${lineIndex}, it used to be ${noteLines[lineIndex]}`
    );
    Zotero.debug(text);

    const editorInstance = this._Addon.WorkspaceWindow.getEditorInstance(note);
    if (editorInstance && !forceMetadata) {
      // The note is opened. Add line via note editor
      console.log("Add note line via note editor");
      const _document = editorInstance._iframeWindow.document;
      const currentElement = this._Addon.NoteParse.parseHTMLLineElement(
        this._Addon.EditorViews.getEditorElement(_document) as HTMLElement,
        lineIndex
      );
      const frag = _document.createDocumentFragment();
      const temp = _document.createElement("div");
      temp.innerHTML = text;
      while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
      }
      position === "after"
        ? currentElement.after(frag)
        : currentElement.before(frag);
      this._Addon.EditorViews.scrollToPosition(
        editorInstance,
        currentElement.offsetTop
      );
    } else {
      // The note editor does not exits yet. Fall back to modify the metadata
      console.log("Add note line via note metadata");

      // insert after/before current line
      if (position === "after") {
        lineIndex += 1;
      }
      noteLines.splice(lineIndex, 0, text);
      await this.setLinesToNote(note, noteLines);
      if (this._Addon.WorkspaceWindow.getWorkspaceNote().id === note.id) {
        await this.scrollWithRefresh(lineIndex);
      }
    }
  }

  private _dataURLtoBlob(dataurl: string) {
    let parts = dataurl.split(",");
    let matches = parts[0]?.match(/:(.*?);/);
    if (!matches || !matches[1]) {
      return;
    }
    let mime = matches[1];
    if (parts[0].indexOf("base64") !== -1) {
      let bstr = atob(parts[1]);
      let n = bstr.length;
      let u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new (Zotero.getMainWindow().Blob)([u8arr], { type: mime });
    }
    return null;
  }

  private async _importImage(note: Zotero.Item, src, download = false) {
    let blob;
    if (src.startsWith("data:")) {
      blob = this._dataURLtoBlob(src);
    } else if (download) {
      let res;

      try {
        res = await Zotero.HTTP.request("GET", src, { responseType: "blob" });
      } catch (e) {
        return;
      }
      blob = res.response;
    } else {
      return;
    }

    let attachment = await Zotero.Attachments.importEmbeddedImage({
      blob,
      parentItemID: note.id,
      saveOptions: {},
    });

    return attachment.key;
  }

  public async importImagesToNote(note: Zotero.Item, annotations: any) {
    for (let annotation of annotations) {
      if (annotation.image) {
        annotation.imageAttachmentKey = await this._importImage(
          note,
          annotation.image
        );
      }
      delete annotation.image;
    }
  }

  public async addAnnotationsToNote(
    note: Zotero.Item,
    annotations: Zotero.Item[],
    lineIndex: number
  ) {
    if (!note) {
      return;
    }
    const html = await this._Addon.NoteParse.parseAnnotationHTML(
      note,
      annotations
    );
    await this.addLineToNote(note, html, lineIndex);
    return html;
  }

  public async addLinkToNote(
    targetNote: Zotero.Item,
    linkedNote: Zotero.Item,
    lineIndex: number,
    sectionName: string
  ) {
    if (!targetNote) {
      return;
    }
    if (!linkedNote.isNote()) {
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        "Not a note item"
      );
      return;
    }
    const link = this.getNoteLink(linkedNote);
    const linkText = linkedNote.getNoteTitle().trim();

    const linkTemplate =
      await this._Addon.TemplateController.renderTemplateAsync(
        "[QuickInsert]",
        "link, subNoteItem, noteItem, sectionName, lineIndex",
        [link, linkedNote, targetNote, sectionName, lineIndex]
      );

    this.addLineToNote(targetNote, linkTemplate, lineIndex);

    const backLinkTemplate =
      await this._Addon.TemplateController.renderTemplateAsync(
        "[QuickBackLink]",
        "subNoteItem, noteItem, sectionName, lineIndex",
        [linkedNote, targetNote, sectionName, lineIndex],
        false
      );

    if (backLinkTemplate) {
      this.addLineToNote(linkedNote, backLinkTemplate, -1);
    }

    this._Addon.ZoteroViews.showProgressWindow(
      "Better Notes",
      `Link is added to workspace${lineIndex >= 0 ? ` line ${lineIndex}` : ""}`
    );
  }

  public getNoteLink(
    note: Zotero.Item,
    options: {
      ignore?: boolean;
      withLine?: boolean;
    } = { ignore: false, withLine: false }
  ) {
    let libraryID = note.libraryID;
    let library = Zotero.Libraries.get(libraryID);
    let groupID: string;
    if (library.libraryType === "user") {
      groupID = "u";
    } else if (library.libraryType === "group") {
      groupID = `${library.id}`;
    } else {
      return "";
    }
    let noteKey = note.key;
    let link = `zotero://note/${groupID}/${noteKey}/`;
    const addParam = (link: string, param: string): string => {
      const lastChar = link[link.length - 1];
      if (lastChar === "/") {
        link += "?";
      } else if (lastChar !== "?" && lastChar !== "&") {
        link += "&";
      }
      return `${link}${param}`;
    };
    if (options.ignore || options.withLine) {
      if (options.ignore) {
        link = addParam(link, "ignore=1");
      }
      if (options.withLine) {
        if (!this.currentLine[note.id]) {
          this.currentLine[note.id] = 0;
        }
        link = addParam(link, `line=${this.currentLine[note.id]}`);
      }
    }
    return link;
  }

  public getAnnotationLink(annotation: Zotero.Item) {
    let position = JSON.parse(annotation.annotationPosition);
    let openURI: string;

    const attachment = annotation.parentItem;
    let libraryID = attachment.libraryID;
    let library = Zotero.Libraries.get(libraryID);
    if (library.libraryType === "user") {
      openURI = `zotero://open-pdf/library/items/${attachment.key}`;
    } else if (library.libraryType === "group") {
      openURI = `zotero://open-pdf/groups/${library.id}/items/${attachment.key}`;
    } else {
      openURI = "";
    }

    openURI +=
      "?page=" +
      (position.pageIndex + 1) +
      (annotation.key ? "&annotation=" + annotation.key : "");

    return openURI;
  }

  async modifyLineInNote(
    note: Zotero.Item,
    text: string | Function,
    lineIndex: number,
    forceMetadata: boolean = false
  ) {
    if (!note) {
      return;
    }
    let noteLines = this.getLinesInNote(note);
    if (lineIndex < 0 || lineIndex >= noteLines.length) {
      return;
    }
    if (typeof text === "string") {
      noteLines[lineIndex] = text;
    } else if (typeof text === "function") {
      noteLines[lineIndex] = text(noteLines[lineIndex]);
    }
    const editorInstance = this._Addon.WorkspaceWindow.getEditorInstance(note);
    if (editorInstance && !forceMetadata) {
      // The note is opened. Add line via note editor
      console.log("Modify note line via note editor");
      const _document = editorInstance._iframeWindow.document;
      const currentElement: HTMLElement =
        this._Addon.NoteParse.parseHTMLLineElement(
          this._Addon.EditorViews.getEditorElement(_document) as HTMLElement,
          lineIndex
        );
      const frag = _document.createDocumentFragment();
      const temp = _document.createElement("div");
      temp.innerHTML = noteLines[lineIndex];
      while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
      }
      currentElement.replaceWith(frag);
      this._Addon.EditorViews.scrollToPosition(
        editorInstance,
        currentElement.offsetTop
      );
    } else {
      await this.setLinesToNote(note, noteLines);
      await this.scrollWithRefresh(lineIndex);
    }
  }

  async changeHeadingLineInNote(
    note: Zotero.Item,
    rankChange: number,
    lineIndex: number
  ) {
    if (!note) {
      return;
    }
    const noteLines = this.getLinesInNote(note);
    if (lineIndex < 0 || lineIndex >= noteLines.length) {
      return;
    }
    const headerStartReg = new RegExp("<h[1-6]>");
    const headerStopReg = new RegExp("</h[1-6]>");
    let headerStart = noteLines[lineIndex].search(headerStartReg);
    if (headerStart === -1) {
      return;
    }
    let lineRank = parseInt(noteLines[lineIndex][headerStart + 2]) + rankChange;
    if (lineRank > 6) {
      lineRank = 6;
    } else if (lineRank < 1) {
      lineRank = 1;
    }
    this.modifyLineInNote(
      note,
      noteLines[lineIndex]
        .replace(headerStartReg, `<h${lineRank}>`)
        .replace(headerStopReg, `</h${lineRank}>`),
      lineIndex
    );
  }

  async moveHeaderLineInNote(
    note: Zotero.Item,
    currentNode: TreeModel.Node<object>,
    targetNode: TreeModel.Node<object>,
    as: "child" | "before" | "after"
  ) {
    if (!note || targetNode.getPath().indexOf(currentNode) >= 0) {
      return;
    }

    let targetIndex = 0;
    let targetRank = 1;

    let lines = this.getLinesInNote(note);

    if (as === "child") {
      targetIndex = targetNode.model.endIndex;
      targetRank = targetNode.model.rank === 6 ? 6 : targetNode.model.rank + 1;
    } else if (as === "before") {
      targetIndex = targetNode.model.lineIndex - 1;
      targetRank =
        targetNode.model.rank === 7
          ? targetNode.parent.model.rank === 6
            ? 6
            : targetNode.parent.model.rank + 1
          : targetNode.model.rank;
    } else if (as === "after") {
      targetIndex = targetNode.model.endIndex;
      targetRank =
        targetNode.model.rank === 7
          ? targetNode.parent.model.rank === 6
            ? 6
            : targetNode.parent.model.rank + 1
          : targetNode.model.rank;
    }

    let rankChange = targetRank - currentNode.model.rank;

    let movedLines = lines.splice(
      currentNode.model.lineIndex,
      currentNode.model.endIndex - currentNode.model.lineIndex + 1
    );

    let headerReg = /<\/?h[1-6]/g;
    for (const i in movedLines) {
      movedLines[i] = movedLines[i].replace(headerReg, (e) => {
        let rank = parseInt(e.slice(-1));
        rank += rankChange;
        if (rank > 6) {
          rank = 6;
        }
        if (rank < 1) {
          rank = 1;
        }
        return `${e.slice(0, -1)}${rank}`;
      });
    }

    // If the moved lines is before the insert index
    // the slice index -= lines length.
    if (currentNode.model.endIndex <= targetIndex) {
      targetIndex -= movedLines.length;
    }
    Zotero.debug(`move to ${targetIndex}`);

    let newLines = lines
      .slice(0, targetIndex + 1)
      .concat(movedLines, lines.slice(targetIndex + 1));
    console.log("new lines", newLines);
    console.log("moved", movedLines);
    console.log("insert after", lines[targetIndex]);
    console.log("next line", lines[targetIndex + 1]);
    await this.setLinesToNote(note, newLines);
  }

  getNoteTree(note: Zotero.Item): TreeModel.Node<object> {
    // See http://jnuno.com/tree-model-js
    if (!note) {
      return undefined;
    }
    return this._Addon.NoteParse.parseNoteTree(note);
  }

  getNoteTreeAsList(
    note: Zotero.Item,
    filterRoot: boolean = true,
    filterLink: boolean = true
  ): TreeModel.Node<object>[] {
    if (!note) {
      return;
    }
    return this.getNoteTree(note).all(
      (node) =>
        (!filterRoot || node.model.lineIndex >= 0) &&
        (!filterLink || node.model.rank <= 6)
    );
  }

  getNoteTreeNodeById(
    note: Zotero.Item,
    id: number,
    root: TreeModel.Node<object> = undefined
  ) {
    root = root || this.getNoteTree(note);
    return root.first(function (node) {
      return node.model.id === id;
    });
  }

  getNoteTreeNodesByRank(
    note: Zotero.Item,
    rank: number,
    root: TreeModel.Node<object> = undefined
  ) {
    root = root || this.getNoteTree(note);
    return root.all(function (node) {
      return node.model.rank === rank;
    });
  }

  getLineParentNode(
    note: Zotero.Item,
    lineIndex: number = -1
  ): TreeModel.Node<object> {
    if (lineIndex < 0) {
      lineIndex = this.currentLine[note.id];
      lineIndex =
        lineIndex && lineIndex >= 0
          ? lineIndex
          : this.getLinesInNote(note).length;
    }
    let nodes = this.getNoteTreeAsList(note);
    if (!nodes.length || nodes[0].model.lineIndex > lineIndex) {
      // There is no parent node
      return undefined;
    } else if (nodes[nodes.length - 1].model.lineIndex <= lineIndex) {
      return nodes[nodes.length - 1];
    } else {
      for (let i = 0; i < nodes.length - 1; i++) {
        if (
          nodes[i].model.lineIndex <= lineIndex &&
          nodes[i + 1].model.lineIndex > lineIndex
        ) {
          return nodes[i];
        }
      }
    }
  }

  async moveNode(fromID: number, toID: number, moveType: "before" | "child") {
    const workspaceNote = this._Addon.WorkspaceWindow.getWorkspaceNote();
    let tree = this.getNoteTree(workspaceNote);
    let fromNode = this.getNoteTreeNodeById(workspaceNote, fromID, tree);
    let toNode = this._Addon.NoteUtils.getNoteTreeNodeById(
      workspaceNote,
      toID,
      tree
    );
    Zotero.debug(fromNode.model);
    Zotero.debug(toNode.model);
    Zotero.debug(moveType);
    console.log(toNode.model, fromNode.model, moveType);
    this.moveHeaderLineInNote(
      this._Addon.WorkspaceWindow.getWorkspaceNote(),
      fromNode,
      toNode,
      moveType
    );
  }

  async scrollWithRefresh(lineIndex: number) {
    await Zotero.Promise.delay(500);
    let editorInstance =
      await this._Addon.WorkspaceWindow.getWorkspaceEditorInstance();
    if (!editorInstance) {
      return;
    }
    this._Addon.EditorViews.scrollToLine(editorInstance, lineIndex);
  }

  async convertNoteLines(
    currentNote: Zotero.Item,
    rootNoteIds: number[],
    convertNoteLinks: boolean = true
  ): Promise<{ lines: string[]; subNotes: Zotero.Item[] }> {
    Zotero.debug(`convert note ${currentNote.id}`);

    let subNotes: Zotero.Item[] = [];
    const [..._rootNoteIds] = rootNoteIds;
    _rootNoteIds.push(currentNote.id);

    let newLines: string[] = [];
    const noteLines = this.getLinesInNote(currentNote);
    for (let i in noteLines) {
      newLines.push(noteLines[i]);
      // Convert Link
      if (convertNoteLinks) {
        let link = this._Addon.NoteParse.parseLinkInText(noteLines[i]);
        while (link) {
          const linkIndex = noteLines[i].indexOf(link);
          const params = this._Addon.NoteParse.parseParamsFromLink(link);
          if (
            params.ignore ||
            // Ignore links that are not in <a>
            !noteLines[i].slice(linkIndex - 8, linkIndex).includes("href")
          ) {
            Zotero.debug("ignore link");
            noteLines[i] = noteLines[i].substring(
              noteLines[i].search(/zotero:\/\/note\//g)
            );
            noteLines[i] = noteLines[i].substring(
              noteLines[i].search(/<\/a>/g) + "</a>".length
            );
            link = this._Addon.NoteParse.parseLinkInText(noteLines[i]);
            continue;
          }
          Zotero.debug("convert link");
          let res = await this.getNoteFromLink(link);
          const subNote = res.item;
          if (subNote && _rootNoteIds.indexOf(subNote.id) === -1) {
            Zotero.debug(`Knowledge4Zotero: Exporting sub-note ${link}`);
            const convertResult = await this.convertNoteLines(
              subNote,
              _rootNoteIds,
              convertNoteLinks
            );
            const subNoteLines = convertResult.lines;

            const templateText =
              await this._Addon.TemplateController.renderTemplateAsync(
                "[QuickImport]",
                "subNoteLines, subNoteItem, noteItem",
                [subNoteLines, subNote, currentNote]
              );
            newLines.push(templateText);
            subNotes.push(subNote);
            subNotes = subNotes.concat(convertResult.subNotes);
          }
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/zotero:\/\/note\//g)
          );
          noteLines[i] = noteLines[i].substring(
            noteLines[i].search(/<\/a>/g) + "</a>".length
          );
          link = this._Addon.NoteParse.parseLinkInText(noteLines[i]);
        }
      }
    }
    Zotero.debug(subNotes);
    return { lines: newLines, subNotes: subNotes };
  }

  async getNoteFromLink(uri: string) {
    const params = this._Addon.NoteParse.parseParamsFromLink(uri);
    if (!params.libraryID) {
      return {
        item: undefined,
        args: {},
        infoText: "Library does not exist or access denied.",
      };
    }
    Zotero.debug(params);
    let item: Zotero.Item = await Zotero.Items.getByLibraryAndKeyAsync(
      params.libraryID,
      params.noteKey
    );
    if (!item || !item.isNote()) {
      return {
        item: undefined,
        args: params,
        infoText: "Note does not exist or is not a note.",
      };
    }
    return {
      item: item,
      args: params,
      infoText: "OK",
    };
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
      let linkedNote = (await this.getNoteFromLink(link)).item;
      if (linkedNote) {
        let t = 0;
        let linkPopup = _window.document.querySelector(".link-popup");
        while (
          !(
            linkPopup &&
            (linkPopup.querySelector("a") as unknown as HTMLLinkElement)
              ?.href === link
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

export default NoteUtils;
