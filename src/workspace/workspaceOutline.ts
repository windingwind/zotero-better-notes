/*
 * This file contains workspace ontline related code.
 */

import Knowledge4Zotero from "../addon";
import { OutlineType } from "../utils";
import AddonBase from "../module";

class WorkspaceOutline extends AddonBase {
  public currentOutline: OutlineType;
  public currentNodeID: number;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.currentOutline = OutlineType.treeView;
    this.currentNodeID = -1;
  }

  public switchView(newType: OutlineType = undefined) {
    if (!newType) {
      newType = this.currentOutline + 1;
    }
    if (newType > OutlineType.bubbleMap) {
      newType = OutlineType.treeView;
    }
    this._Addon.WorkspaceWindow.workspaceWindow.document.getElementById(
      "outline-saveImage"
    ).hidden = newType === OutlineType.treeView;
    this._Addon.WorkspaceWindow.workspaceWindow.document.getElementById(
      "outline-saveFreeMind"
    ).hidden = newType === OutlineType.treeView;
    const mindmap =
      this._Addon.WorkspaceWindow.workspaceWindow.document.getElementById(
        "mindmap-container"
      );

    const oldIframe =
      this._Addon.WorkspaceWindow.workspaceWindow.document.getElementById(
        "mindmapIframe"
      );
    if (oldIframe) {
      oldIframe.remove();
    }
    this.currentOutline = newType;
    const srcList = [
      "",
      "chrome://Knowledge4Zotero/content/treeView.html",
      "chrome://Knowledge4Zotero/content/mindMap.html",
      "chrome://Knowledge4Zotero/content/bubbleMap.html",
    ];
    const iframe =
      this._Addon.WorkspaceWindow.workspaceWindow.document.createElement(
        "iframe"
      );
    iframe.setAttribute("id", "mindmapIframe");
    iframe.setAttribute("src", srcList[this.currentOutline]);
    mindmap.append(iframe);
    this.resizeOutline();
    this.updateOutline();
    // Clear stored node id
    this.currentNodeID = -1;
    this._Addon.WorkspaceMenu.updateViewMenu();
  }

  public async updateOutline() {
    Zotero.debug("Knowledge4Zotero: updateMindMap");
    // await this._initIframe.promise;
    const _window = this._Addon.WorkspaceWindow.getWorkspaceWindow();
    if (!_window) {
      return;
    }
    const iframe = _window.document.getElementById(
      "mindmapIframe"
    ) as HTMLIFrameElement;
    iframe.contentWindow.postMessage(
      {
        type: "setMindMapData",
        nodes: this._Addon.NoteUtils.getNoteTreeAsList(
          this._Addon.WorkspaceWindow.getWorkspaceNote(),
          true,
          false
        ),
      },
      "*"
    );
  }

  public saveImage() {
    Zotero.debug("Knowledge4Zotero: saveImage");
    const _window = this._Addon.WorkspaceWindow.getWorkspaceWindow();
    if (!_window) {
      return;
    }
    const iframe = _window.document.getElementById(
      "mindmapIframe"
    ) as HTMLIFrameElement;
    iframe.contentWindow.postMessage(
      {
        type: "saveSVG",
      },
      "*"
    );
  }

  public resizeOutline() {
    const iframe =
      this._Addon.WorkspaceWindow.workspaceWindow.document.getElementById(
        "mindmapIframe"
      );
    const container =
      this._Addon.WorkspaceWindow.workspaceWindow.document.getElementById(
        "zotero-knowledge-outline"
      );
    if (iframe) {
      iframe.style.height = `${container.clientHeight - 60}px`;
      iframe.style.width = `${container.clientWidth - 10}px`;
    }
  }
}

export default WorkspaceOutline;
