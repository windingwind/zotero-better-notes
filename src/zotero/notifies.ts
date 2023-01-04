import TreeModel = require("tree-model");
import BetterNotes from "../addon";
import AddonBase from "../module";
import { EditorMessage } from "../utils";

export default class ZoteroNotifies extends AddonBase {
  notifierCbkDict: { [key: string]: Function };
  constructor(parent: BetterNotes) {
    super(parent);
    this.notifierCbkDict = {};
  }

  public registerNotifyListener(name: string, cbk: Function) {
    this.notifierCbkDict[name] = cbk;
  }

  public unregisterNotifyListener(name: string) {
    delete this.notifierCbkDict[name];
  }

  initNotifyCallback() {
    // Register the callback in Zotero as an item observer
    const notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<number | string>,
        extraData: object
      ) => {
        for (const cbk of Object.values(this.notifierCbkDict)) {
          try {
            (cbk as Function)(event, type, ids, extraData);
          } catch (e) {
            this._Addon.toolkit.Tool.log(e);
          }
        }
      },
    };
    let notifierID = Zotero.Notifier.registerObserver(notifierCallback, [
      "item",
      "tab",
      "file",
      "item-tag",
    ]);

    this.registerDefaultCallbacks();

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      (e) => {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
  }

  // TODO: move these to seperate functions under different modules
  registerDefaultCallbacks() {
    const itemModifyCallback = async (
      event: string,
      type: string,
      ids: Array<number | string>,
      extraData: object
    ) => {
      if (event === "modify" && type === "item") {
        if (
          ids.indexOf(
            Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID") as number
          ) >= 0
        ) {
          this._Addon.toolkit.Tool.log("main knowledge modify check.");
          this._Addon.WorkspaceOutline.updateOutline();
          this._Addon.ZoteroViews.updateWordCount();
        }
        // Check Note Sync
        const syncIds = this._Addon.SyncController.getSyncNoteIds();
        const modifiedSyncIds = ids.filter((id) =>
          syncIds.includes(id as number)
        ) as number[];
        if (modifiedSyncIds.length > 0) {
          // Delay so that item content is ready
          setTimeout(() => {
            this._Addon.SyncController.doSync(
              Zotero.Items.get(modifiedSyncIds)
            );
          }, 10000);
          this._Addon.toolkit.Tool.log("sync planned.");
        }
      }
    };

    const annotationDispalyCallback = async (
      event: string,
      type: string,
      ids: Array<number | string>,
      extraData: object
    ) => {
      if (
        (event == "select" &&
          type == "tab" &&
          extraData[ids[0]].type == "reader") ||
        (event === "add" &&
          type === "item" &&
          (Zotero.Items.get(ids as number[]) as Zotero.Item[]).filter(
            (item) => {
              return item.isAnnotation();
            }
          ).length > 0) ||
        (event === "close" && type === "tab") ||
        (event === "open" && type === "file")
      ) {
        await this._Addon.ReaderViews.buildReaderAnnotationButtons();
      }
    };

    const addWorkspaceTabCallback = async (
      event: string,
      type: string,
      ids: Array<number | string>,
      extraData: object
    ) => {
      if (
        event == "add" &&
        type == "tab" &&
        ids[0] === this._Addon.WorkspaceWindow.workspaceTabId
      ) {
        const tabItem = document.querySelector(`.tab[data-id=${ids[0]}]`);
        const tabTitle = tabItem && tabItem.querySelector(".tab-name");
        tabTitle &&
          (tabTitle.innerHTML = `${this._Addon.ZoteroViews.icons["tabIcon"]}${tabTitle.innerHTML}`);
      }
    };

    const selectWorkspaceTabCallback = async (
      event: string,
      type: string,
      ids: Array<number | string>,
      extraData: object
    ) => {
      if (
        event == "select" &&
        type == "tab" &&
        extraData[ids[0]].type == "betternotes"
      ) {
        let t = 0;
        await this._Addon.WorkspaceWindow.waitWorkspaceReady();
        while (
          !(await this._Addon.WorkspaceWindow.getWorkspaceEditorInstance(
            "main",
            false
          )) &&
          t < 100
        ) {
          t += 1;
          this._Addon.WorkspaceWindow.setWorkspaceNote(
            "main",
            undefined,
            false
          );
          await Zotero.Promise.delay(100);
        }

        const _tabCover = document.getElementById("zotero-tab-cover");
        const _contextPane = document.getElementById(
          "zotero-context-pane"
        ) as XUL.Element;
        const _contextPaneSplitter = document.getElementById(
          "zotero-context-splitter"
        ) as XUL.Element;
        const _tabToolbar = document.getElementById("zotero-tab-toolbar");
        _contextPaneSplitter.setAttribute("hidden", true);
        _contextPane.setAttribute("collapsed", true);
        _tabToolbar && (_tabToolbar.hidden = true);
        _tabCover && (_tabCover.hidden = true);
        this._Addon.ZoteroViews.switchRealMenuBar(false);
        this._Addon.ZoteroViews.switchKey(false);
        this._Addon.ZoteroViews.updateWordCount();
      } else {
        this._Addon.ZoteroViews.switchRealMenuBar(true);
        this._Addon.ZoteroViews.switchKey(true);
      }
    };

    const autoAnnotationCallback = async (
      event: string,
      type: string,
      ids: Array<number | string>,
      extraData: object
    ) => {
      if (
        Zotero.Prefs.get("Knowledge4Zotero.autoAnnotation") &&
        event === "add" &&
        type === "item" &&
        (Zotero.Items.get(ids as number[]) as Zotero.Item[]).filter((item) => {
          return item.isAnnotation();
        }).length > 0
      ) {
        this._Addon.toolkit.Tool.log("autoAnnotation");
        const annotations = (
          Zotero.Items.get(ids as number[]) as Zotero.Item[]
        ).filter((item) => {
          return item.isAnnotation();
        });
        this._Addon.NoteUtils.addAnnotationsToNote(
          this._Addon.WorkspaceWindow.getWorkspaceNote(),
          annotations,
          -1,
          true
        );
      }
    };

    const addToNoteTriggeredByTagCallback = async (
      event: string,
      type: string,
      ids: Array<number | string>,
      extraData: object
    ) => {
      if (event === "add" && type === "item-tag") {
        const nodes: TreeModel.Node<object>[] =
          this._Addon.NoteUtils.getNoteTreeAsList(
            this._Addon.WorkspaceWindow.getWorkspaceNote()
          );
        const headings: string[] = nodes.map((node) => node.model.name);
        this._Addon.toolkit.Tool.log(ids, extraData, headings);

        for (const tagId of ids.filter((t) => extraData[t].tag[0] === "#")) {
          const tagName = (extraData[tagId].tag as string).slice(1).trim();
          if (headings.includes(tagName) || tagName === "#") {
            let lineIndex: number;
            let sectionName: string;
            if (tagName === "#") {
              lineIndex = -1;
              sectionName = "";
            } else {
              const targetNode = nodes.find(
                (node) => node.model.name === tagName
              );
              lineIndex = targetNode.model.endIndex;
              sectionName = targetNode.model.name;
            }

            const item = Zotero.Items.get(
              (tagId as string).split("-")[0]
            ) as Zotero.Item;
            if (item.isAnnotation()) {
              this._Addon.NoteUtils.addAnnotationsToNote(
                this._Addon.WorkspaceWindow.getWorkspaceNote(),
                [item],
                -1,
                true
              );
            } else if (item.isNote()) {
              this._Addon.ZoteroEvents.onEditorEvent(
                new EditorMessage("addToNote", {
                  params: {
                    itemID: item.id,
                    lineIndex: lineIndex,
                    sectionName: sectionName,
                  },
                })
              );
            }
          }
        }
      }
    };
    this.registerNotifyListener("itemModifyCallback", itemModifyCallback);
    this.registerNotifyListener(
      "annotationDispalyCallback",
      annotationDispalyCallback
    );
    this.registerNotifyListener(
      "addWorkspaceTabCallback",
      addWorkspaceTabCallback
    );
    this.registerNotifyListener(
      "selectWorkspaceTabCallback",
      selectWorkspaceTabCallback
    );
    this.registerNotifyListener(
      "autoAnnotationCallback",
      autoAnnotationCallback
    );
    this.registerNotifyListener(
      "addToNoteTriggeredByTagCallback",
      addToNoteTriggeredByTagCallback
    );
  }
}
