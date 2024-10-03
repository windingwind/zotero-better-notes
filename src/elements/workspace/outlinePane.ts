import { FilePickerHelper } from "zotero-plugin-toolkit";
import { config } from "../../../package.json";
import { formatPath } from "../../utils/str";
import { waitUtilAsync } from "../../utils/wait";
import { OutlineType } from "../../utils/workspace";
import { PluginCEBase } from "../base";
import {
  getPref,
  getPrefJSON,
  registerPrefObserver,
  setPref,
  unregisterPrefObserver,
} from "../../utils/prefs";
import { showHintWithLink } from "../../utils/hint";

const persistKey = "persist.workspaceOutline";

export class OutlinePane extends PluginCEBase {
  _outlineType: OutlineType = OutlineType.empty;
  _item?: Zotero.Item;
  _editorElement!: EditorElement;

  _outlineContainer!: HTMLIFrameElement;
  _notifierID!: string;

  _prefObserverID!: symbol;

  static outlineSources = [
    "",
    `chrome://${config.addonRef}/content/treeView.html`,
    `chrome://${config.addonRef}/content/mindMap.html`,
    `chrome://${config.addonRef}/content/bubbleMap.html`,
  ];

  static outlineMenuIDs = {
    "": OutlineType.empty,
    useTreeView: OutlineType.treeView,
    useMindMap: OutlineType.mindMap,
    useBubbleMap: OutlineType.bubbleMap,
  };

