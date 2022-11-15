/*
 * This file contains the life-time and UI events.
 */

import TreeModel = require("tree-model");
import Knowledge4Zotero from "../addon";
import { CopyHelper, EditorMessage } from "../utils";
import AddonBase from "../module";

class ZoteroEvents extends AddonBase {
  notifierCallback: any;
  notifierCbkDict: any;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.notifierCallback = {
      notify: async (
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
            Zotero.debug("Knowledge4Zotero: main knowledge modify check.");
            this._Addon.WorkspaceOutline.updateOutline();
            this._Addon.ZoteroViews.updateWordCount();
          }
          // Check Note Sync
          const syncIds =
            this._Addon.SyncController.getSyncNoteIds() as number[];
          if (ids.filter((id) => syncIds.includes(id as number)).length > 0) {
            this._Addon.SyncController.setSync();
            Zotero.debug("Better Notes: sync planned.");
          }
        }
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
        if (event == "add" && type == "tab") {
          if (ids[0] === this._Addon.WorkspaceWindow.workspaceTabId) {
            const tabItem = document.querySelector(`.tab[data-id=${ids[0]}]`);
            const tabTitle = tabItem && tabItem.querySelector(".tab-name");
            tabTitle &&
              (tabTitle.innerHTML = `${this._Addon.ZoteroViews.icons["tabIcon"]}${tabTitle.innerHTML}`);
          }
        }
        if (event == "select" && type == "tab") {
          if (extraData[ids[0]].type == "betternotes") {
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
        }
        if (
          Zotero.Prefs.get("Knowledge4Zotero.autoAnnotation") &&
          event === "add" &&
          type === "item" &&
          (Zotero.Items.get(ids as number[]) as Zotero.Item[]).filter(
            (item) => {
              return item.isAnnotation();
            }
          ).length > 0
        ) {
          Zotero.debug("Knowledge4Zotero: autoAnnotation");
          const annotations = (
            Zotero.Items.get(ids as number[]) as Zotero.Item[]
          ).filter((item) => {
            return item.isAnnotation();
          });
          this.onEditorEvent(
            new EditorMessage("addAnnotationToNote", {
              params: { annotations: annotations },
            })
          );
        }
        if (event === "add" && type === "item-tag") {
          const nodes: TreeModel.Node<object>[] =
            this._Addon.NoteUtils.getNoteTreeAsList(
              this._Addon.WorkspaceWindow.getWorkspaceNote()
            );
          const headings: string[] = nodes.map((node) => node.model.name);
          console.log(ids, extraData, headings);

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
                this.onEditorEvent(
                  new EditorMessage("addAnnotationToNote", {
                    params: {
                      annotations: [item],
                      lineIndex: lineIndex,
                      sectionName: sectionName,
                    },
                  })
                );
              } else if (item.isNote()) {
                this.onEditorEvent(
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
        for (const cbk of Object.values(this.notifierCbkDict)) {
          (cbk as Function)(event, type, ids, extraData);
        }
      },
    };
    this.notifierCbkDict = {};
  }

  public async onInit() {
    Zotero.debug("Knowledge4Zotero: init called");
    this.initProxyHandler();

    this.addEditorInstanceListener();
    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "item",
      "tab",
      "file",
      "item-tag",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      (e) => {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );

    await Zotero.uiReadyPromise;
    this._Addon.ZoteroViews.addOpenWorkspaceButton();
    this._Addon.ZoteroViews.addNewMainNoteButton();

    if (!Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
      this.onEditorEvent(new EditorMessage("openUserGuide", {}));
    }
    this.resetState();

    this.initWorkspaceTab();
    this._Addon.ZoteroViews.keppDefaultMenuOrder();
    this._Addon.ZoteroViews.switchRealMenuBar(true);
    this._Addon.ZoteroViews.switchKey(true);

    this.initItemSelectListener();

    // Set a init sync
    this._Addon.SyncController.setSync();
  }

