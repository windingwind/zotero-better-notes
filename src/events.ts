import Knowledge4Zotero from "./addon";
import { CopyHelper, EditorMessage } from "./base";
import AddonBase from "./module";

class AddonEvents extends AddonBase {
  notifierCallback: any;
  notifierCbkDict: any;
  // Important!
  // Due to unknown reasons, the DOMParser constructor fails after the tab is opened.
  // We restore it from the preserved object constructor.
  // We init this object when the addon is initialized for later use.
  // See src/knowledge.ts
  _DOMParser: DOMParser;
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
            this._Addon.views.updateOutline();
            this._Addon.views.updateWordCount();
          }
          // Check Note Sync
          const syncIds = this._Addon.sync.getSyncNoteIds();
          if (ids.filter((id) => syncIds.includes(id)).length > 0) {
            this._Addon.sync.setSync();
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
          Zotero.debug("Knowledge4Zotero: buildReaderAnnotationButton");
          this.onEditorEvent(
            new EditorMessage("buildReaderAnnotationButton", {})
          );
        }
        if (event == "add" && type == "tab") {
          if (ids[0] === this._Addon.knowledge.workspaceTabId) {
            const tabItem = document.querySelector(`.tab[data-id=${ids[0]}]`);
            const tabTitle = tabItem && tabItem.querySelector(".tab-name");
            tabTitle &&
              (tabTitle.innerHTML = `${this._Addon.views.editorIcon.tabIcon}${tabTitle.innerHTML}`);
          }
        }
        if (event == "select" && type == "tab") {
          if (extraData[ids[0]].type == "betternotes") {
            let t = 0;
            await this._Addon.knowledge.waitWorkspaceReady();
            while (
              !(await this._Addon.knowledge.getWorkspaceEditorInstance(
                "main",
                false
              )) &&
              t < 100
            ) {
              t += 1;
              this._Addon.knowledge.setWorkspaceNote("main", undefined, false);
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
            this._Addon.views.switchRealMenuBar(false);
            this._Addon.views.switchKey(false);
            this._Addon.views.updateWordCount();
          } else {
            this._Addon.views.switchRealMenuBar(true);
            this._Addon.views.switchKey(true);
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
            this._Addon.knowledge.getNoteTreeAsList();
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
                  new EditorMessage("addToKnowledgeLine", {
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
    this._DOMParser = new DOMParser();
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
    this._Addon.views.addOpenWorkspaceButton();
    this._Addon.views.addNewKnowledgeButton();

    if (!Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
      this.onEditorEvent(new EditorMessage("openUserGuide", {}));
    }
    this.resetState();

    this.initWorkspaceTab();
    this._Addon.views.keppDefaultMenuOrder();
    this._Addon.views.switchRealMenuBar(true);
    this._Addon.views.switchKey(true);

    this.initItemSelectListener();

    // Set a init sync
    this._Addon.sync.setSync();
  }

  private initProxyHandler() {
    const openNoteExtension = {
      noContent: true,
      doAction: async (uri: any) => {
        let message = {
          type: "onNoteLink",
          content: {
            params: await this._Addon.knowledge.getNoteFromLink(uri.spec),
          },
        };
        await this._Addon.events.onEditorEvent(message);
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
            await this._Addon.knowledge.openWorkspaceWindow(
              "tab",
              false,
              false
            );
            break;
          } catch (e) {
            this._Addon.views.showProgressWindow(
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

  public addEditorInstanceListener() {
    if (!Zotero.Notes._knowledgeInit) {
      Zotero.Notes._knowledgeInit = true;
      Zotero.Notes._registerEditorInstance =
        Zotero.Notes.registerEditorInstance;
      Zotero.Notes.registerEditorInstance = (
        instance: Zotero.EditorInstance
      ) => {
        Zotero.Notes._registerEditorInstance(instance);
        this.onEditorEvent(
          new EditorMessage("addNoteInstance", {
            editorInstance: instance,
          })
        );
      };
    }
  }

  public async addEditorEventListener(
    instance: Zotero.EditorInstance,
    event: string,
    message: EditorMessage
  ) {
    await instance._initPromise;
    let editorElement: Element = this._Addon.views.getEditorElement(
      instance._iframeWindow.document
    );
    editorElement.addEventListener(event, (e) => {
      message.content.event = e as XUL.XULEvent;
      message.content.editorInstance = instance;
      this.onEditorEvent(message);
    });
  }

  public async addEditorDocumentEventListener(
    instance: Zotero.EditorInstance,
    event: string,
    message: EditorMessage
  ) {
    await instance._initPromise;
    let doc: Document = instance._iframeWindow.document;

    doc.addEventListener(event, (e) => {
      message.content.event = e as XUL.XULEvent;
      message.content.editorInstance = instance;
      this.onEditorEvent(message);
    });
  }

  addNotifyListener(name: string, cbk: Function) {
    this.notifierCbkDict[name] = cbk;
  }

  removeNotifyListener(name: string) {
    delete this.notifierCbkDict[name];
  }

  public async onEditorEvent(message: EditorMessage) {
    Zotero.debug(`Knowledge4Zotero: onEditorEvent\n${message.type}`);
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
        await this._Addon.knowledge.openWorkspaceWindow("window", true);
      } else {
        await this._Addon.knowledge.openWorkspaceWindow();
      }
    } else if (message.type === "openWorkspaceInWindow") {
      /*
        message.content = {}
      */
      await this._Addon.knowledge.openWorkspaceWindow("window", true);
    } else if (message.type === "closeWorkspace") {
      /*
        message.content = {}
      */
      this._Addon.knowledge.closeWorkspaceWindow();
    } else if (message.type === "createWorkspace") {
      /*
        message.content = {}
      */
      const currentCollection = ZoteroPane_Local.getSelectedCollection();
      if (!currentCollection) {
        this._Addon.views.showProgressWindow(
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
        new EditorMessage("setMainKnowledge", {
          params: { itemID: noteID, enableConfirm: false, enableOpen: true },
        })
      );
      await this._Addon.knowledge.openWorkspaceWindow();
    } else if (message.type === "selectMainKnowledge") {
      /*
        message.content = {}
      */
      const io = {
        // Not working
        singleSelection: true,
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XUL.XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut as unknown as number[];
      if (ids.length === 0) {
        this._Addon.views.showProgressWindow("Knowledge", "No note selected.");
        return;
      } else if (ids.length > 1) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Please select a note item."
        );
        return;
      }

      const note = Zotero.Items.get(ids[0]) as Zotero.Item;
      if (note && note.isNote()) {
        this.onEditorEvent(
          new EditorMessage("setMainKnowledge", {
            params: { itemID: note.id, enableConfirm: false, enableOpen: true },
          })
        );
      } else {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Not a valid note item."
        );
      }
    } else if (message.type === "setMainKnowledge") {
      /*
        message.content = {
          params: {itemID, enableConfirm, enableOpen}
        }
      */
      Zotero.debug("Knowledge4Zotero: setMainKnowledge");
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID") as string
      );
      let itemID = message.content.params.itemID;
      const item = Zotero.Items.get(itemID) as Zotero.Item;
      if (itemID === mainKnowledgeID) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Already a main Note."
        );
        return;
      } else if (!item.isNote()) {
        this._Addon.views.showProgressWindow(
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
          await this._Addon.knowledge.openWorkspaceWindow();
        }
        await this._Addon.knowledge.setWorkspaceNote("main", item);
      }
    } else if (message.type === "addNoteInstance") {
      /*
        message.content = {
          editorInstance, params: {noStyle: boolean}
        }
      */
      const editor = message.content.editorInstance as Zotero.EditorInstance;
      await editor._initPromise;

      editor._knowledgeUIInitialized = false;

      const currentID = editor._item.id;
      const noteItem = editor._item;
      // item.getNote may not be initialized yet
      if (Zotero.ItemTypes.getID("note") !== noteItem.itemTypeID) {
        return;
      }

      // Check if this is a window for print
      const isPrint = this._Addon.knowledge._pdfNoteId === currentID;

      const mainNoteID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID") as string
      );
      const isMainNote = currentID === mainNoteID;
      const isPreviewNote = currentID === this._Addon.knowledge.previewItemID;

      Zotero.debug(`Knowledge4Zotero: main Knowledge`);
      const setMainNoteDropDown: Element =
        await this._Addon.views.addEditorButton(
          editor,
          "knowledge-start",
          isMainNote
            ? "isMainKnowledge"
            : isPreviewNote
            ? "openAttachment"
            : "notMainKnowledge",
          isMainNote
            ? "Edit the Main Note in Workspace"
            : isPreviewNote
            ? "Open Note Attachments"
            : "Open Workspace",
          isPreviewNote ? "openAttachment" : "openWorkspace",
          "start"
        );

      if (setMainNoteDropDown) {
        setMainNoteDropDown.classList.add("more-dropdown");
        setMainNoteDropDown.addEventListener("mouseover", async (e) => {
          if (setMainNoteDropDown.getElementsByClassName("popup").length > 0) {
            return;
          }
          const recentIds = (
            Zotero.Prefs.get("Knowledge4Zotero.recentMainNoteIds") as string
          ).split(",");
          // Add current note
          recentIds.splice(0, 0, String(currentID));
          // Remove main note and duplicate notes
          const recentMainNotes = Zotero.Items.get(
            new Array(
              ...new Set(
                recentIds.filter(
                  (id) =>
                    Number(id) !==
                    parseInt(
                      Zotero.Prefs.get(
                        "Knowledge4Zotero.mainKnowledgeID"
                      ) as string
                    )
                )
              )
            )
          ) as Zotero.Item[];
          const buttons = recentMainNotes.map((item) => {
            return {
              id: `knowledge-setmainnote-popup-${item.id}`,
              rank: 0,
              text: item.getNoteTitle(),
              eventType: "setRecentMainNote",
            };
          });
          const popup: Element = await this._Addon.views.addEditorPopup(
            editor,
            "knowledge-setmainnote-popup",
            buttons,
            setMainNoteDropDown,
            "left"
          );
          const titleNode = _window.document.createElement("div");
          titleNode.innerHTML = "Recent Main Notes";
          titleNode.style.textAlign = "center";
          popup.childNodes[0].before(
            titleNode,
            _window.document.createElement("hr")
          );
          setMainNoteDropDown.addEventListener("mouseleave", (e) => {
            popup.remove();
          });
          setMainNoteDropDown.addEventListener("click", (e) => {
            popup.remove();
          });
        });
      }
      const addLinkDropDown: Element = await this._Addon.views.addEditorButton(
        editor,
        "knowledge-addlink",
        "addToKnowledge",
        "Add Link of Current Note to Main Note",
        "addToKnowledge",
        "middle"
      );
      if (addLinkDropDown) {
        addLinkDropDown.classList.add("more-dropdown");
        // If the editor initialization fails, the addLinkDropDown does not exist
        if (isMainNote) {
          // This is a main knowledge, hide all buttons except the export button and add title
          addLinkDropDown.innerHTML = "";
          const header = editor._iframeWindow.document.createElement("div");
          header.setAttribute("title", "This is a Main Note");
          header.innerHTML = "Main Note";
          header.setAttribute("style", "font-size: medium");
          addLinkDropDown.append(header);
        } else {
          const normalHintText =
            "Insert at the end of section.\nHold shift to insert before section.";
          const shiftHintText =
            "Insert before section.\nRelease shift to insert at the end of section.";
          addLinkDropDown.addEventListener(
            "mouseover",
            async (e: KeyboardEvent) => {
              if (addLinkDropDown.getElementsByClassName("popup").length > 0) {
                return;
              }
              let isShift = e.shiftKey;
              const hintWindow = this._Addon.views.showProgressWindow(
                "Bi-directional Link",
                isShift ? shiftHintText : normalHintText,
                "default",
                // Disable auto close
                -1
              );

              const getButtonParams = () => {
                const buttonParam: any[] = [];
                for (let node of nodes) {
                  buttonParam.push({
                    id: `knowledge-addlink-popup-${
                      isShift ? node.model.lineIndex - 1 : node.model.endIndex
                    }`,
                    text: node.model.name,
                    rank: node.model.rank,
                    eventType: "addToKnowledgeLine",
                  });
                }
                return buttonParam;
              };

              const nodes = this._Addon.knowledge.getNoteTreeAsList(undefined);
              const buttonParam = getButtonParams();
              const popup: HTMLElement = await this._Addon.views.addEditorPopup(
                editor,
                "knowledge-addlink-popup",
                // [{ id: ''; icon: string; eventType: string }],
                buttonParam,
                addLinkDropDown
              );
              popup.style.backgroundColor = isShift ? "#f0f9fe" : "";
              const leaveAction = (e?) => {
                ob?.disconnect();
                popup?.remove();
                hintWindow?.close();
                addLinkDropDown?.removeEventListener("mouseleave", leaveAction);
                addLinkDropDown?.removeEventListener("click", leaveAction);
                editor._iframeWindow.document?.removeEventListener(
                  "keydown",
                  keyAction
                );
                editor._iframeWindow.document?.removeEventListener(
                  "keyup",
                  keyAction
                );
              };
              addLinkDropDown.addEventListener("mouseleave", leaveAction);
              addLinkDropDown.addEventListener("click", leaveAction);
              // Observe the popup remove triggered by button click
              const ob = new MutationObserver((e) => {
                console.log(e);
                if (e[0].removedNodes) {
                  leaveAction();
                }
              });
              ob.observe(addLinkDropDown, { childList: true });
              const keyAction = (e: KeyboardEvent) => {
                if (isShift === e.shiftKey) {
                  return;
                }
                isShift = e.shiftKey;
                console.log(hintWindow);
                popup.style.backgroundColor = isShift ? "#f0f9fe" : "";
                this._Addon.views.changeProgressWindowDescription(
                  hintWindow,
                  isShift ? shiftHintText : normalHintText
                );
                const buttonParam = getButtonParams();
                for (const i in popup.children) {
                  popup.children[i].id = buttonParam[i].id;
                }
              };
              editor._iframeWindow.document.addEventListener(
                "keydown",
                keyAction
              );
              editor._iframeWindow.document.addEventListener(
                "keyup",
                keyAction
              );
            }
          );
        }
      }

      const addCitationButton = await this._Addon.views.addEditorButton(
        editor,
        "knowledge-addcitation",
        "addCitation",
        "Insert Citations",
        "addCitation",
        "middle",
        "builtin"
      );

      let topItem = noteItem.parentItem;
      while (topItem && !topItem.isRegularItem()) {
        topItem = topItem.parentItem;
      }
      if (addCitationButton) {
        addCitationButton.classList.add("more-dropdown");
        if (topItem) {
          addCitationButton.addEventListener("mouseover", async (e) => {
            if (addCitationButton.getElementsByClassName("popup").length > 0) {
              return;
            }
            const popup: Element = await this._Addon.views.addEditorPopup(
              editor,
              "knowledge-addcitation-popup",
              [
                {
                  id: `knowledge-addcitation-popup-${topItem.id}`,
                  rank: 0,
                  text: topItem.getField("title"),
                  eventType: "insertCitation",
                },
              ],
              addCitationButton
            );
            addCitationButton.addEventListener("mouseleave", (e) => {
              popup.remove();
            });
            addCitationButton.addEventListener("click", (e) => {
              popup.remove();
            });
          });
        }

        addCitationButton.addEventListener("click", async (e) => {
          this.onEditorEvent(
            new EditorMessage("insertCitation", {
              params: {
                noteItem: noteItem,
              },
            })
          );
        });
      }

      await this._Addon.views.addEditorButton(
        editor,
        "knowledge-end",
        isPreviewNote ? "close" : "export",
        isPreviewNote ? "Close Preview" : "Export with linked notes",
        isPreviewNote ? "closePreview" : "export",
        "end"
      );
      if (!editor._knowledgeSelectionInitialized) {
        this.addEditorDocumentEventListener(
          editor,
          "selectionchange",
          new EditorMessage("noteEditorSelectionChange", {})
        );
        editor._knowledgeSelectionInitialized = true;
      }

      const _window = editor._iframeWindow;
      // Title style only for normal window
      if (!isPrint) {
        const style = _window.document.createElement("style");
        style.innerHTML = `
          .primary-editor h1::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Ctitle%3E%E6%9C%AA%E6%A0%87%E9%A2%98-1%3C%2Ftitle%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M12.29%2C16.8H11.14V12.33H6.07V16.8H4.92V7H6.07v4.3h5.07V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M18.05%2C16.8H16.93V8.41a4%2C4%2C0%2C0%2C1-.9.53%2C6.52%2C6.52%2C0%2C0%2C1-1.14.44l-.32-1a8.2%2C8.2%2C0%2C0%2C0%2C1.67-.67%2C6.31%2C6.31%2C0%2C0%2C0%2C1.39-1h.42Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h2::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22a%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22a%22%20d%3D%22M14.14%2C16.8v-.48a4.1%2C4.1%2C0%2C0%2C1%2C.14-1.11%2C2.86%2C2.86%2C0%2C0%2C1%2C.45-.91%2C5.49%2C5.49%2C0%2C0%2C1%2C.83-.86c.33-.29.75-.61%2C1.24-1a7.43%2C7.43%2C0%2C0%2C0%2C.9-.73%2C3.9%2C3.9%2C0%2C0%2C0%2C.57-.7%2C2.22%2C2.22%2C0%2C0%2C0%2C.3-.66%2C2.87%2C2.87%2C0%2C0%2C0%2C.11-.77%2C1.89%2C1.89%2C0%2C0%2C0-.47-1.32%2C1.66%2C1.66%2C0%2C0%2C0-1.28-.5A3.17%2C3.17%2C0%2C0%2C0%2C15.7%2C8a3.49%2C3.49%2C0%2C0%2C0-1.08.76l-.68-.65a4.26%2C4.26%2C0%2C0%2C1%2C1.39-1A4%2C4%2C0%2C0%2C1%2C17%2C6.84a2.62%2C2.62%2C0%2C0%2C1%2C2.83%2C2.67%2C3.58%2C3.58%2C0%2C0%2C1-.15%2C1%2C3.09%2C3.09%2C0%2C0%2C1-.41.9%2C5.53%2C5.53%2C0%2C0%2C1-.67.81%2C9%2C9%2C0%2C0%2C1-.95.79c-.46.32-.84.59-1.13.82a4.68%2C4.68%2C0%2C0%2C0-.71.64%2C2%2C2%2C0%2C0%2C0-.38.6%2C2.08%2C2.08%2C0%2C0%2C0-.11.69h4.88v1Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22a%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h3::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M14%2C16.14l.51-.8a4.75%2C4.75%2C0%2C0%2C0%2C1.1.52%2C4.27%2C4.27%2C0%2C0%2C0%2C1.12.16%2C2.29%2C2.29%2C0%2C0%2C0%2C1.64-.52A1.77%2C1.77%2C0%2C0%2C0%2C19%2C14.17a1.7%2C1.7%2C0%2C0%2C0-.68-1.48%2C3.6%2C3.6%2C0%2C0%2C0-2.06-.48H15.4v-1h.77A3%2C3%2C0%2C0%2C0%2C18%2C10.81a1.65%2C1.65%2C0%2C0%2C0%2C.6-1.41%2C1.47%2C1.47%2C0%2C0%2C0-.47-1.19A1.67%2C1.67%2C0%2C0%2C0%2C17%2C7.79a3.33%2C3.33%2C0%2C0%2C0-2.08.73l-.59-.75a4.4%2C4.4%2C0%2C0%2C1%2C1.28-.71A4.35%2C4.35%2C0%2C0%2C1%2C17%2C6.84a2.84%2C2.84%2C0%2C0%2C1%2C2%2C.65%2C2.21%2C2.21%2C0%2C0%2C1%2C.74%2C1.78%2C2.35%2C2.35%2C0%2C0%2C1-.49%2C1.5%2C2.7%2C2.7%2C0%2C0%2C1-1.46.89v0a2.74%2C2.74%2C0%2C0%2C1%2C1.65.74%2C2.15%2C2.15%2C0%2C0%2C1%2C.66%2C1.65%2C2.64%2C2.64%2C0%2C0%2C1-.9%2C2.12%2C3.44%2C3.44%2C0%2C0%2C1-2.34.78%2C5.3%2C5.3%2C0%2C0%2C1-1.48-.2A5%2C5%2C0%2C0%2C1%2C14%2C16.14Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h4::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M19.43%2C6.92v6.59h1.05v1.05H19.43V16.9H18.31V14.56H13.66v-1c.43-.49.87-1%2C1.31-1.57s.87-1.13%2C1.27-1.7S17%2C9.14%2C17.36%2C8.57a16.51%2C16.51%2C0%2C0%2C0%2C.86-1.65Zm-4.49%2C6.59h3.37V8.63c-.34.61-.67%2C1.15-1%2C1.63s-.6.91-.87%2C1.3-.56.74-.81%2C1Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h5::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M14%2C16l.58-.76a3.67%2C3.67%2C0%2C0%2C0%2C1%2C.58A3.44%2C3.44%2C0%2C0%2C0%2C16.8%2C16a2.17%2C2.17%2C0%2C0%2C0%2C1.58-.6A2%2C2%2C0%2C0%2C0%2C19%2C13.88a1.85%2C1.85%2C0%2C0%2C0-.64-1.5%2C2.83%2C2.83%2C0%2C0%2C0-1.86-.54c-.27%2C0-.55%2C0-.86%2C0s-.58%2C0-.81.06L15.17%2C7H19.7V8H16.14l-.2%2C2.88.47%2C0h.43a3.5%2C3.5%2C0%2C0%2C1%2C2.43.79%2C2.74%2C2.74%2C0%2C0%2C1%2C.88%2C2.16%2C3%2C3%2C0%2C0%2C1-.94%2C2.3%2C3.41%2C3.41%2C0%2C0%2C1-2.4.87%2C4.45%2C4.45%2C0%2C0%2C1-1.5-.24A4.81%2C4.81%2C0%2C0%2C1%2C14%2C16Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h6::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M20.18%2C13.7a3.24%2C3.24%2C0%2C0%2C1-.88%2C2.38%2C2.94%2C2.94%2C0%2C0%2C1-2.2.9%2C2.69%2C2.69%2C0%2C0%2C1-2.31-1.17A5.59%2C5.59%2C0%2C0%2C1%2C14%2C12.49a12.18%2C12.18%2C0%2C0%2C1%2C.2-2.14%2C5.16%2C5.16%2C0%2C0%2C1%2C.84-2A3.65%2C3.65%2C0%2C0%2C1%2C16.27%2C7.2%2C3.71%2C3.71%2C0%2C0%2C1%2C18%2C6.84%2C3.14%2C3.14%2C0%2C0%2C1%2C19%2C7a3.59%2C3.59%2C0%2C0%2C1%2C1%2C.5l-.56.77a2.3%2C2.3%2C0%2C0%2C0-1.49-.48A2.3%2C2.3%2C0%2C0%2C0%2C16.79%2C8a3%2C3%2C0%2C0%2C0-.92.85%2C3.79%2C3.79%2C0%2C0%2C0-.56%2C1.25%2C6.56%2C6.56%2C0%2C0%2C0-.19%2C1.65h0a2.61%2C2.61%2C0%2C0%2C1%2C1-.84%2C2.91%2C2.91%2C0%2C0%2C1%2C1.23-.28%2C2.63%2C2.63%2C0%2C0%2C1%2C2%2C.85A3.09%2C3.09%2C0%2C0%2C1%2C20.18%2C13.7ZM19%2C13.78a2.28%2C2.28%2C0%2C0%2C0-.5-1.62%2C1.67%2C1.67%2C0%2C0%2C0-1.29-.54%2C2%2C2%2C0%2C0%2C0-1.5.58%2C2%2C2%2C0%2C0%2C0-.56%2C1.4%2C2.65%2C2.65%2C0%2C0%2C0%2C.55%2C1.74%2C1.85%2C1.85%2C0%2C0%2C0%2C2.78.1A2.38%2C2.38%2C0%2C0%2C0%2C19%2C13.78Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor > p, .primary-editor h1, .primary-editor h2, .primary-editor h3, .primary-editor h4, .primary-editor h5, .primary-editor h6, .primary-editor pre, .primary-editor blockquote, .primary-editor table, .primary-editor ul, .primary-editor ol, .primary-editor hr{
            max-width: unset
          }
        `;
        _window.document.body.append(style);
      }

      if (!_window.document.getElementById("betternotes-script")) {
        const messageScript = _window.document.createElement("script");
        messageScript.id = "betternotes-script";
        messageScript.innerHTML = `
          window.addEventListener('message', async (e)=>{
            if(e.data.type === "exportPDF"){
              console.log("exportPDF");
              const container = document.getElementById("editor-container");
              container.style.display = "none";

              const fullPageStyle = document.createElement("style");
              fullPageStyle.innerHTML =
                "@page { margin: 0; } @media print{ body { height : auto; -webkit-print-color-adjust: exact; color-adjust: exact; }}";
              document.body.append(fullPageStyle);

              let t = 0;
              let imageFlag = false;
              while(!imageFlag && t < 500){
                await new Promise(function (resolve) {
                  setTimeout(resolve, 10);
                });
                imageFlag = !Array.prototype.find.call(document.querySelectorAll('img'), e=>(!e.getAttribute('src') || e.style.display === 'none'));
                t += 1;
              }

              const editNode = document.querySelector(".primary-editor");
              const printNode = editNode.cloneNode(true);
              printNode.style.padding = "20px";
              document.body.append(printNode);

              let printFlag = false;
              window.onafterprint = (e) => {
                console.log('Print Dialog Closed..');
                printFlag = true;
                document.title = "Printed";
              };
              window.onmouseover = (e) => {
                if (printFlag) {
                  document.title = "Printed";
                  printNode.remove();
                  container.style.removeProperty('display');
                }
              };
              document.title = printNode.firstChild.innerText;
              console.log(document.title);
              window.print();
            }
          }, false)
        `;
        _window.document.head.append(messageScript);
      }

      if (isPrint) {
        editor._iframeWindow.postMessage({ type: "exportPDF" }, "*");
        this._Addon.knowledge._pdfNoteId = -1;
        return;
      }

      const moreDropdown: HTMLElement = Array.prototype.filter.call(
        _window.document.querySelectorAll(".more-dropdown"),
        (e) => !e.id.includes("knowledge")
      )[0];
      if (!moreDropdown.getAttribute("ob")) {
        moreDropdown.setAttribute("ob", "true");
        const dropdownOb = new MutationObserver((e) => {
          if (
            e[0].addedNodes.length &&
            (e[0].addedNodes[0] as HTMLElement).classList.contains("popup")
          ) {
            const dropdownPopup = moreDropdown.querySelector(".popup");
            if (dropdownPopup) {
              const refreshButton = _window.document.createElement("button");
              refreshButton.classList.add("option");
              refreshButton.innerText = "Refresh Editor";
              refreshButton.addEventListener("click", (e) => {
                editor.init({
                  item: editor._item,
                  viewMode: editor._viewMode,
                  readOnly: editor._readOnly,
                  disableUI: editor._disableUI,
                  onReturn: editor._onReturn,
                  iframeWindow: editor._iframeWindow,
                  popup: editor._popup,
                  state: editor._state,
                });
              });
              const previewButton = _window.document.createElement("button");
              previewButton.classList.add("option");
              previewButton.innerText = "Preview in Workspace";
              previewButton.addEventListener("click", (e) => {
                this._Addon.knowledge.setWorkspaceNote("preview", editor._item);
              });
              const copyLinkButton = _window.document.createElement("button");
              copyLinkButton.classList.add("option");
              copyLinkButton.innerText = "Copy Note Link";
              copyLinkButton.addEventListener("click", (e) => {
                const link = this._Addon.knowledge.getNoteLink(noteItem);
                const linkTemplate = this._Addon.template.renderTemplate(
                  "[QuickInsert]",
                  "link, subNoteItem, noteItem",
                  [link, noteItem, noteItem]
                );
                new CopyHelper()
                  .addText(link, "text/unicode")
                  .addText(linkTemplate, "text/html")
                  .copy();
                this._Addon.views.showProgressWindow(
                  "Better Notes",
                  "Note Link Copied"
                );
              });

              const copyLinkAtLineButton =
                _window.document.createElement("button");
              copyLinkAtLineButton.classList.add("option");
              copyLinkAtLineButton.innerText = "Copy Note Link of Current Line";
              copyLinkAtLineButton.addEventListener("click", (e) => {
                const link = this._Addon.knowledge.getNoteLink(noteItem, {
                  withLine: true,
                });
                const linkTemplate = this._Addon.template.renderTemplate(
                  "[QuickInsert]",
                  "link, subNoteItem, noteItem",
                  [link, noteItem, noteItem]
                );
                new CopyHelper()
                  .addText(link, "text/unicode")
                  .addText(linkTemplate, "text/html")
                  .copy();
                this._Addon.views.showProgressWindow(
                  "Better Notes",
                  `Note Link of Line ${
                    this._Addon.knowledge.currentLine[noteItem.id] + 1
                  } Copied`
                );
              });
              dropdownPopup.append(
                previewButton,
                refreshButton,
                copyLinkButton,
                copyLinkAtLineButton
              );
            }
          }
        });
        dropdownOb.observe(moreDropdown, { childList: true });
      }

      editor._knowledgeUIInitialized = true;
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
        const io = {
          // Not working
          singleSelection: false,
          dataIn: null,
          dataOut: null,
          deferred: Zotero.Promise.defer(),
        };

        (window as unknown as XUL.XULWindow).openDialog(
          "chrome://zotero/content/selectItemsDialog.xul",
          "",
          "chrome,dialog=no,centerscreen,resizable=yes",
          io
        );
        await io.deferred.promise;

        const ids = io.dataOut as unknown as number[];
        topItems = (Zotero.Items.get(ids) as Zotero.Item[]).filter(
          (item: Zotero.Item) => item.isRegularItem()
        );
        if (topItems.length === 0) {
          return;
        }
      }
      let format = this._Addon.template.getCitationStyle();
      const cite = Zotero.QuickCopy.getContentFromItems(
        topItems,
        format,
        null,
        0
      );
      this._Addon.knowledge.addLineToNote(noteItem, cite.html, -1);
      this._Addon.views.showProgressWindow(
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
      await this._Addon.knowledge.setWorkspaceNote(
        "main",
        Zotero.Items.get(
          message.content.event.target.id.split("-").pop()
        ) as Zotero.Item
      );
    } else if (message.type === "addToKnowledge") {
      /*
        message.content = {
          editorInstance
        }
      */
      Zotero.debug("Knowledge4Zotero: addToKnowledge");
      this._Addon.knowledge.addLinkToNote(
        undefined,
        (message.content.editorInstance as Zotero.EditorInstance)._item,
        // -1 for automatically insert to current selected line or end of note
        -1,
        ""
      );
    } else if (message.type === "addToKnowledgeLine") {
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
      Zotero.debug("Knowledge4Zotero: addToKnowledgeLine");
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

      this._Addon.knowledge.addLinkToNote(
        undefined,
        message.content.params?.itemID
          ? Zotero.Items.get(message.content.params.itemID)
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

      const html = await this._Addon.knowledge.addAnnotationsToNote(
        undefined,
        annotations,
        currentLine
      );
      if (!useLineIndex) {
        currentLine =
          this._Addon.knowledge.currentLine[
            this._Addon.knowledge.getWorkspaceNote().id
          ];
        currentLine = currentLine >= 0 ? currentLine : -1;

        if (currentLine >= 0) {
          // Compute annotation lines length
          const temp = document.createElementNS(
            "http://www.w3.org/1999/xhtml",
            "div"
          );
          temp.innerHTML = html;
          const elementList = this._Addon.parse.parseHTMLElements(temp);
          // Move cursor foward
          this._Addon.knowledge.currentLine[
            this._Addon.knowledge.getWorkspaceNote().id
          ] += elementList.length;
        }
      }
      this._Addon.views.showProgressWindow(
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
        await this._Addon.knowledge.getWorkspaceEditorInstance();
      // Set node id
      this._Addon.knowledge.currentNodeID = parseInt(message.content.params.id);
      this._Addon.views.updateEditCommand();
      this._Addon.views.scrollToLine(
        editorInstance,
        // Scroll to line
        message.content.params.lineIndex
      );
    } else if (message.type === "moveNode") {
      /*
        message.content = {
          params: {
            fromID, toID, moveType: "before" | "child"
          }
        }
      */
      let tree = this._Addon.knowledge.getNoteTree();
      let fromNode = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        message.content.params.fromID,
        tree
      );
      let toNode = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        message.content.params.toID,
        tree
      );
      Zotero.debug(fromNode.model);
      Zotero.debug(toNode.model);
      Zotero.debug(message.content.params.moveType);
      this._Addon.knowledge.moveHeaderLineInNote(
        undefined,
        fromNode,
        toNode,
        message.content.params.moveType
      );
    } else if (message.type === "closePreview") {
      /*
        message.content = {
          editorInstance
        }
      */
      const _window = this._Addon.knowledge.getWorkspaceWindow() as Window;
      const splitter = _window.document.getElementById("preview-splitter");
      splitter && splitter.setAttribute("state", "collapsed");
    } else if (message.type === "onNoteLink") {
      /*
        message.content = {
          params: {
            item: Zotero.Item | boolean,
            infoText: string
            args: {}
          }
        }
      */
      if (!message.content.params.item) {
        Zotero.debug(`Knowledge4Zotero: ${message.content.params.infoText}`);
      }
      Zotero.debug(
        `Knowledge4Zotero: onNoteLink ${message.content.params.item.id}`
      );
      // Copy and save
      const oldEditors = Zotero.Notes._editorInstances.map(
        (e): string => e.instanceID
      );
      let _window = this._Addon.knowledge.getWorkspaceWindow();
      if (_window) {
        if (
          message.content.params.item.id !==
          Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
        ) {
          this._Addon.knowledge.setWorkspaceNote(
            "preview",
            message.content.params.item
          );
        }
        this._Addon.knowledge.openWorkspaceWindow();
      } else {
        ZoteroPane.openNoteWindow(message.content.params.item.id);
      }
      if (message.content.params.args.line) {
        let t = 0;
        let newEditors = Zotero.Notes._editorInstances.filter(
          (e) => !oldEditors.includes(e.instanceID) && e._knowledgeUIInitialized
        );
        while (newEditors.length === 0 && t < 500) {
          t += 1;
          await Zotero.Promise.delay(10);
          newEditors = Zotero.Notes._editorInstances.filter(
            (e) => !oldEditors.includes(e.instanceID)
          );
        }
        newEditors.forEach((e) => {
          this._Addon.views.scrollToLine(
            e,
            // Scroll to line
            message.content.params.args.line
          );
        });
      }
    } else if (message.type === "noteEditorSelectionChange") {
      const editor = message.content.editorInstance as Zotero.EditorInstance;

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
        currentLineIndex += this._Addon.parse.parseListElements(e).length - 1;
      }

      // Find list index if current line is inside a list
      if (diveTagNames.includes(focusNode.tagName)) {
        const eleList = this._Addon.parse.parseListElements(focusNode);
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
      this._Addon.knowledge.currentLine[editor._item.id] = currentLineIndex;
      if (realElement.tagName === "A") {
        let link = (realElement as HTMLLinkElement).href;
        let linkedNote = (await this._Addon.knowledge.getNoteFromLink(link))
          .item;
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
          await this._Addon.views.updateEditorPopupButtons(
            editor._iframeWindow,
            link
          );
        } else {
          await this._Addon.views.updateEditorPopupButtons(
            editor._iframeWindow,
            undefined
          );
        }
      }
    } else if (message.type === "addHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      const text = prompt(`Enter new heading to Insert:`);
      this._Addon.knowledge.openWorkspaceWindow();
      if (text && text.trim()) {
        if (this._Addon.knowledge.currentNodeID < 0) {
          // Add a new H1
          this._Addon.knowledge.addLineToNote(
            undefined,
            `<h1>${text}</h1>`,
            -1
          );
          return;
        }
        let node = this._Addon.knowledge.getNoteTreeNodeById(
          undefined,
          this._Addon.knowledge.currentNodeID
        );
        this._Addon.knowledge.addLineToNote(
          undefined,
          `<h${node.model.rank}>${text}</h${node.model.rank}>`,
          node.model.endIndex
        );
      }
    } else if (message.type === "indentHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      if (this._Addon.knowledge.currentNodeID < 0) {
        return;
      }
      let node = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        this._Addon.knowledge.currentNodeID
      );
      if (node.model.rank === 7) {
        return;
      }
      if (node.model.rank === 6) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Cannot decrease a level 6 Heading."
        );
        return;
      }
      this._Addon.knowledge.changeHeadingLineInNote(
        undefined,
        1,
        node.model.lineIndex
      );
    } else if (message.type === "unindentHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      if (this._Addon.knowledge.currentNodeID < 0) {
        return;
      }
      let node = this._Addon.knowledge.getNoteTreeNodeById(
        undefined,
        this._Addon.knowledge.currentNodeID
      );
      if (node.model.rank === 7) {
        return;
      }
      if (node.model.rank === 1) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "Cannot raise a level 1 Heading."
        );
        return;
      }
      this._Addon.knowledge.changeHeadingLineInNote(
        undefined,
        -1,
        node.model.lineIndex
      );
    } else if (message.type === "updateAutoAnnotation") {
      /*
        message.content = {
          editorInstance
        }
      */
      let autoAnnotation = Zotero.Prefs.get("Knowledge4Zotero.autoAnnotation");
      autoAnnotation = !autoAnnotation;
      Zotero.Prefs.set("Knowledge4Zotero.autoAnnotation", autoAnnotation);
      this._Addon.views.updateAutoInsertAnnotationsMenu();
    } else if (message.type === "insertNotes") {
      /*
        message.content = {}
      */
      const io = {
        // Not working
        singleSelection: true,
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XUL.XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut as unknown as number[];
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
        const linkURL = this._Addon.knowledge.getNoteLink(note);
        const linkText = note.getNoteTitle().trim();
        newLines.push(
          `<p><a href="${linkURL}">${linkText ? linkText : linkURL}</a></p>`
        );
        newLines.push("<p> </p>");
      }
      await this._Addon.knowledge.addLineToNote(
        undefined,
        newLines.join("\n"),
        -1
      );
    } else if (message.type === "insertTextUsingTemplate") {
      /*
        message.content = {
          params: {templateName, copy}
        }
      */
      const newLines: string[] = [];

      const progressWindow = this._Addon.views.showProgressWindow(
        "Running Template",
        message.content.params.templateName,
        "default",
        -1
      );
      const renderredTemplate = (await this._Addon.template.renderTemplateAsync(
        message.content.params.templateName
      )) as string;

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
        const html = newLines.join("\n");
        if (message.content.params.copy) {
          console.log(html);
          new CopyHelper()
            .addText(html, "text/html")
            .addText(this._Addon.parse.parseHTMLToMD(html), "text/unicode")
            .copy();
          progressWindow.changeHeadline("Template Copied");
        } else {
          // End of line
          await this._Addon.knowledge.addLineToNote(undefined, html, -1, false);
          progressWindow.changeHeadline("Running Template Finished");
        }
      } else {
        progressWindow.changeHeadline("Running Template Failed");
      }
      progressWindow.startCloseTimer(5000);
    } else if (message.type === "insertItemUsingTemplate") {
      /*
        message.content = {
          params: {templateName}
        }
      */
      const io = {
        // Not working
        singleSelection: true,
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XUL.XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut as unknown as number[];
      const items = (Zotero.Items.get(ids) as Zotero.Item[]).filter(
        (item: Zotero.Item) => item.isRegularItem()
      );
      if (items.length === 0) {
        return;
      }
      const progressWindow = this._Addon.views.showProgressWindow(
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

      const editor = await this._Addon.knowledge.getWorkspaceEditorInstance(
        "main",
        false
      );

      const sharedObj = {};

      let renderredTemplate = await this._Addon.template.renderTemplateAsync(
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

        const itemNotes: Zotero.Item[] = Zotero.Items.get(
          topItem.getNotes()
        ) as Zotero.Item[];

        renderredTemplate = await this._Addon.template.renderTemplateAsync(
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

      renderredTemplate = await this._Addon.template.renderTemplateAsync(
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
        if (message.content.params.copy) {
          console.log(html);

          new CopyHelper()
            .addText(html, "text/html")
            .addText(this._Addon.parse.parseHTMLToMD(html), "text/unicode")
            .copy();
          progressWindow.changeHeadline("Template Copied");
        } else {
          const forceMetadata = toCopyImage.length > 0;
          console.log(toCopyImage);
          await this._Addon.knowledge.addLineToNote(
            undefined,
            html,
            -1,
            forceMetadata
          );
          const mainNote = this._Addon.knowledge.getWorkspaceNote();
          await Zotero.DB.executeTransaction(async () => {
            for (const subNote of toCopyImage) {
              await Zotero.Notes.copyEmbeddedImages(subNote, mainNote);
            }
          });
          progressWindow.changeHeadline("Running Template Finished");
        }
      } else {
        progressWindow.changeHeadline("Running Template Failed");
      }
      progressWindow.startCloseTimer(5000);
    } else if (message.type === "insertNoteUsingTemplate") {
      /*
        message.content = {
          params: {templateName}
        }
      */
      const io = {
        // Not working
        singleSelection: true,
        dataIn: null,
        dataOut: null,
        deferred: Zotero.Promise.defer(),
      };

      (window as unknown as XUL.XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut as unknown as number[];
      const notes = (Zotero.Items.get(ids) as Zotero.Item[]).filter(
        (item: Zotero.Item) => item.isNote()
      );
      if (notes.length === 0) {
        return;
      }
      const progressWindow = this._Addon.views.showProgressWindow(
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

      const editor = await this._Addon.knowledge.getWorkspaceEditorInstance(
        "main",
        false
      );
      const sharedObj = {};

      let renderredTemplate = await this._Addon.template.renderTemplateAsync(
        message.content.params.templateName,
        "notes, copyNoteImage, editor, sharedObj",
        [notes, copyNoteImage, editor, sharedObj],
        true,
        "beforeloop"
      );

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
      }

      for (const noteItem of notes) {
        /*
          Available variables:
          noteItem, topItem, link, copyNoteImage, editor
        */
        let topItem = noteItem.parentItem;
        while (topItem && !topItem.isRegularItem()) {
          topItem = topItem.parentItem;
        }
        const linkURL = this._Addon.knowledge.getNoteLink(noteItem);
        const linkText = noteItem.getNoteTitle().trim();
        const link = `<p><a href="${linkURL}">${
          linkText ? linkText : linkURL
        }</a></p>`;

        renderredTemplate = await this._Addon.template.renderTemplateAsync(
          message.content.params.templateName,
          "noteItem, topItem, link, copyNoteImage, editor, sharedObj",
          [noteItem, topItem, link, copyNoteImage, editor, sharedObj],
          true,
          "default"
        );

        if (renderredTemplate) {
          newLines.push(renderredTemplate);
          newLines.push("<p> </p>");
        }
      }

      renderredTemplate = await this._Addon.template.renderTemplateAsync(
        message.content.params.templateName,
        "notes, copyNoteImage, editor, sharedObj",
        [notes, copyNoteImage, editor, sharedObj],
        true,
        "afterloop"
      );

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
      }

      if (newLines) {
        const html = newLines.join("\n");
        if (message.content.params.copy) {
          console.log(html);

          new CopyHelper()
            .addText(html, "text/html")
            .addText(this._Addon.parse.parseHTMLToMD(html), "text/unicode")
            .copy();
          progressWindow.changeHeadline("Template Copied");
        } else {
          const forceMetadata = toCopyImage.length > 0;
          console.log(toCopyImage);
          await this._Addon.knowledge.addLineToNote(
            undefined,
            html,
            -1,
            forceMetadata
          );
          const mainNote = this._Addon.knowledge.getWorkspaceNote();
          await Zotero.DB.executeTransaction(async () => {
            for (const subNote of toCopyImage) {
              await Zotero.Notes.copyEmbeddedImages(subNote, mainNote);
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
      this._Addon.template.openEditor();
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
        item = this._Addon.knowledge.getWorkspaceNote();
      }
      // If this note is in sync list, open sync window
      if (this._Addon.sync.getSyncNoteIds().includes(item.id)) {
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
        await this._Addon.knowledge.exportNotesToFile(
          [item],
          false,
          options.exportAutoSync
        );
      } else {
        await this._Addon.knowledge.exportNoteToFile(
          item,
          options.embedLink,
          options.exportFile,
          options.exportNote,
          options.exportCopy,
          options.exportPDF
        );
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
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "No standalone/item note selected."
        );
      } else if (noteItems.length === 1) {
        this.onEditorEvent(
          new EditorMessage("export", { params: { item: noteItems[0] } })
        );
      } else {
        const useSingleFile = confirm("Export linked notes to markdown files?");
        await this._Addon.knowledge.exportNotesToFile(
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
      const note = this._Addon.knowledge.getWorkspaceNote();
      if (this._Addon.sync.isSyncNote(note)) {
        this._Addon.sync.doSync([note], true, false);
      } else {
        await this._Addon.knowledge.exportNotesToFile([note], false, true);
      }
    } else if (message.type === "openAttachment") {
      /*
        message.content = {
          editorInstance
        }
      */
      const editor = message.content.editorInstance as Zotero.EditorInstance;
      const note = editor._item;
      let successCount = 0;
      let failCount = 0;
      if (note.parentItem) {
        for (const attchment of (
          Zotero.Items.get(note.parentItem.getAttachments()) as Zotero.Item[]
        ).filter((item: Zotero.Item) => {
          return item.isPDFAttachment();
        })) {
          Zotero.debug(attchment);
          try {
            Zotero.debug("Launching PDF without page number");
            let zp = Zotero.getActiveZoteroPane();
            if (zp) {
              zp.viewAttachment([attchment.id]);
            }
            Zotero.Notifier.trigger("open", "file", attchment.id);
            successCount += 1;
          } catch (e) {
            Zotero.debug("Knowledge4Zotero: Open attachment failed:");
            Zotero.debug(attchment);
            failCount += 1;
          }
        }
      }
      if (successCount === 0) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          failCount
            ? "Error occurred on opening attachemnts."
            : "No attachment found.",
          "fail"
        );
      }
    } else if (message.type === "buildReaderAnnotationButton") {
      /*
        message.content = {}
      */
      for (const reader of Zotero.Reader._readers) {
        Zotero.debug("reader found");
        let t = 0;
        while (
          t < 100 &&
          !(await this._Addon.views.addReaderAnnotationButton(reader))
        ) {
          await Zotero.Promise.delay(50);
          t += 1;
        }
      }
    } else if (message.type === "addAnnotationNote") {
      /*
        message.content = {
          params: { annotationItem }
        }
      */
      const annotationItem: Zotero.Item = message.content.params.annotationItem;

      if (annotationItem.annotationComment) {
        const text = annotationItem.annotationComment;
        let link = this._Addon.parse.parseLinkInText(text);

        if (link) {
          const note = (await this._Addon.knowledge.getNoteFromLink(link)).item;
          if (note && note.id) {
            await this.onEditorEvent(
              new EditorMessage("onNoteLink", {
                params: {
                  item: note,
                  infoText: "OK",
                },
              })
            );
            return;
          }
        }
      }

      const note: Zotero.Item = new Zotero.Item("note");
      note.libraryID = annotationItem.libraryID;
      note.parentID = annotationItem.parentItem.parentID;
      await note.saveTx();

      ZoteroPane.openNoteWindow(note.id);
      let editorInstance: Zotero.EditorInstance =
        this._Addon.knowledge.getEditorInstance(note);
      let t = 0;
      // Wait for editor instance
      while (t < 10 && !editorInstance) {
        await Zotero.Promise.delay(500);
        t += 1;
        editorInstance = this._Addon.knowledge.getEditorInstance(note);
      }

      const renderredTemplate = await this._Addon.template.renderTemplateAsync(
        "[QuickNoteV2]",
        "annotationItem, topItem, noteItem",
        [annotationItem, annotationItem.parentItem.parentItem, note]
      );
      await this._Addon.knowledge.addLineToNote(
        note,
        renderredTemplate,
        0,
        "before"
      );

      const tags = annotationItem.getTags();
      for (const tag of tags) {
        note.addTag(tag.tag, tag.type);
      }
      await note.saveTx();

      annotationItem.annotationComment = `${
        annotationItem.annotationComment ? annotationItem.annotationComment : ""
      }\nnote link: "${this._Addon.knowledge.getNoteLink(note)}"`;
      await annotationItem.saveTx();
    } else if (message.type === "copyImageAnnotation") {
      /*
        message.content = {
          params: { src: string }
        }
      */
      new CopyHelper().addImage(message.content.params.src).copy();
      this._Addon.views.showProgressWindow(
        "Better Notes",
        "Image copied to clipboard."
      );
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
      }
      Zotero.Prefs.set("Knowledge4Zotero.OCREngine", engine);
    } else if (message.type === "ocrImageAnnotation") {
      /*
        message.content = {
          params: { src: string, annotationItem: Zotero.Item }
        }
      */
      const annotationItem: Zotero.Item = message.content.params.annotationItem;
      let result: string;
      let success: boolean;
      const engine = Zotero.Prefs.get("Knowledge4Zotero.OCREngine");
      if (engine === "mathpix") {
        const xhr = await Zotero.HTTP.request(
          "POST",
          "https://api.mathpix.com/v3/text",
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              app_id: Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appid"),
              app_key: Zotero.Prefs.get("Knowledge4Zotero.OCRMathpix.Appkey"),
            },
            body: JSON.stringify({
              src: message.content.params.src,
              math_inline_delimiters: ["$", "$"],
              math_display_delimiters: ["$$", "$$"],
              rm_spaces: true,
            }),
            responseType: "json",
          }
        );
        console.log(xhr);
        if (xhr && xhr.status && xhr.status === 200 && xhr.response.text) {
          result = xhr.response.text;
          success = true;
        } else {
          result =
            xhr.status === 200 ? xhr.response.error : `${xhr.status} Error`;
          success = false;
        }
      } else if (engine === "bing") {
        const xhr = await Zotero.HTTP.request(
          "POST",
          "https://www.bing.com/cameraexp/api/v1/getlatex",
          {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: message.content.params.src.split(",").pop(),
              inputForm: "Image",
              clientInfo: { platform: "edge" },
            }),
            responseType: "json",
          }
        );
        if (xhr && xhr.status && xhr.status === 200 && !xhr.response.isError) {
          result = xhr.response.latex
            ? `$${xhr.response.latex}$`
            : xhr.response.ocrText;
          success = true;
        } else {
          result =
            xhr.status === 200
              ? xhr.response.errorMessage
              : `${xhr.status} Error`;
          success = false;
        }
      } else {
        result = "OCR Engine Not Found";
        success = false;
      }
      if (success) {
        annotationItem.annotationComment = `${
          annotationItem.annotationComment
            ? `${annotationItem.annotationComment}\n`
            : ""
        }${result}`;
        await annotationItem.saveTx();
        this._Addon.views.showProgressWindow(
          "Better Notes OCR",
          `OCR Result: ${result}`
        );
      } else {
        this._Addon.views.showProgressWindow(
          "Better Notes OCR",
          result,
          "fail"
        );
      }
    } else if (message.type == "convertMD") {
      /*
        message.content = {}
      */
      const source = Zotero.Utilities.Internal.getClipboard("text/unicode");
      if (!source) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "No MarkDown found."
        );
        return;
      }
      const html = this._Addon.parse.parseMDToHTML(source);
      console.log(source, html);
      new CopyHelper().addText(html, "text/html").copy();

      this._Addon.views.showProgressWindow(
        "Better Notes",
        "Converted MarkDown is updated to the clipboard. You can paste them in the note."
      );
    } else if (message.type == "convertAsciiDoc") {
      /*
        message.content = {}
      */
      const source = Zotero.Utilities.Internal.getClipboard("text/unicode");
      if (!source) {
        this._Addon.views.showProgressWindow(
          "Better Notes",
          "No AsciiDoc found."
        );
        return;
      }
      const html = this._Addon.parse.parseAsciiDocToHTML(source);
      console.log(source, html);
      new CopyHelper().addText(html, "text/html").copy();

      this._Addon.views.showProgressWindow(
        "Better Notes",
        "Converted AsciiDoc is updated to the clipboard. You can paste them in the note."
      );
    } else {
      Zotero.debug(`Knowledge4Zotero: message not handled.`);
    }
  }

  private resetState(): void {
    // Reset preferrence state.
    this._Addon.template.resetTemplates();
    // Initialize citation style
    this._Addon.template.getCitationStyle();
    // Initialize sync notes
    this._Addon.sync.getSyncNoteIds();
    this._Addon.views.updateAutoInsertAnnotationsMenu();
  }
}

export default AddonEvents;