  get content() {
    return this._parseContentID(
      MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace/outline.css"
  ></html:link>
</linkset>
<hbox id="left-toolbar">
  <toolbarbutton
    id="setOutline"
    class="zotero-tb-button"
    data-l10n-id="${config.addonRef}-setOutline"
    type="menu"
    wantdropmarker="true"
  >
    <menupopup id="setOutlinePopup">
      <menuitem
        id="useTreeView"
        type="radio"
        data-l10n-id="${config.addonRef}-useTreeView"
      ></menuitem>
      <menuitem
        id="useMindMap"
        type="radio"
        data-l10n-id="${config.addonRef}-useMindMap"
      ></menuitem>
      <menuitem
        id="useBubbleMap"
        type="radio"
        data-l10n-id="${config.addonRef}-useBubbleMap"
      ></menuitem>
    </menupopup>
  </toolbarbutton>
  <toolbarbutton
    id="saveOutline"
    class="zotero-tb-button"
    data-l10n-id="${config.addonRef}-saveOutline"
    type="menu"
    wantdropmarker="true"
  >
    <menupopup id="saveOutlinePopup">
      <menuitem
        id="saveImage"
        data-l10n-id="${config.addonRef}-saveOutlineImage"
      ></menuitem>
      <menuitem
        id="saveSVG"
        data-l10n-id="${config.addonRef}-saveOutlineSVG"
      ></menuitem>
      <menuitem
        id="saveFreeMind"
        data-l10n-id="${config.addonRef}-saveOutlineFreeMind"
      ></menuitem>
      <menuitem
        id="saveMore"
        data-l10n-id="${config.addonRef}-saveMore"
      ></menuitem>
    </menupopup>
  </toolbarbutton>
</hbox>
<iframe id="outline" class="container"></iframe>`),
    );
  }

  get outlineType() {
    return this._outlineType;
  }

  set outlineType(newType) {
    if (newType === OutlineType.empty) {
      newType = OutlineType.treeView;
    }
    if (newType > OutlineType.bubbleMap) {
      newType = OutlineType.treeView;
    }

    this._outlineType = newType;
    this._persistState();
  }

  get item() {
    return this._item;
  }

  set item(val) {
    this._item = val;
  }

  get editor() {
    return this._editorElement._editorInstance;
  }

  init(): void {
    MozXULElement.insertFTLIfNeeded(`${config.addonRef}-outline.ftl`);

    this._outlineContainer = this._queryID(
      "outline",
    ) as unknown as HTMLIFrameElement;

    this._queryID("left-toolbar")?.addEventListener(
      "command",
      this.toolbarButtonCommandHandler,
    );

    this._notifierID = Zotero.Notifier.registerObserver(
      this,
      ["item"],
      "attachmentsBox",
    );

    this._prefObserverID = registerPrefObserver(
      persistKey,
      this._restoreState.bind(this),
    );
  }

  destroy(): void {
    unregisterPrefObserver(this._prefObserverID);
    Zotero.Notifier.unregisterObserver(this._notifierID);
    this._outlineContainer.contentWindow?.removeEventListener(
      "message",
      this.messageHandler,
    );
  }

  notify(
    event: string,
    type: string,
    ids: number[] | string[],
    extraData: { [key: string]: any },
  ) {
    if (!this.item) return;
    if (extraData.skipBN) return;
    if (event === "modify" && type === "item") {
      if ((ids as number[]).includes(this.item.id)) {
        this.updateOutline();
      }
    }
  }

  async render() {
    this._restoreState();
    if (this.outlineType === OutlineType.empty) {
      this.outlineType = OutlineType.treeView;
    }
    await this.updateOutline();
  }

  async updateOutline() {
    if (!this.item) return;

    this._outlineContainer.contentWindow?.removeEventListener(
      "message",
      this.messageHandler,
    );

    this._outlineContainer.setAttribute(
      "src",
      OutlinePane.outlineSources[this.outlineType],
    );

    await waitUtilAsync(
      () =>
        this._outlineContainer.contentWindow?.document.readyState ===
        "complete",
    );
    this._outlineContainer.contentWindow?.addEventListener(
      "message",
      this.messageHandler,
    );
    this._outlineContainer.contentWindow?.postMessage(
      {
        type: "setMindMapData",
        nodes: this._addon.api.note.getNoteTreeFlattened(this.item, {
          keepLink: !!getPref("workspace.outline.keepLinks"),
        }),
        expandLevel: getPref("workspace.outline.expandLevel"),
      },
      "*",
    );

    // Update button hidden
    const isTreeView = this.outlineType === OutlineType.treeView;
    for (const key of ["saveImage", "saveSVG"]) {
      const elem = this._queryID(key);
      if (isTreeView) {
        elem?.setAttribute("disabled", "true");
      } else {
        elem?.removeAttribute("disabled");
      }
    }

    // Update set outline menu
    this._queryID("setOutlinePopup")?.childNodes.forEach((elem) =>
      (elem as XUL.MenuItem).removeAttribute("checked"),
    );
    this._queryID(
      Object.keys(OutlinePane.outlineMenuIDs)[this.outlineType],
    )?.setAttribute("checked", "true");
  }

  saveImage(type: "saveSVG" | "saveImage") {
    this._outlineContainer.contentWindow?.postMessage(
      {
        type,
      },
      "*",
    );
  }

  async saveFreeMind() {
    if (!this.item?.id) return;
    // TODO: uncouple this part
    const filename = await new FilePickerHelper(
      `${Zotero.getString("fileInterface.export")} FreeMind XML`,
      "save",
      [["FreeMind XML File(*.mm)", "*.mm"]],
      `${this.item.getNoteTitle()}.mm`,
    ).open();
    if (filename) {
      await this._addon.api.$export.saveFreeMind(filename, this.item.id);
    }
  }

  toolbarButtonCommandHandler = async (ev: Event) => {
    if (!this.item) return;
    const type = this._unwrapID((ev.target as XUL.ToolBarButton).id);
    switch (type) {
      case "useTreeView":
      case "useMindMap":
      case "useBubbleMap": {
        this.outlineType = OutlinePane.outlineMenuIDs[type];
        await this.updateOutline();
        break;
      }
      case "saveImage":
      case "saveSVG": {
        this.saveImage(type);
        break;
      }
      case "saveFreeMind": {
        this.saveFreeMind();
        break;
      }
      case "saveMore": {
        this._addon.hooks.onShowExportNoteOptions([this.item.id]);
        break;
      }
      default: {
        break;
      }
    }
  };

  messageHandler = async (ev: MessageEvent) => {
    switch (ev.data.type) {
      case "jumpNode": {
        if (!this.editor) {
          return;
        }
        this._addon.api.editor.scroll(this.editor, ev.data.lineIndex);
        return;
      }
      case "openNote": {
        const linkParams = this._addon.api.convert.link2params(ev.data.link);
        if (!linkParams.noteItem) {
          return;
        }
        this._addon.hooks.onOpenNote(linkParams.noteItem.id, "preview", {
          lineIndex: linkParams.lineIndex || undefined,
        });
        return;
      }
      case "moveNode": {
        if (!this.item) return;
        const tree = this._addon.api.note.getNoteTree(this.item);
        const fromNode = this._addon.api.note.getNoteTreeNodeById(
          this.item,
          ev.data.fromID,
          tree,
        );
        const toNode = this._addon.api.note.getNoteTreeNodeById(
          this.item,
          ev.data.toID,
          tree,
        );
        this._addon.api.editor.moveHeading(
          this._addon.api.editor.getEditorInstance(this.item.id),
          fromNode!,
          toNode!,
          ev.data.moveType,
        );
        return;
      }
      case "editNode": {
        if (!this.editor) {
          return;
        }
        this._addon.api.editor.updateHeadingTextAtLine(
          this.editor,
          ev.data.lineIndex,
          ev.data.text.replace(/[\r\n]/g, ""),
        );
        return;
      }
      case "saveSVGReturn": {
        const filename = await new FilePickerHelper(
          `${Zotero.getString("fileInterface.export")} SVG Image`,
          "save",
          [["SVG File(*.svg)", "*.svg"]],
          `${this.item?.getNoteTitle()}.svg`,
        ).open();
        if (filename) {
          await Zotero.File.putContentsAsync(
            formatPath(filename),
            ev.data.image,
          );
          showHintWithLink(
            `Image Saved to ${filename}`,
            "Show in Folder",
            (ev) => {
              Zotero.File.reveal(filename);
            },
          );
        }
        return;
      }
      case "saveImageReturn": {
        const filename = await new FilePickerHelper(
          `${Zotero.getString("fileInterface.export")} PNG Image`,
          "save",
          [["PNG File(*.png)", "*.png"]],
          `${this.item?.getNoteTitle()}.png`,
        ).open();
        if (filename) {
          const parts = ev.data.image.split(",");
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          await IOUtils.write(formatPath(filename), u8arr);
          showHintWithLink(
            `Image Saved to ${filename}`,
            "Show in Folder",
            (ev) => {
              Zotero.File.reveal(filename);
            },
          );
        }
        return;
      }
      default:
        return;
    }
  };

  _persistState() {
    let state = getPrefJSON(persistKey);

    if (state?.outlineType === this.outlineType) {
      return;
    }

    state = {
      ...state,
      outlineType: this.outlineType,
    };

    setPref(persistKey, JSON.stringify(state));
  }

  _restoreState() {
    const state = getPrefJSON(persistKey);
    if (
      typeof state.outlineType === "number" &&
      state.outlineType !== this.outlineType
    ) {
      this.outlineType = state.outlineType;
      this.updateOutline();
    }
  }
}
