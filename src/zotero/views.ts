/*
 * This file contains the Zotero UI code.
 */

import Knowledge4Zotero from "../addon";
import { EditorMessage } from "../utils";
import AddonBase from "../module";

class ZoteroViews extends AddonBase {
  progressWindowIcon: object;
  icons: object;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: "chrome://Knowledge4Zotero/skin/favicon.png",
    };
    this.icons = {
      tabIcon: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="icon icon-bg"><path d="M791.30324 369.7c-5 5-6.2 12.7-2.8 18.9 17.5 31.9 27.4 68.5 27.4 107.4 0 56.2-20.7 107.6-54.9 147-4.5 5.1-5.1 12.6-1.8 18.4l39.2 67.9c3.3 5.7 9.6 8.7 16.1 7.8 6-0.8 12.1-1.2 18.3-1.2 70.1 0.5 128 59.7 127.1 129.7-0.9 69.7-57.4 125.9-127.1 126.4-70.9 0.5-128.9-57.1-128.9-128 0-38.1 16.7-72.3 43.1-95.8l-37-64c-4.2-7.3-13.3-10-20.9-6.4-29.3 14.2-62.3 22.2-97.2 22.2-26.7 0-52.3-4.7-76-13.2-7.3-2.6-15.4 0.3-19.3 7l-24.9 43.1c-3.1 5.4-2.8 12.1 0.8 17.2 15 21.2 23.7 47.1 23.5 75.1-0.7 69.5-57.5 126.2-127 126.8-71.6 0.6-129.8-57.7-129.1-129.4 0.8-69.7 58-126.5 127.8-126.6 12 0 23.7 1.6 34.8 4.7 7 2 14.5-1.1 18.2-7.4l21.7-37.6c3.7-6.4 2.5-14.6-2.9-19.6-33.6-31.2-57.5-72.6-67-119.2-1.5-7.5-8-12.9-15.7-12.9h-92c-6.9 0-13.1 4.5-15.2 11.1C232.80324 590.2 184.70324 627 128.00324 627 57.00324 627-0.49676 569.2 0.00324 498.1 0.40324 427.5 58.60324 370.3 129.20324 371c54.2 0.5 100.4 34.8 118.5 82.8C250.00324 460 256.00324 464 262.60324 464h94.1c7.6 0 14.2-5.3 15.7-12.7 11-54.2 41.5-101.3 84-133.6 6.4-4.9 8.2-13.8 4.2-20.8l-2.2-3.8c-3.5-6-10.3-9-17.1-7.7-8.8 1.8-18 2.7-27.4 2.5-69.5-1-126.9-60.1-126-129.6 0.9-70.3 58.4-126.9 129-126.3 69.3 0.6 126 57 127 126.2 0.4 31.6-10.6 60.7-29.3 83.2-4.3 5.2-5 12.5-1.6 18.3l6.6 11.4c3.6 6.2 10.8 9.3 17.7 7.5 17.5-4.4 35.8-6.7 54.6-6.7 52.3 0 100.4 17.9 138.6 48 6.4 5 15.5 4.5 21.2-1.2l24.2-24.2c4.7-4.7 6-11.8 3.3-17.8-7.3-16.1-11.3-34-11.3-52.8 0-70.7 57.3-128 128-128 70.6 0 128 57.4 128 128 0 70.7-57.3 128-128 128-20.7 0-40.2-4.9-57.5-13.6-6.2-3.1-13.7-2-18.7 2.9l-28.4 28.5z" fill="#f2ac46"/></svg>`,
      openWorkspaceCollectionView: `<svg t="1651317033804" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2432" width="100%" height="100%"><path d="M874.9 459.4c-18.8 0-34 15.2-34 34v355.7c0 18.6-15.5 33.7-34.5 33.7H181.5c-19 0-34.5-15.1-34.5-33.7V232.3c0-18.6 15.5-33.7 34.5-33.7H541c18.8 0 34-15.2 34-34s-15.2-34-34-34H181.5C125 130.6 79 176.2 79 232.3v616.8c0 56 46 101.7 102.5 101.7h624.9c56.5 0 102.5-45.6 102.5-101.7V493.4c0-18.8-15.2-34-34-34z" fill="currentColor" p-id="2433"></path><path d="M885.5 82.7H657.1c-18.8 0-34 15.2-34 34s15.2 34 34 34h169.7L358.5 619.1c-13.3 13.3-13.3 34.8 0 48.1 6.6 6.6 15.3 10 24 10s17.4-3.3 24-10l470-470v169.7c0 18.8 15.2 34 34 34s34-15.2 34-34V141.5c0.1-32.4-26.4-58.8-59-58.8z" fill="currentColor" p-id="2434"></path></svg>`,
    };
  }

  public hideMenuBar(_document: Document) {
    _document.getElementById("better-notes-menu").hidden = true;
  }

  public keppDefaultMenuOrder() {
    const fileMenu = document.querySelector("#menu_FilePopup");
    const editMenu = document.querySelector("#menu_EditPopup");
    const exit = fileMenu.querySelector("#menu_FileQuitItem");
    // exit.remove();
    const prefs = editMenu.querySelector("#menu_preferences");
    // prefs.remove();
    if (exit) {
      for (const ele of fileMenu.querySelectorAll(".menu-betternotes")) {
        exit.before(ele);
      }
    }
    if (prefs) {
      for (const ele of editMenu.querySelectorAll(".menu-betternotes")) {
        prefs.before(ele);
      }
    }
  }

  public switchRealMenuBar(hidden: boolean) {
    // We only handle hide. The show will be handled by the ZoteroStandalone.switchMenuType
    document
      .querySelectorAll(".menu-type-betternotes")
      .forEach((el) => ((el as HTMLElement).hidden = hidden));

    // Disable Zotero pdf export
    (document.getElementById("menu_export_files") as XUL.Element).disabled =
      !hidden;
  }

  public switchKey(disabled: boolean) {
    document
      .querySelectorAll(".key-type-betternotes")
      .forEach((el) => (el as XUL.Element).setAttribute("disabled", disabled));
  }

  public addNewMainNoteButton() {
    // Top toolbar button
    let addNoteItem = document
      .getElementById("zotero-tb-note-add")
      .getElementsByTagName("menuitem")[1];
    let button = document.createElement("menuitem");
    button.setAttribute("id", "zotero-tb-knowledge-openwindow");
    button.setAttribute("label", "New Main Note");
    button.addEventListener("click", (e) => {
      this._Addon.ZoteroEvents.onEditorEvent(
        new EditorMessage("createWorkspace", {})
      );
    });
    button.setAttribute("class", "menuitem-iconic");
    button.setAttribute(
      "style",
      "list-style-image: url('chrome://Knowledge4Zotero/skin/favicon.png');"
    );
    addNoteItem.after(button);
  }

  public addOpenWorkspaceButton() {
    // Left collection tree view button
    const treeRow = document.createElement("html:div");
    treeRow.setAttribute("class", "row");
    treeRow.setAttribute(
      "style",
      "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px;"
    );
    const span1 = document.createElement("span");
    span1.setAttribute("class", "cell label primary");
    const span2 = document.createElement("span");
    span2.setAttribute("class", "icon icon-twisty twisty open");
    span2.innerHTML = this.icons["openWorkspaceCollectionView"];
    const span3 = document.createElement("span");
    span3.setAttribute("class", "icon icon-bg cell-icon");
    span3.setAttribute(
      "style",
      "background-image:url(chrome://Knowledge4Zotero/skin/favicon.png)"
    );
    const span4 = document.createElement("span");
    span4.setAttribute("class", "cell-text");
    span4.setAttribute("style", "margin-left: 6px;");
    span4.innerHTML = Zotero.locale.includes("zh")
      ? "打开工作区"
      : "Open Workspace";
    span1.append(span2, span3, span4);
    treeRow.append(span1);
    treeRow.addEventListener("click", (e) => {
      this._Addon.ZoteroEvents.onEditorEvent(
        new EditorMessage("openWorkspace", { event: e })
      );
    });
    treeRow.addEventListener("mouseover", (e: XUL.XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px; background-color: grey;"
      );
    });
    treeRow.addEventListener("mouseleave", (e: XUL.XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px;"
      );
    });
    treeRow.addEventListener("mousedown", (e: XUL.XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px; color: #FFFFFF;"
      );
    });
    treeRow.addEventListener("mouseup", (e: XUL.XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px;"
      );
    });
    document
      .getElementById("zotero-collections-tree-container")
      .children[0].before(treeRow);
  }

  public updateTemplateMenu(type: "Note" | "Item" | "Text") {
    const _window = this._Addon.WorkspaceMenu.getWorkspaceMenuWindow();

    // If tab is open but not selected, we use copy mode
    const copyMode =
      Boolean(
        this._Addon.WorkspaceWindow.workspaceTabId &&
          this._Addon.WorkspaceWindow.workspaceTabId !== "WINDOW" &&
          Zotero_Tabs.selectedID !== this._Addon.WorkspaceWindow.workspaceTabId
      ) || !this._Addon.WorkspaceWindow.workspaceTabId;
    Zotero.debug(`updateTemplateMenu`);
    let templates = this._Addon.TemplateController.getTemplateKeys()
      .filter((e) => e.name.indexOf(type) !== -1)
      .filter(
        (e) =>
          !this._Addon.TemplateController._systemTemplateNames.includes(e.name)
      );
    const popup = _window.document.getElementById(
      `menu_insert${type}TemplatePopup`
    );
    popup.innerHTML = "";
    if (templates.length === 0) {
      templates = [
        {
          name: "No Template",
          text: "",
          disabled: true,
        },
      ];
    }
    for (const template of templates) {
      const menuitem = _window.document.createElement("menuitem");
      menuitem.setAttribute("id", template.name);
      menuitem.setAttribute("label", template.name);
      menuitem.setAttribute(
        "oncommand",
        `
        Zotero.Knowledge4Zotero.ZoteroEvents.onEditorEvent({
          type: "insert${type}UsingTemplate",
          content: {
            params: { templateName: "${template.name}", copy: ${copyMode} },
          },
        });`
      );

      if (template.disabled) {
        menuitem.setAttribute("disabled", true as any);
      }
      popup.append(menuitem);
    }
  }

  public updateCitationStyleMenu() {
    const _window = this._Addon.WorkspaceMenu.getWorkspaceMenuWindow();
    Zotero.debug(`updateCitationStyleMenu`);

    const popup = _window.document.getElementById("menu_citeSettingPopup");
    popup.innerHTML = "";

    let format = this._Addon.TemplateController.getCitationStyle();

    // add styles to list
    const styles = Zotero.Styles.getVisible();
    styles.forEach(function (style) {
      const val = JSON.stringify({
        mode: "bibliography",
        contentType: "html",
        id: style.styleID,
        locale: "",
      });
      const itemNode: XUL.Element = document.createElement("menuitem");
      itemNode.setAttribute("value", val);
      itemNode.setAttribute("label", style.title);
      itemNode.setAttribute("type", "checkbox");
      itemNode.setAttribute(
        "oncommand",
        "Zotero.Prefs.set('Knowledge4Zotero.citeFormat', event.target.value)"
      );
      popup.appendChild(itemNode);

      if (format.id == style.styleID) {
        itemNode.setAttribute("checked", true);
      }
    });
  }

  public updateOCRStyleMenu() {
    Zotero.debug(`updateOCRStyleMenu`);
    const popup = document.getElementById("menu_ocrsettingpopup");
    Array.prototype.forEach.call(popup.children, (e) =>
      e.setAttribute("checked", false)
    );
    let engine = Zotero.Prefs.get("Knowledge4Zotero.OCREngine");
    if (!engine) {
      engine = "bing";
      Zotero.Prefs.set("Knowledge4Zotero.OCREngine", engine);
    }
    (
      document.getElementById(`menu_ocr_${engine}_betternotes`) as XUL.Menuitem
    ).setAttribute("checked", true);
  }

  public updateWordCount() {
    const _window = this._Addon.WorkspaceMenu.getWorkspaceMenuWindow();
    if (!_window) {
      return;
    }
    Zotero.debug("updateWordCount");

    const menuitem = _window.document.getElementById(
      "menu_wordcount_betternotes"
    );
    function fnGetCpmisWords(str) {
      let sLen = 0;
      try {
        // replace break lines
        str = str.replace(/(\r\n+|\s+|　+)/g, "龘");
        // letter, numbers to 'm' letter
        str = str.replace(/[\x00-\xff]/g, "m");
        // make neighbor 'm' to be one letter
        str = str.replace(/m+/g, "*");
        // remove white space
        str = str.replace(/龘+/g, "");
        sLen = str.length;
      } catch (e) {}
      return sLen;
    }
    menuitem.setAttribute(
      "label",
      `Word Count: ${fnGetCpmisWords(
        this._Addon.NoteParse.parseNoteHTML(
          this._Addon.WorkspaceWindow.getWorkspaceNote()
        ).innerText
      )}`
    );
  }

  public updateAutoInsertAnnotationsMenu() {
    const _window = this._Addon.WorkspaceMenu.getWorkspaceMenuWindow();

    Zotero.debug("updateAutoInsertAnnotationsMenu");

    let autoAnnotation = Zotero.Prefs.get("Knowledge4Zotero.autoAnnotation");
    if (typeof autoAnnotation === "undefined") {
      autoAnnotation = false;
      Zotero.Prefs.set("Knowledge4Zotero.autoAnnotation", autoAnnotation);
    }

    const menuitem: XUL.Element = _window.document.getElementById(
      "menu_autoannotation_betternotes"
    );
    if (autoAnnotation) {
      menuitem.setAttribute("checked", true);
    } else {
      menuitem.removeAttribute("checked");
    }

    // Hide main window menu if the standalone window is already opened
    window.document.getElementById("menu_autoannotation_betternotes").hidden =
      _window !== window;
  }

  public showProgressWindow(
    header: string,
    context: string,
    type: "default" | "success" | "fail" = "default",
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
    return progressWindow;
  }

  public changeProgressWindowDescription(progressWindow: any, context: string) {
    if (!progressWindow || progressWindow.closed) {
      return;
    }
    progressWindow.progress._itemText.innerHTML = context;
  }
}

export default ZoteroViews;
