import Knowledge4Zotero from "../addon";
import { OutlineType } from "../utils";
import AddonBase from "../module";

class WorkspaceMenu extends AddonBase {
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  public getWorkspaceMenuWindow(): Window {
    return this._Addon.WorkspaceWindow.workspaceTabId
      ? this._Addon.WorkspaceWindow.workspaceTabId !== "WINDOW"
        ? window
        : this._Addon.WorkspaceWindow.getWorkspaceWindow()
      : window;
  }

  public updateViewMenu() {
    Zotero.debug(
      `updateViewMenu, ${this._Addon.WorkspaceOutline.currentOutline}`
    );
    const _mainWindow = this.getWorkspaceMenuWindow();
    const treeview = _mainWindow.document.getElementById("menu_treeview");
    this._Addon.WorkspaceOutline.currentOutline === OutlineType.treeView
      ? treeview.setAttribute("checked", true as any)
      : treeview.removeAttribute("checked");
    const mindmap = _mainWindow.document.getElementById("menu_mindmap");
    this._Addon.WorkspaceOutline.currentOutline === OutlineType.mindMap
      ? mindmap.setAttribute("checked", true as any)
      : mindmap.removeAttribute("checked");
    const bubblemap = _mainWindow.document.getElementById("menu_bubblemap");
    this._Addon.WorkspaceOutline.currentOutline === OutlineType.bubbleMap
      ? bubblemap.setAttribute("checked", true as any)
      : bubblemap.removeAttribute("checked");

    const noteFontSize = Zotero.Prefs.get("note.fontSize");
    for (let menuitem of this._Addon.WorkspaceWindow.workspaceWindow.document.querySelectorAll(
      `#note-font-size-menu menuitem`
    )) {
      if (parseInt(menuitem.getAttribute("label")) == noteFontSize) {
        menuitem.setAttribute("checked", true as any);
      } else {
        menuitem.removeAttribute("checked");
      }
    }
  }
}

export default WorkspaceMenu;
