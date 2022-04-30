import { AddonBase, EditorMessage } from "./base";

class AddonViews extends AddonBase {
  progressWindowIcon: object;
  editorIcon: object;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: "chrome://Knowledge4Zotero/skin/favicon.png",
    };
    this.editorIcon = {
      addToKnowledge: `<svg t="1651124422933" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3269" width="24" height="24"><path d="M896.00324 352c70.7 0 128-57.3 128-128 0-70.6-57.4-128-128-128-70.7 0-128 57.3-128 128 0 18.8 4.1 36.7 11.3 52.8 2.7 6 1.4 13.1-3.3 17.8l-24.2 24.2c-5.7 5.7-14.9 6.3-21.2 1.2-38.1-30.1-86.3-48-138.6-48-18.8 0-37.1 2.3-54.6 6.7-6.9 1.7-14.1-1.4-17.7-7.5l-6.6-11.4c-3.4-5.8-2.7-13.1 1.6-18.3 18.6-22.6 29.7-51.6 29.3-83.2C543.10324 89 486.30324 32.6 417.00324 32c-70.6-0.6-128.1 56.1-129 126.3-0.9 69.5 56.5 128.6 126 129.6 9.4 0.1 18.5-0.7 27.4-2.5 6.8-1.4 13.6 1.7 17.1 7.7l2.2 3.8c4 7 2.2 15.9-4.2 20.7-42.4 32.3-73 79.4-84 133.6-1.5 7.4-8.1 12.7-15.7 12.7h-94.1c-6.6 0-12.6-4-14.9-10.2-18.1-48-64.3-82.2-118.5-82.8C58.70324 370.3 0.50324 427.6 0.00324 498.1-0.49676 569.2 57.00324 627 128.00324 627c56.7 0 104.8-36.9 121.6-87.9 2.2-6.6 8.3-11.1 15.2-11.1h92c7.6 0 14.2 5.4 15.7 12.9 9.5 46.7 33.5 88 67 119.2 5.4 5 6.6 13.2 2.9 19.6l-21.7 37.6c-3.7 6.3-11.1 9.4-18.2 7.4-11.1-3.1-22.7-4.7-34.8-4.7-69.7 0.1-127 56.8-127.8 126.6-0.8 71.7 57.4 130 129.1 129.4 69.5-0.6 126.3-57.3 126.9-126.8 0.3-28-8.5-53.9-23.5-75.1-3.6-5.1-3.9-11.8-0.8-17.2l24.9-43.1c3.9-6.7 12-9.7 19.3-7 23.7 8.6 49.3 13.2 76 13.2 34.9 0 67.9-8 97.3-22.2 7.6-3.7 16.7-0.9 20.9 6.4l37 64c-26.3 23.5-43 57.7-43 95.8 0 70.9 58 128.5 128.9 128 69.7-0.5 126.2-56.7 127.1-126.3 0.9-70.1-57-129.3-127.1-129.7-6.2 0-12.3 0.4-18.3 1.2-6.5 0.9-12.8-2.2-16.1-7.8l-39.2-67.9c-3.4-5.9-2.7-13.3 1.7-18.4 34.2-39.3 54.9-90.7 54.9-147 0-38.9-9.9-75.5-27.4-107.4-3.4-6.2-2.2-13.9 2.8-18.9l28.4-28.4c4.9-4.9 12.4-6 18.7-2.9 17.4 8.6 36.9 13.5 57.6 13.5z m0-192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM128.00324 563c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m240 349c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m464-112c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM416.00324 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m289.1 385.1C674.90324 639.4 634.70324 656 592.00324 656s-82.9-16.6-113.1-46.9C448.60324 578.9 432.00324 538.7 432.00324 496s16.6-82.9 46.9-113.1C509.10324 352.6 549.30324 336 592.00324 336s82.9 16.6 113.1 46.9C735.40324 413.1 752.00324 453.3 752.00324 496s-16.6 82.9-46.9 113.1z" p-id="3270"></path></svg>`,
      setMainKnowledge: `<svg t="1651124314636" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1689" width="24" height="24"><path d="M877.44 383.786667L624.426667 117.333333C594.986667 86.186667 554.88 69.12 512 69.12s-82.986667 17.066667-112.426667 48.213333L146.56 383.786667a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V485.973333c0-38.186667-14.506667-74.453333-40.96-102.186666z m-44.373333 404.266666c0 38.826667-31.573333 70.186667-70.186667 70.186667H261.333333c-38.826667 0-70.186667-31.573333-70.186666-70.186667V485.973333c0-16.213333 6.186667-31.786667 17.28-43.52L461.44 176c13.226667-13.866667 31.146667-21.546667 50.56-21.546667s37.333333 7.68 50.56 21.76l253.013333 266.453334c11.306667 11.733333 17.28 27.306667 17.28 43.52v301.866666z" p-id="1690"></path><path d="M608 687.786667h-192c-23.466667 0-42.666667 19.2-42.666667 42.666666s19.2 42.666667 42.666667 42.666667h192c23.466667 0 42.666667-19.2 42.666667-42.666667s-19.2-42.666667-42.666667-42.666666z" p-id="1691"></path></svg>`,
      isMainKnowledge: `<svg t="1651124352868" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1850" width="24" height="24"><path d="M877.44 388.053333L624.426667 121.813333C594.986667 90.666667 554.88 73.386667 512 73.386667s-82.986667 17.066667-112.426667 48.213333L146.56 388.053333a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V490.453333c0-38.4-14.506667-74.666667-40.96-102.4zM608 777.386667h-192c-23.466667 0-42.666667-19.2-42.666667-42.666667s19.2-42.666667 42.666667-42.666667h192c23.466667 0 42.666667 19.2 42.666667 42.666667s-19.2 42.666667-42.666667 42.666667z" p-id="1851"></path></svg>`,
      openWorkspace: `<svg t="1651317033804" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2432" width="128" height="128"><path d="M874.9 459.4c-18.8 0-34 15.2-34 34v355.7c0 18.6-15.5 33.7-34.5 33.7H181.5c-19 0-34.5-15.1-34.5-33.7V232.3c0-18.6 15.5-33.7 34.5-33.7H541c18.8 0 34-15.2 34-34s-15.2-34-34-34H181.5C125 130.6 79 176.2 79 232.3v616.8c0 56 46 101.7 102.5 101.7h624.9c56.5 0 102.5-45.6 102.5-101.7V493.4c0-18.8-15.2-34-34-34z" fill="#b6b6b6" p-id="2433"></path><path d="M885.5 82.7H657.1c-18.8 0-34 15.2-34 34s15.2 34 34 34h169.7L358.5 619.1c-13.3 13.3-13.3 34.8 0 48.1 6.6 6.6 15.3 10 24 10s17.4-3.3 24-10l470-470v169.7c0 18.8 15.2 34 34 34s34-15.2 34-34V141.5c0.1-32.4-26.4-58.8-59-58.8z" fill="#b6b6b6" p-id="2434"></path></svg>`,
    };
  }

  getEditor(_document: Document) {
    let editor = _document.getElementsByClassName("primary-editor")[0];
    return editor;
  }

  async addEditorButton(
    editorInstances: EditorInstance,
    id: string,
    icon: string,
    title: string,
    message: EditorMessage
  ) {
    // Use Zotero.Notes._editorInstances to find current opened note editor
    await editorInstances._initPromise;

    let _document = editorInstances._iframeWindow.document;
    let toolbar = _document.getElementsByClassName("middle")[0];
    let button = _document.createElement("button");
    button.setAttribute("class", "toolbar-button");
    button.setAttribute("id", id);
    button.setAttribute("title", title);
    button.innerHTML = this.editorIcon[icon];
    toolbar.append(button);
    button.onclick = (e: Event) => {
      message.content.event = e as XULEvent;
      message.content.editorInstance = editorInstances;
      this._Addon.events.onEditorEvent(message);
    };
  }

  changeEditorButton(button: Element, icon: string, title: string) {
    button.innerHTML = this.editorIcon[icon];
    button.setAttribute("title", title);
  }

  async scrollToLine(instance: EditorInstance, lineIndex: number) {
    await instance._initPromise;
    let editor = this.getEditor(instance._iframeWindow.document);
    if (lineIndex > editor.children.length) {
      lineIndex = editor.children.length - 1;
    }
    // @ts-ignore
    editor.parentNode.scrollTo(0, editor.children[lineIndex].offsetTop);
  }

  addOpenWorkspaceButton() {
    // Left collection tree view button
    const treeRow = document.createElement("html:div");
    treeRow.setAttribute("class", "row");
    treeRow.setAttribute(
      "style",
      "height: 22px; margin: 0 0 22px 0; padding: 0 6px 0 6px;"
    );
    const span1 = document.createElement("span");
    span1.setAttribute("class", "cell label primary");
    const span2 = document.createElement("span");
    span2.setAttribute("class", "icon icon-twisty twisty");
    span2.innerHTML = this.editorIcon["openWorkspace"];
    const span3 = document.createElement("span");
    span3.setAttribute("class", "icon icon-bg cell-icon open");
    span3.setAttribute(
      "style",
      "background-image:url(chrome://Knowledge4Zotero/skin/favicon.png)"
    );
    const span4 = document.createElement("span");
    span4.setAttribute("class", "cell-text");
    span4.setAttribute("style", "margin-left: 6px;");
    span4.innerHTML = "Knowledge";
    span1.append(span2, span3, span4);
    treeRow.append(span1);
    treeRow.addEventListener("click", (e) => {
      this._Addon.knowledge.openWorkspaceWindow();
    });
    treeRow.addEventListener("mouseover", (e: XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 22px 0; padding: 0 6px 0 6px; background-color: grey;"
      );
    });
    treeRow.addEventListener("mouseleave", (e: XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 22px 0; padding: 0 6px 0 6px;"
      );
    });
    document
      .getElementById("zotero-collections-tree-container")
      .children[0].before(treeRow);
  }

  showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000
  ) {
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default AddonViews;