  private initProxyHandler() {
    const openNoteExtension = {
      noContent: true,
      doAction: async (uri: any) => {
        let message = {
          type: "onNoteLink",
          content: {
            params: await this._Addon.NoteUtils.getNoteFromLink(uri.spec),
          },
        };
        await this._Addon.ZoteroEvents.onEditorEvent(message);
      },
      newChannel: function (uri: any) {
        this.doAction(uri);
      },
    };
    Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
      "zotero://note"
    ] = openNoteExtension;
  }

  private async initWorkspaceTab() {
    let state = Zotero.Session.state.windows.find((x) => x.type === "pane");
    Zotero.debug("initWorkspaceTab");
    Zotero.debug(state);
    if (state) {
      const noteTab = state.tabs.find((t) => t.type === "betternotes");
      Zotero.debug(noteTab);
      if (noteTab) {
        let t = 0;
        while (t < 5) {
          t += 1;
          try {
            await this._Addon.WorkspaceWindow.openWorkspaceWindow(
              "tab",
              false,
              false
            );
            break;
          } catch (e) {
            this._Addon.ZoteroViews.showProgressWindow(
              "Recovering Note Workspace Failed",
              e
            );
          }
          await Zotero.Promise.delay(1000);
        }
      }
    }
  }

  private initItemSelectListener() {
    ZoteroPane.itemsView.onSelect.addListener(() => {
      const items = ZoteroPane.getSelectedItems();
      const hasNote = items.filter((i) => i.isNote()).length > 0;
      const singleItem = items.length === 1;
      document
        .querySelectorAll(".popup-type-single")
        .forEach((el) => ((el as HTMLElement).hidden = !singleItem));
      document
        .querySelectorAll(".popup-type-multiple")
        .forEach((el) => ((el as HTMLElement).hidden = singleItem));
      document
        .querySelectorAll(".popup-type-single-note")
        .forEach(
          (el) => ((el as HTMLElement).hidden = !(singleItem && hasNote))
        );
    });
  }

  private addEditorInstanceListener() {
    if (!Zotero.Notes._knowledgeInit) {
      Zotero.Notes._knowledgeInit = true;
      Zotero.Notes._registerEditorInstance =
        Zotero.Notes.registerEditorInstance;
      Zotero.Notes.registerEditorInstance = async (
        instance: Zotero.EditorInstance
      ) => {
        Zotero.Notes._registerEditorInstance(instance);
        await instance._initPromise;

        instance._knowledgeUIInitialized = false;

        const noteItem = instance._item;

        // item.getNote may not be initialized yet
        if (Zotero.ItemTypes.getID("note") !== noteItem.itemTypeID) {
          return;
        }

        Zotero.debug(`Knowledge4Zotero: note editor initializing...`);
        await this._Addon.EditorViews.initEditor(instance);
        Zotero.debug(`Knowledge4Zotero: note editor initialized.`);

        if (!instance._knowledgeSelectionInitialized) {
          instance._iframeWindow.document.addEventListener(
            "selectionchange",
            async (e) => {
              await this._Addon.NoteUtils.onSelectionChange(instance);
            }
          );
          instance._iframeWindow.document.addEventListener(
            "click",
            async (e) => {
              if ((e.target as HTMLElement).tagName === "A") {
                const link = (e.target as HTMLLinkElement).href;
                const actions = {
                  // @ts-ignore
                  openLink: () => window.openURL(link),
                  openLinkIfNote: () => {
                    link.includes("zotero://note") ? actions.openLink() : null;
                  },
                  openLinkIfSelect: () => {
                    link.includes("zotero://select")
                      ? actions.openLink()
                      : null;
                  },
                  openLinkIfPDF: () => {
                    link.includes("zotero://open-pdf")
                      ? actions.openLink()
                      : null;
                  },
                  openLinkInNewWindow: async () => {
                    if (link.includes("zotero://note")) {
                      ZoteroPane.openNoteWindow(
                        (
                          (await this._Addon.NoteUtils.getNoteFromLink(link))
                            .item as Zotero.Item
                        )?.id
                      );
                    } else {
                      actions.openLink();
                    }
                  },
                  copyLink: async () => {
                    new CopyHelper()
                      .addText(link, "text/unicode")
                      .addText(
                        (e.target as HTMLLinkElement).outerHTML,
                        "text/html"
                      )
                      .copy();
                  },
                  setMainNote: async () => {
                    const noteItem = (
                      await this._Addon.NoteUtils.getNoteFromLink(link)
                    ).item as Zotero.Item;
                    if (!noteItem) {
                      return;
                    }
                    await this.onEditorEvent(
                      new EditorMessage("setMainNote", {
                        params: {
                          itemID: noteItem.id,
                          enableConfirm: false,
                          enableOpen: true,
                        },
                      })
                    );
                  },
                };
                const shiftAction = Zotero.Prefs.get(
                  "Knowledge4Zotero.linkAction.shiftclick"
                ) as string;
                const ctrlAction = Zotero.Prefs.get(
                  "Knowledge4Zotero.linkAction.ctrlclick"
                ) as string;
                const altAction = Zotero.Prefs.get(
                  "Knowledge4Zotero.linkAction.altclick"
                ) as string;
                const clickAction = Zotero.Prefs.get(
                  "Knowledge4Zotero.linkAction.click"
                ) as string;
                if (e.shiftKey && shiftAction) {
                  actions[shiftAction]();
                } else if (e.ctrlKey && ctrlAction) {
                  actions[ctrlAction]();
                } else if (e.altKey && altAction) {
                  actions[altAction]();
                } else if (
                  clickAction &&
                  !(e.shiftKey || e.ctrlKey || e.altKey)
                ) {
                  actions[clickAction]();
                }
              }
            }
          );
          instance._knowledgeSelectionInitialized = true;
        }

        instance._popup.setAttribute(
          "onpopupshowing",
          "Zotero.Knowledge4Zotero.EditorViews.updatePopupMenu()"
        );

        instance._iframeWindow.addEventListener("mousedown", (e) => {
          this._Addon.EditorController.activeEditor = instance;
        });

        instance._knowledgeUIInitialized = true;

        this._Addon.EditorController.recordEditor(instance);
      };
    }
  }

  private resetState(): void {
    // Reset preferrence state.
    this._Addon.TemplateController.resetTemplates();
    // Initialize citation style
    this._Addon.TemplateController.getCitationStyle();
    // Initialize sync notes
    this._Addon.SyncController.getSyncNoteIds();
    this._Addon.ZoteroViews.updateAutoInsertAnnotationsMenu();
  }

  public addNotifyListener(name: string, cbk: Function) {
    this.notifierCbkDict[name] = cbk;
  }

  public removeNotifyListener(name: string) {
    delete this.notifierCbkDict[name];
  }

  public async onEditorEvent(message: EditorMessage) {
    Zotero.debug(`Knowledge4Zotero: onEditorEvent\n${message.type}`);
    const mainNote = this._Addon.WorkspaceWindow.getWorkspaceNote();
    if (message.type === "openUserGuide") {
      /*
        message.content = {}
      */
      window.open(
        "chrome://Knowledge4Zotero/content/wizard.xul",
        "_blank",
        // margin=44+44/32+10+10+53, final space is 700*500
        "chrome,extrachrome,centerscreen,width=650,height=608"
      );
    } else if (message.type === "openAbout") {
      /*
        message.content = {}
      */
      // @ts-ignore
      window.openDialog(
        "chrome://Knowledge4Zotero/content/about.xul",
        "about",
        "chrome,centerscreen"
      );
    } else if (message.type === "openWorkspace") {
      /*
        message.content = {event?}
      */
      if (
        message.content.event &&
        (message.content.event as unknown as MouseEvent).shiftKey
      ) {
        await this._Addon.WorkspaceWindow.openWorkspaceWindow("window", true);
      } else {
        await this._Addon.WorkspaceWindow.openWorkspaceWindow();
      }
    } else if (message.type === "openWorkspaceInWindow") {
      /*
        message.content = {}
      */
      await this._Addon.WorkspaceWindow.openWorkspaceWindow("window", true);
    } else if (message.type === "closeWorkspace") {
      /*
        message.content = {}
      */
      this._Addon.WorkspaceWindow.closeWorkspaceWindow();
    } else if (message.type === "createWorkspace") {
      /*
        message.content = {}
      */
      const currentCollection = ZoteroPane_Local.getSelectedCollection();
      if (!currentCollection) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "Please select a collection before creating a new main note."
        );
        return;
      }
      const res = confirm(
        `Will create a new note under collection '${currentCollection.getName()}' and set it the main note. Continue?`
      );
      if (!res) {
        return;
      }
      const header = prompt(
        "Enter new note header:",
        `New Note ${new Date().toLocaleString()}`
      );
      const noteID = await ZoteroPane_Local.newNote();
      (Zotero.Items.get(noteID) as Zotero.Item).setNote(
        `<div data-schema-version="8"><h1>${header}</h1>\n</div>`
      );
      await this.onEditorEvent(
        new EditorMessage("setMainNote", {
          params: { itemID: noteID, enableConfirm: false, enableOpen: true },
        })
      );
      await this._Addon.WorkspaceWindow.openWorkspaceWindow();
    } else if (message.type === "selectMainNote") {
      /*
        message.content = {}
      */
      const ids = await this._Addon.ZoteroViews.openSelectItemsWindow();
      if (ids.length === 0) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Knowledge",
          "No note selected."
        );
        return;
      } else if (ids.length > 1) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "Please select a note item."
        );
        return;
      }

      const note = Zotero.Items.get(ids[0]) as Zotero.Item;
      if (note && note.isNote()) {
        this.onEditorEvent(
          new EditorMessage("setMainNote", {
            params: { itemID: note.id, enableConfirm: false, enableOpen: true },
          })
        );
      } else {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "Not a valid note item."
        );
      }
    } else if (message.type === "setMainNote") {
      /*
        message.content = {
          params: {itemID, enableConfirm, enableOpen}
        }
      */
      Zotero.debug("Knowledge4Zotero: setMainNote");
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID") as string
      );
      let itemID = message.content.params.itemID;
      const item = Zotero.Items.get(itemID) as Zotero.Item;
      if (itemID === mainKnowledgeID) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "Already a main Note."
        );
        return;
      } else if (!item.isNote()) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "Not a valid note item."
        );
      } else {
        if (
          message.content.params.enableConfirm &&
          Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
        ) {
          let confirmChange = confirm(
            "Will change current Knowledge Workspace. Confirm?"
          );
          if (!confirmChange) {
            return;
          }
        }
        if (message.content.params.enableOpen) {
          await this._Addon.WorkspaceWindow.openWorkspaceWindow();
        }
        await this._Addon.WorkspaceWindow.setWorkspaceNote("main", item);
      }
    } else if (message.type === "insertCitation") {
      /*
        message.content = {
          editorInstance?, event?, params?: {
              noteItem: noteItem,
              topItem: topItem,
            },
        }
      */
      let noteItem = message.content.editorInstance
        ? message.content.editorInstance._item
        : message.content.params.noteItem;
      let topItems: Zotero.Item[] = [];
      console.log(message);
      if (message.content.event) {
        const topItemID = Number(
          message.content.event.target.id.split("-").pop()
        );
        topItems = Zotero.Items.get([topItemID]) as Zotero.Item[];
      }
      if (!topItems.length) {
        const ids = await this._Addon.ZoteroViews.openSelectItemsWindow();

        topItems = (Zotero.Items.get(ids) as Zotero.Item[]).filter(
          (item: Zotero.Item) => item.isRegularItem()
        );
        if (topItems.length === 0) {
          return;
        }
      }
      let format = this._Addon.TemplateController.getCitationStyle();
      const cite = Zotero.QuickCopy.getContentFromItems(
        topItems,
        format,
        null,
        0
      );
      this._Addon.NoteUtils.addLineToNote(noteItem, cite.html, -1);
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        `${
          topItems.length > 3
            ? topItems.length + "items"
            : topItems.map((i) => i.getField("title")).join("\n")
        } cited.`
      );
    } else if (message.type === "setRecentMainNote") {
      /*
        message.content = {
          editorInstance?, event?
        }
      */
      await this._Addon.WorkspaceWindow.setWorkspaceNote(
        "main",
        Zotero.Items.get(
          message.content.event.target.id.split("-").pop()
        ) as Zotero.Item
      );
    } else if (message.type === "addToNoteEnd") {
      /*
        message.content = {
          editorInstance
        }
      */
      Zotero.debug("Knowledge4Zotero: addToNoteEnd");
      await this._Addon.NoteUtils.addLinkToNote(
        mainNote,
        (message.content.editorInstance as Zotero.EditorInstance)._item,
        // -1 for automatically insert to current selected line or end of note
        -1,
        ""
      );
    } else if (message.type === "addToNote") {
      /*
        message.content = {
          editorInstance?,
          event?,
          params: {
            itemID: number,
            lineIndex: number,
            sectionName: string
          }
        }
      */
      Zotero.debug("Knowledge4Zotero: addToNote");
      let lineIndex = message.content.params?.lineIndex;
      if (typeof lineIndex === "undefined") {
        const eventInfo = (message.content.event as XUL.XULEvent).target.id;
        Zotero.debug(eventInfo);
        const idSplit = eventInfo.split("-");
        lineIndex = parseInt(idSplit.pop());
      }
      let sectionName = message.content.params?.sectionName;
      if (typeof sectionName === "undefined") {
        sectionName = (message.content.event as XUL.XULEvent).target.innerText;
      }

      await this._Addon.NoteUtils.addLinkToNote(
        mainNote,
        message.content.params?.itemID
          ? (Zotero.Items.get(message.content.params.itemID) as Zotero.Item)
          : (message.content.editorInstance as Zotero.EditorInstance)._item,
        lineIndex,
        sectionName
      );
    } else if (message.type === "addAnnotationToNote") {
      /*
        message.content = {
          params: {
            annotations: Zotero.Item[],
            lineIndex?: number
          }
        }
      */
      const useLineIndex = message.content.params?.lineIndex >= 0;
      let currentLine = useLineIndex ? message.content.params?.lineIndex : -1;
      const annotations = message.content.params.annotations;
      const workspaceNote = this._Addon.WorkspaceWindow.getWorkspaceNote();

      const html = await this._Addon.NoteUtils.addAnnotationsToNote(
        workspaceNote,
        annotations,
        currentLine
      );
      if (!useLineIndex) {
        currentLine = this._Addon.NoteUtils.currentLine[workspaceNote.id];
        currentLine = currentLine >= 0 ? currentLine : -1;

        if (currentLine >= 0) {
          // Compute annotation lines length
          const temp = document.createElementNS(
            "http://www.w3.org/1999/xhtml",
            "div"
          );
          temp.innerHTML = html;
          const elementList = this._Addon.NoteParse.parseHTMLElements(temp);
          // Move cursor foward
          this._Addon.NoteUtils.currentLine[workspaceNote.id] +=
            elementList.length;
        }
      }
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        `Insert Annotation to ${
          currentLine >= 0 ? `line ${currentLine} in` : "end of"
        } main note`
      );
    } else if (message.type === "jumpNode") {
      /*
        message.content = {
          params: {id, lineIndex}
        }
      */
      Zotero.debug(message.content.params);
      let editorInstance =
        await this._Addon.WorkspaceWindow.getWorkspaceEditorInstance();
      // Set node id
      this._Addon.WorkspaceOutline.currentNodeID = parseInt(
        message.content.params.id
      );
      this._Addon.EditorViews.scrollToLine(
        editorInstance,
        // Scroll to line
        message.content.params.lineIndex
      );
    } else if (message.type === "closePreview") {
      /*
        message.content = {
          editorInstance
        }
      */
      const _window =
        this._Addon.WorkspaceWindow.getWorkspaceWindow() as Window;
      const splitter = _window.document.getElementById("preview-splitter");
      splitter && splitter.setAttribute("state", "collapsed");
    } else if (message.type === "onNoteLink") {
      /*
        message.content = {
          params: {
            item: Zotero.Item | boolean,
            forceStandalone: boolean,
            infoText: string
            args: {}
          }
        }
      */
      const noteItem = message.content.params.item;
      const forceStandalone = message.content.params.forceStandalone;
      let _window = this._Addon.WorkspaceWindow.getWorkspaceWindow();
      if (!noteItem) {
        Zotero.debug(`Knowledge4Zotero: ${message.content.params.infoText}`);
      }
      Zotero.debug(`Knowledge4Zotero: onNoteLink ${noteItem.id}`);
      if (
        !forceStandalone &&
        _window &&
        (noteItem.id === this._Addon.WorkspaceWindow.getWorkspaceNote().id ||
          noteItem.id === this._Addon.WorkspaceWindow.previewItemID)
      ) {
        // Scroll to line directly
        await this._Addon.WorkspaceWindow.openWorkspaceWindow();
      } else {
        this._Addon.EditorController.startWaiting();
        if (_window && !forceStandalone) {
          await this._Addon.WorkspaceWindow.setWorkspaceNote(
            "preview",
            noteItem
          );
          await this._Addon.WorkspaceWindow.openWorkspaceWindow();
        } else {
          ZoteroPane.openNoteWindow(noteItem.id);
        }
        await this._Addon.EditorController.waitForEditor();
      }

      if (message.content.params.args.line) {
        Zotero.Notes._editorInstances
          .filter((e) => e._item.id === noteItem.id)
          .forEach((e) => {
            this._Addon.EditorViews.scrollToLine(
              e,
              // Scroll to line
              message.content.params.args.line
            );
          });
      }
    } else if (message.type === "updateAutoAnnotation") {
      /*
        message.content = {
          editorInstance
        }
      */
      let autoAnnotation = Zotero.Prefs.get("Knowledge4Zotero.autoAnnotation");
      autoAnnotation = !autoAnnotation;
      Zotero.Prefs.set("Knowledge4Zotero.autoAnnotation", autoAnnotation);
      this._Addon.ZoteroViews.updateAutoInsertAnnotationsMenu();
    } else if (message.type === "insertNotes") {
      /*
        message.content = {}
      */
      const ids = await this._Addon.ZoteroViews.openSelectItemsWindow();
      const notes = (Zotero.Items.get(ids) as Zotero.Item[]).filter(
        (item: Zotero.Item) => item.isNote()
      );
      if (notes.length === 0) {
        return;
      }

      const newLines: string[] = [];
      newLines.push("<h1>Imported Notes</h1>");
      newLines.push("<p> </p>");

      for (const note of notes) {
        const linkURL = this._Addon.NoteUtils.getNoteLink(note);
        const linkText = note.getNoteTitle().trim();
        newLines.push(
          `<p><a href="${linkURL}">${linkText ? linkText : linkURL}</a></p>`
        );
        newLines.push("<p> </p>");
      }
      await this._Addon.NoteUtils.addLineToNote(
        mainNote,
        newLines.join("\n"),
        -1
      );
    } else if (message.type === "insertTextUsingTemplate") {
      /*
        message.content = {
          params: {templateName, targetItemId, useMainNote}
        }
      */
      const newLines: string[] = [];
      const targetItem = Zotero.Items.get(
        message.content.params.targetItemId
      ) as Zotero.Item;

      const progressWindow = this._Addon.ZoteroViews.showProgressWindow(
        "Running Template",
        message.content.params.templateName,
        "default",
        -1
      );
      const renderredTemplate =
        (await this._Addon.TemplateController.renderTemplateAsync(
          message.content.params.templateName
        )) as string;

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
        const html = newLines.join("\n");
        if (!targetItem) {
          console.log(html);
          new CopyHelper()
            .addText(html, "text/html")
            .addText(this._Addon.NoteParse.parseHTMLToMD(html), "text/unicode")
            .copy();
          progressWindow.changeHeadline("Template Copied");
        } else {
          // End of line
          await this._Addon.NoteUtils.addLineToNote(
            targetItem,
            html,
            -1,
            false
          );
          progressWindow.changeHeadline("Running Template Finished");
        }
      } else {
        progressWindow.changeHeadline("Running Template Failed");
      }
      progressWindow.startCloseTimer(5000);
    } else if (message.type === "insertItemUsingTemplate") {
      /*
        message.content = {
          params: {templateName, targetItemId, useMainNote}
        }
      */
      const targetItem = Zotero.Items.get(
        message.content.params.targetItemId
      ) as Zotero.Item;

      const ids = await this._Addon.ZoteroViews.openSelectItemsWindow();
      const items = Zotero.Items.get(ids) as Zotero.Item[];
      if (items.length === 0) {
        return;
      }
      const progressWindow = this._Addon.ZoteroViews.showProgressWindow(
        "Running Template",
        message.content.params.templateName,
        "default",
        -1
      );
      const newLines: string[] = [];
      newLines.push("<p> </p>");

      const toCopyImage: Zotero.Item[] = [];

      const copyNoteImage = (noteItem: Zotero.Item) => {
        toCopyImage.push(noteItem);
      };

      const editor = message.content.params.useMainNote
        ? await this._Addon.WorkspaceWindow.getWorkspaceEditorInstance(
            "main",
            false
          )
        : this._Addon.EditorController.activeEditor;

      const sharedObj = {};

      let renderredTemplate =
        await this._Addon.TemplateController.renderTemplateAsync(
          message.content.params.templateName,
          "items, copyNoteImage, editor, sharedObj",
          [items, copyNoteImage, editor, sharedObj],
          true,
          "beforeloop"
        );

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
      }

      for (const topItem of items) {
        /*
            Available variables:
            topItem, itemNotes, copyNoteImage, editor
          */

        const itemNotes: Zotero.Item[] = topItem.isNote()
          ? []
          : (Zotero.Items.get(topItem.getNotes()) as Zotero.Item[]);

        renderredTemplate =
          await this._Addon.TemplateController.renderTemplateAsync(
            message.content.params.templateName,
            "topItem, itemNotes, copyNoteImage, editor, sharedObj",
            [topItem, itemNotes, copyNoteImage, editor, sharedObj],
            true,
            "default"
          );

        if (renderredTemplate) {
          newLines.push(renderredTemplate);
          newLines.push("<p> </p>");
        }
      }

      renderredTemplate =
        await this._Addon.TemplateController.renderTemplateAsync(
          message.content.params.templateName,
          "items, copyNoteImage, editor, sharedObj",
          [items, copyNoteImage, editor, sharedObj],
          true,
          "afterloop"
        );

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
      }

      if (newLines) {
        const html = newLines.join("\n");
        if (!targetItem) {
          console.log(html);

          new CopyHelper()
            .addText(html, "text/html")
            .addText(this._Addon.NoteParse.parseHTMLToMD(html), "text/unicode")
            .copy();
          progressWindow.changeHeadline("Template Copied");
        } else {
          const forceMetadata = toCopyImage.length > 0;
          console.log(toCopyImage);
          await this._Addon.NoteUtils.addLineToNote(
            targetItem,
            html,
            -1,
            forceMetadata
          );
          await Zotero.DB.executeTransaction(async () => {
            for (const subNote of toCopyImage) {
              await Zotero.Notes.copyEmbeddedImages(subNote, targetItem);
            }
          });
          progressWindow.changeHeadline("Running Template Finished");
        }
      } else {
        progressWindow.changeHeadline("Running Template Failed");
      }
      progressWindow.startCloseTimer(5000);
    } else if (message.type === "editTemplate") {
      /*
        message.content = {}
      */
      this._Addon.TemplateWindow.openEditor();
    } else if (message.type === "export") {
      /*
        message.content = {
          editorInstance?, params?: {item}
        }
      */
      let item = message.content.editorInstance
        ? message.content.editorInstance._item
        : message.content.params.item;

      if (!item) {
        item = this._Addon.WorkspaceWindow.getWorkspaceNote();
      }
      // If this note is in sync list, open sync window
      if (this._Addon.SyncController.getSyncNoteIds().includes(item.id)) {
        const io = {
          dataIn: item,
          dataOut: {} as any,
          deferred: Zotero.Promise.defer(),
        };

        (window as unknown as XUL.XULWindow).openDialog(
          "chrome://Knowledge4Zotero/content/sync.xul",
          "",
          "chrome,centerscreen,width=500,height=200",
          io
        );
        await io.deferred.promise;
        if (!io.dataOut.export) {
          return;
        }
      }
      const io = {
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XUL.XULWindow).openDialog(
        "chrome://Knowledge4Zotero/content/export.xul",
        "",
        "chrome,centerscreen,width=400,height=400,resizable=yes",
        io
      );
      await io.deferred.promise;

      const options = io.dataOut as any;
      if (!options) {
        return;
      }
      if (options.exportFile && options.exportSingleFile) {
        await this._Addon.NoteExport.exportNotesToMDFiles(
          [item],
          false,
          options.exportAutoSync
        );
      } else {
        await this._Addon.NoteExport.exportNote(item, options);
      }
    } else if (message.type === "exportNotes") {
      /*
        message.content = {}
      */
      const items = ZoteroPane.getSelectedItems();
      const noteItems: Zotero.Item[] = [];
      items.forEach((item) => {
        if (item.isNote()) {
          noteItems.push(item);
        }
        if (item.isRegularItem()) {
          noteItems.splice(
            0,
            0,
            ...(Zotero.Items.get(item.getNotes()) as Zotero.Item[])
          );
        }
      });
      if (noteItems.length === 0) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "No standalone/item note selected."
        );
      } else if (noteItems.length === 1) {
        this.onEditorEvent(
          new EditorMessage("export", { params: { item: noteItems[0] } })
        );
      } else {
        const useSingleFile = confirm("Export linked notes to markdown files?");
        await this._Addon.NoteExport.exportNotesToMDFiles(
          noteItems,
          !useSingleFile
        );
      }
    } else if (message.type === "sync") {
      /*
        message.content = {
          editorInstance
        }
      */
      const note = this._Addon.WorkspaceWindow.getWorkspaceNote();
      if (this._Addon.SyncController.isSyncNote(note)) {
        this._Addon.SyncController.doSync([note], true, false);
      } else {
        await this._Addon.NoteExport.exportNotesToMDFiles([note], false, true);
      }
    } else if (message.type === "openAttachment") {
      /*
        message.content = {
          editorInstance
        }
      */
      const editor = message.content.editorInstance as Zotero.EditorInstance;
      const note = editor._item;
      if (note.parentItem) {
        const attachment = await note.parentItem.getBestAttachment();
        Zotero.debug(attachment);
        if (!attachment) {
          return;
        }
        try {
          Zotero.debug("Launching PDF without page number");
          let zp = Zotero.getActiveZoteroPane();
          if (zp) {
            zp.viewAttachment([attachment.id]);
          }
          Zotero.Notifier.trigger("open", "file", attachment.id);
        } catch (e) {
          Zotero.debug("Knowledge4Zotero: Open attachment failed:");
          Zotero.debug(attachment);
          this._Addon.ZoteroViews.showProgressWindow(
            "Better Notes",
            "Error occurred on opening attachemnts.",
            "fail"
          );
        }
      }
    } else if (message.type === "setOCREngine") {
      /*
        message.content = {
          params: { engine: string }
        }
      */
      const engine = message.content.params.engine;
      if (engine === "mathpix") {
        Zotero.Prefs.set(
          "Knowledge4Zotero.OCRMathpix.Appid",
          prompt(
            "Please input app_id",
            Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appid") as string
          )
        );
        Zotero.Prefs.set(
          "Knowledge4Zotero.OCRMathpix.Appkey",
          prompt(
            "Please input app_key",
            Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appkey") as string
          )
        );
      } else if (engine === "xunfei") {
        Zotero.Prefs.set(
          "Knowledge4Zotero.OCRXunfei.APPID",
          prompt(
            "Please input APPID",
            Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APPID") as string
          )
        );
        Zotero.Prefs.set(
          "Knowledge4Zotero.OCRXunfei.APISecret",
          prompt(
            "Please input APISecret",
            Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APISecret") as string
          )
        );
        Zotero.Prefs.set(
          "Knowledge4Zotero.OCRXunfei.APIKey",
          prompt(
            "Please input APIKey",
            Zotero.Prefs.get("Knowledge4Zotero.OCRXunfei.APIKey") as string
          )
        );
      }
      Zotero.Prefs.set("Knowledge4Zotero.OCREngine", engine);
    } else if (message.type == "convertMD") {
      /*
        message.content = {}
      */
      const source = Zotero.Utilities.Internal.getClipboard("text/unicode");
      if (!source) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "No MarkDown found."
        );
        return;
      }
      const html = this._Addon.NoteParse.parseMDToHTML(source);
      console.log(source, html);
      new CopyHelper().addText(html, "text/html").copy();

      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        "Converted MarkDown is updated to the clipboard. You can paste them in the note."
      );
    } else if (message.type == "convertAsciiDoc") {
      /*
        message.content = {}
      */
      const source = Zotero.Utilities.Internal.getClipboard("text/unicode");
      if (!source) {
        this._Addon.ZoteroViews.showProgressWindow(
          "Better Notes",
          "No AsciiDoc found."
        );
        return;
      }
      const html = this._Addon.NoteParse.parseAsciiDocToHTML(source);
      console.log(source, html);
      new CopyHelper().addText(html, "text/html").copy();

      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        "Converted AsciiDoc is updated to the clipboard. You can paste them in the note."
      );
    } else {
      Zotero.debug(`Knowledge4Zotero: message not handled.`);
    }
  }
}

export default ZoteroEvents;
