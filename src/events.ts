import { AddonBase, EditorMessage } from "./base";

class AddonEvents extends AddonBase {
  notifierCallback: object;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<number>,
        extraData: object
      ) => {
        if (event === "modify" && type === "item") {
          if (
            ids.indexOf(Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) >=
            0
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
            Zotero.Items.get(ids).filter((item) => {
              return item.isAnnotation();
            }).length > 0) ||
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
            const tabTitle = document
              .querySelector(`.tab[data-id=${ids[0]}]`)
              .querySelector(".tab-name");
            tabTitle.innerHTML = `${this._Addon.views.editorIcon.tabIcon}${tabTitle.innerHTML}`;
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
              this._Addon.knowledge.setWorkspaceNote();
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
            _tabToolbar.hidden = true;
            _tabCover.hidden = true;
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
          Zotero.Items.get(ids).filter((item) => {
            return item.isAnnotation();
          }).length > 0
        ) {
          Zotero.debug("Knowledge4Zotero: autoAnnotation");
          const annotations = Zotero.Items.get(ids).filter((item) => {
            return item.isAnnotation();
          });
          this.onEditorEvent(
            new EditorMessage("addAnnotationToNote", {
              params: { annotations: annotations },
            })
          );
        }
      },
    };
  }

  public async onInit() {
    Zotero.debug("Knowledge4Zotero: init called");

    this.addEditorInstanceListener();
    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "item",
      "tab",
      "file",
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
    this._Addon.views.switchRealMenuBar(true);
    this._Addon.views.switchKey(true);

    this.initItemSelectListener();

    // Set a init sync
    this._Addon.sync.setSync();
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
      Zotero.Notes.registerEditorInstance = (instance: EditorInstance) => {
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
    instance: EditorInstance,
    event: string,
    message: EditorMessage
  ) {
    await instance._initPromise;
    let editorElement: Element = this._Addon.views.getEditorElement(
      instance._iframeWindow.document
    );
    editorElement.addEventListener(event, (e: XULEvent) => {
      message.content.event = e;
      message.content.editorInstance = instance;
      this.onEditorEvent(message);
    });
  }

  public async addEditorDocumentEventListener(
    instance: EditorInstance,
    event: string,
    message: EditorMessage
  ) {
    await instance._initPromise;
    let doc: Document = instance._iframeWindow.document;

    doc.addEventListener(event, (e: XULEvent) => {
      message.content.event = e;
      message.content.editorInstance = instance;
      this.onEditorEvent(message);
    });
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
      const header = prompt("Enter new note header:");
      const noteID = await ZoteroPane_Local.newNote();
      Zotero.Items.get(noteID).setNote(
        `<div data-schema-version="8"><h1>${header}</h1>\n</div>`
      );
      await this.onEditorEvent(
        new EditorMessage("setMainKnowledge", {
          params: { itemID: noteID },
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

      (window as unknown as XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut;
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

      const note = Zotero.Items.get(ids[0]);
      if (note && note.isNote()) {
        this.onEditorEvent(
          new EditorMessage("setMainKnowledge", {
            params: { itemID: note.id, enableConfirm: false },
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
          params: {itemID, enableConfirm}
        }
      */
      Zotero.debug("Knowledge4Zotero: setMainKnowledge");
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      let itemID = message.content.params.itemID;
      const item = Zotero.Items.get(itemID);
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
        if (Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")) {
          if (message.content.params.enableConfirm) {
            let confirmChange = confirm(
              "Will change current Knowledge Workspace. Confirm?"
            );
            if (!confirmChange) {
              return;
            }
          }
        }
        Zotero.Prefs.set("Knowledge4Zotero.mainKnowledgeID", itemID);
        await this._Addon.knowledge.openWorkspaceWindow();
        await this._Addon.knowledge.setWorkspaceNote("main");
        this._Addon.views.showProgressWindow(
          "Better Notes",
          `Set main Note to: ${item.getNoteTitle()}`
        );
      }
    } else if (message.type === "addNoteInstance") {
      /*
        message.content = {
          editorInstance,
        }
      */
      let mainKnowledgeID = parseInt(
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      );
      await message.content.editorInstance._initPromise;

      message.content.editorInstance._knowledgeUIInitialized = false;

      const noteItem: ZoteroItem = Zotero.Items.get(
        message.content.editorInstance._item.id
      );
      if (!noteItem.isNote()) {
        return;
      }

      let isMainKnowledge =
        message.content.editorInstance._item.id === mainKnowledgeID;

      Zotero.debug(`Knowledge4Zotero: main Knowledge`);
      await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-start",
        isMainKnowledge ? "isMainKnowledge" : "notMainKnowledge",
        isMainKnowledge ? "Edit the Main Note in Workspace" : "Open Workspace",
        "openWorkspace",
        "start"
      );
      const addLinkDropDown: Element = await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-addlink",
        "addToKnowledge",
        "Add Link of Current Note to Main Note",
        "addToKnowledge",
        "middle"
      );
      addLinkDropDown.addEventListener("mouseover", async (e) => {
        if (addLinkDropDown.getElementsByClassName("popup").length > 0) {
          return;
        }
        const buttonParam = [];
        const nodes = this._Addon.knowledge.getNoteTreeAsList(undefined);
        for (let node of nodes) {
          buttonParam.push({
            id: `knowledge-addlink-popup-${node.model.endIndex}`,
            text: node.model.name,
            rank: node.model.rank,
            eventType: "addToKnowledgeLine",
          });
        }
        const popup: Element = await this._Addon.views.addEditorPopup(
          message.content.editorInstance,
          "knowledge-addlink-popup",
          // [{ id: ''; icon: string; eventType: string }],
          buttonParam,
          addLinkDropDown
        );
        addLinkDropDown.addEventListener("mouseleave", (e) => {
          popup.remove();
        });
        addLinkDropDown.addEventListener("click", (e) => {
          popup.remove();
        });
      });

      const addCitationButton = await this._Addon.views.addEditorButton(
        message.content.editorInstance,
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
      if (topItem) {
        addCitationButton.addEventListener("mouseover", async (e) => {
          if (addCitationButton.getElementsByClassName("popup").length > 0) {
            return;
          }
          const popup: Element = await this._Addon.views.addEditorPopup(
            message.content.editorInstance,
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

      await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-switchTex",
        "switchTex",
        `LaTex View    ${Zotero.isWin ? "Ctrl" : "⌘"}+/`,
        "switchEditorTex",
        "middle",
        "builtin"
      );

      message.content.editorInstance._iframeWindow.document.addEventListener(
        "keyup",
        (e) => {
          if (e.ctrlKey && e.key === "/") {
            this.onEditorEvent(
              new EditorMessage("switchEditorTex", {
                editorInstance: message.content.editorInstance,
              })
            );
          }
        }
      );

      await this._Addon.views.addEditorButton(
        message.content.editorInstance,
        "knowledge-end",
        "export",
        "Export with linked notes",
        "export",
        "end"
      );
      if (!message.content.editorInstance._knowledgeSelectionInitialized) {
        this.addEditorDocumentEventListener(
          message.content.editorInstance,
          "selectionchange",
          new EditorMessage("noteEditorSelectionChange", {})
        );
        message.content.editorInstance._knowledgeSelectionInitialized = true;
      }
      // Title indent
      const _window = message.content.editorInstance._iframeWindow;
      const style = _window.document.createElement("style");
      style.innerHTML = `
        h2 {text-indent: 10px}
        h3 {text-indent: 20px}
        h4 {text-indent: 30px}
        h5 {text-indent: 40px}
        h6 {text-indent: 50px}
        .primary-editor > p, .primary-editor h1, .primary-editor h2, .primary-editor h3, .primary-editor h4, .primary-editor h5, .primary-editor h6, .primary-editor pre, .primary-editor blockquote, .primary-editor table, .primary-editor ul, .primary-editor ol, .primary-editor hr{
          max-width: unset
        }
      `;
      _window.document.body.append(style);

      if (!_window.document.getElementById("MathJax-script")) {
        const messageScript = _window.document.createElement("script");
        messageScript.innerHTML = `
          window.addEventListener('message', async (e)=>{
            if(e.data.type === "renderLaTex"){
              console.log("renderLaTex");
              await MathJax.typesetPromise([document.getElementById("texView")])
            } else if(e.data.type === "exportPDF"){
              console.log("exportPDF");
              const container = document.getElementById("editor-container");
              container.style.display = "none";

              const fullPageStyle = document.createElement("style");
              fullPageStyle.innerHTML =
                "@page { margin: 0; } @media print{ body { height : auto}}";
              document.body.append(fullPageStyle);

              let t = 0;
              let imageFlag = false;
              while(!(imageFlag && MathJax.typesetPromise) && t < 500){
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

              await MathJax.typesetPromise([printNode]);
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
          MathJax = {
            tex: {
              inlineMath: [              // start/end delimiter pairs for in-line math
                ['$', '$']
              ],
              displayMath: [             // start/end delimiter pairs for display math
                ['$$', '$$']
              ],
            },
            startup: {
              typeset: false,           // Perform initial typeset?
            }
          };
        `;
        _window.document.head.append(messageScript);

        const mathScript = _window.document.createElement("script");
        mathScript.setAttribute("id", "MathJax-script");
        mathScript.setAttribute(
          "src",
          "chrome://Knowledge4Zotero/content/lib/js/tex-svg.js"
        );
        _window.document.head.append(mathScript);
      }

      message.content.editorInstance._knowledgeUIInitialized = true;

      if (
        this._Addon.knowledge._pdfNoteId ===
        message.content.editorInstance._item.id
      ) {
        message.content.editorInstance._iframeWindow.postMessage(
          { type: "exportPDF" },
          "*"
        );
        this._Addon.knowledge._pdfNoteId = -1;
        return;
      }

      if (
        this._Addon.views._texNotes.includes(
          message.content.editorInstance._item.id
        )
      ) {
        this.onEditorEvent(
          new EditorMessage("switchEditorTex", {
            editorInstance: message.content.editorInstance,
            params: { viewTex: true },
          })
        );
      }
    } else if (message.type === "enterWorkspace") {
      /*
        message.content = {
          editorInstance,
          params: "main" | "preview"
        }
      */
      const _window = message.content.editorInstance._iframeWindow;
      let t = 0;
      while (
        !message.content.editorInstance._knowledgeUIInitialized &&
        t < 500
      ) {
        t += 1;
        await Zotero.Promise.delay(10);
      }
      if (message.content.params === "main") {
        // This is a main knowledge, hide all buttons except the export button and add title
        const middle = _window.document.getElementById(
          "knowledge-tools-middle"
        );
        middle.innerHTML = "";
        const header = _window.document.createElement("div");
        header.setAttribute("title", "This is a Main Note");
        header.innerHTML = "Main Note";
        header.setAttribute("style", "font-size: medium");
        middle.append(header);

        // Link popup listener
        const container =
          _window.document.getElementsByClassName("relative-container")[0];
        const containerObserver = new MutationObserver(async (mutations) => {
          for (const mut of mutations) {
            for (const node of mut.addedNodes) {
              // wait for ui ready
              await Zotero.Promise.delay(20);
              const linkElement = (node as Element).getElementsByTagName(
                "a"
              )[0];
              if (!linkElement) {
                return;
              }
              const linkObserver = new MutationObserver(async (linkMuts) => {
                this._Addon.views.updateEditorPopupButtons(
                  _window,
                  linkElement.getAttribute("href")
                );
              });
              linkObserver.observe(linkElement, { attributes: true });
              this._Addon.views.updateEditorPopupButtons(
                _window,
                linkElement.getAttribute("href")
              );
            }
          }
        });
        containerObserver.observe(container, {
          childList: true,
        });
      } else {
        // This is a preview knowledge, hide openWorkspace button add show close botton
        this._Addon.views.changeEditorButtonView(
          _window.document.getElementById("knowledge-start"),
          "openAttachment",
          "Open Note Attachments",
          "openAttachment"
        );
        this._Addon.views.changeEditorButtonView(
          _window.document.getElementById("knowledge-end"),
          "close",
          "Close Preview",
          "closePreview"
        );
      }
    } else if (message.type === "switchEditorTex") {
      /*
        message.content = {
          editorInstance, params: {viewTex: boolean}
        }
      */
      const instance = message.content.editorInstance;
      let viewTex = false;
      if (message.content.params && message.content.params.viewTex) {
        viewTex = true;
      }
      if (!this._Addon.views._texNotes.includes(instance._item.id) || viewTex) {
        const editorElement =
          instance._iframeWindow.document.getElementsByClassName(
            "primary-editor"
          )[0];
        if (!editorElement) {
          return;
        }
        Zotero.debug("Knowledge4Zotero: latex view on.");
        const viewNode = editorElement.cloneNode(true) as HTMLElement;

        this._Addon.views.switchEditorTexView(instance, true, viewNode);
        this._Addon.views.changeEditorButtonView(
          instance._iframeWindow.document.getElementById("knowledge-switchTex"),
          "switchEditor",
          `Editor View    ${Zotero.isWin ? "Ctrl" : "⌘"}+/`
        );
      } else {
        Zotero.debug("Knowledge4Zotero: latex view off.");
        this._Addon.views.switchEditorTexView(instance, false);
        this._Addon.views.changeEditorButtonView(
          instance._iframeWindow.document.getElementById("knowledge-switchTex"),
          "switchTex",
          `LaTex View    ${Zotero.isWin ? "Ctrl" : "⌘"}+/`
        );
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
      let topItems: ZoteroItem[] = [];
      console.log(message);
      if (message.content.event) {
        const topItemID = Number(
          message.content.event.target.id.split("-").pop()
        );
        topItems = Zotero.Items.get([topItemID]);
      }
      if (!topItems.length) {
        const io = {
          // Not working
          singleSelection: false,
          dataIn: null,
          dataOut: null,
          deferred: Zotero.Promise.defer(),
        };

        (window as unknown as XULWindow).openDialog(
          "chrome://zotero/content/selectItemsDialog.xul",
          "",
          "chrome,dialog=no,centerscreen,resizable=yes",
          io
        );
        await io.deferred.promise;

        const ids = io.dataOut;
        topItems = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
          item.isRegularItem()
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
    } else if (message.type === "addToKnowledge") {
      /*
        message.content = {
          editorInstance
        }
      */
      Zotero.debug("Knowledge4Zotero: addToKnowledge");
      this._Addon.knowledge.addLinkToNote(
        undefined,
        // -1 for automatically insert to current selected line or end of note
        -1,
        message.content.editorInstance._item.id
      );
    } else if (message.type === "addToKnowledgeLine") {
      /*
        message.content = {
          editorInstance,
          event,
          type
        }
      */
      Zotero.debug("Knowledge4Zotero: addToKnowledgeLine");
      Zotero.debug(message.content.event.target.id);
      const idSplit = message.content.event.target.id.split("-");
      const lineIndex = parseInt(idSplit[idSplit.length - 1]);
      this._Addon.knowledge.addLinkToNote(
        undefined,
        lineIndex,
        message.content.editorInstance._item.id
      );
    } else if (message.type === "addAnnotationToNote") {
      /*
        message.content = {
          params: {annotations}
        }
      */
      const annotations = message.content.params.annotations;
      await this._Addon.knowledge.addAnnotationsToNote(
        undefined,
        annotations,
        -1
      );
      this._Addon.views.showProgressWindow(
        "Better Notes",
        `[Auto] Insert Annotation to ${
          this._Addon.knowledge.currentLine >= 0
            ? `line ${this._Addon.knowledge.currentLine} in`
            : "end of"
        } main note`
      );
      // Move cursor foward
      if (this._Addon.knowledge.currentLine >= 0) {
        this._Addon.knowledge.currentLine += annotations.length;
      }
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
      _window.document
        .getElementById("preview-splitter")
        .setAttribute("state", "collapsed");
    } else if (message.type === "onNoteLink") {
      /*
        message.content = {
          params: {
            item: ZoteroItem | boolean,
            infoText: string
          }
        }
      */
      if (!message.content.params.item) {
        Zotero.debug(`Knowledge4Zotero: ${message.content.params.infoText}`);
      }
      Zotero.debug(
        `Knowledge4Zotero: onNoteLink ${message.content.params.item.id}`
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
    } else if (message.type === "noteEditorSelectionChange") {
      if (
        message.content.editorInstance._item.id ===
        Zotero.Prefs.get("Knowledge4Zotero.mainKnowledgeID")
      ) {
        // Update current line index
        let selection =
          message.content.editorInstance._iframeWindow.document.getSelection();
        let focusNode = selection.focusNode as XUL.Element;
        if (!focusNode) {
          return;
        }

        function getChildIndex(node) {
          return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
        }

        // Make sure this is a direct child node of editor
        try {
          while (
            !focusNode.parentElement.className ||
            focusNode.parentElement.className.indexOf("primary-editor") === -1
          ) {
            focusNode = focusNode.parentNode as XUL.Element;
          }
        } catch (e) {
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
            if (
              selection.focusNode.parentElement.parentElement === eleList[i]
            ) {
              currentLineIndex += Number(i);
              break;
            }
          }
        }
        Zotero.debug(`Knowledge4Zotero: line ${currentLineIndex} selected.`);
        console.log(currentLineIndex);
        this._Addon.knowledge.currentLine = currentLineIndex;
      }
    } else if (message.type === "addHeading") {
      /*
        message.content = {
          editorInstance
        }
      */
      const text = prompt(`Enter new heading to Insert:`);
      this._Addon.knowledge.openWorkspaceWindow();
      if (text.trim()) {
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

      (window as unknown as XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut;
      const notes = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
        item.isNote()
      );
      if (notes.length === 0) {
        return;
      }

      const newLines = [];
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
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
    } else if (message.type === "insertTextUsingTemplate") {
      /*
        message.content = {
          params: {templateName}
        }
      */
      const newLines = [];

      const renderredTemplate = await this._Addon.template.renderTemplateAsync(
        message.content.params.templateName
      );

      if (renderredTemplate) {
        newLines.push(renderredTemplate);
        newLines.push("<p> </p>");
        // End of line
        await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
      }
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

      (window as unknown as XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut;
      const items = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
        item.isRegularItem()
      );
      if (items.length === 0) {
        return;
      }

      const newLines = [];
      newLines.push("<p> </p>");

      const toCopyImage = [];

      const copyNoteImage = (noteItem: ZoteroItem) => {
        toCopyImage.push(noteItem);
      };

      const editor = await this._Addon.knowledge.getWorkspaceEditorInstance();

      for (const topItem of items) {
        /*
            Available variables:
            topItem, itemNotes, copyNoteImage
          */

        const itemNotes: ZoteroItem[] = topItem
          .getNotes()
          .map((e) => Zotero.Items.get(e));

        const renderredTemplate =
          await this._Addon.template.renderTemplateAsync(
            message.content.params.templateName,
            "topItem, itemNotes, copyNoteImage, editor",
            [topItem, itemNotes, copyNoteImage, editor]
          );

        if (renderredTemplate) {
          newLines.push(renderredTemplate);
          newLines.push("<p> </p>");
        }
      }
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
      const mainNote = this._Addon.knowledge.getWorkspaceNote();
      await Zotero.DB.executeTransaction(async () => {
        for (const subNote of toCopyImage) {
          await Zotero.Notes.copyEmbeddedImages(subNote, mainNote);
        }
      });
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

      (window as unknown as XULWindow).openDialog(
        "chrome://zotero/content/selectItemsDialog.xul",
        "",
        "chrome,dialog=no,centerscreen,resizable=yes",
        io
      );
      await io.deferred.promise;

      const ids = io.dataOut;
      const notes = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
        item.isNote()
      );
      if (notes.length === 0) {
        return;
      }

      const newLines = [];
      newLines.push("<p> </p>");

      for (const noteItem of notes) {
        /*
          Available variables:
          noteItem, topItem, link
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

        const renderredTemplate =
          await this._Addon.template.renderTemplateAsync(
            message.content.params.templateName,
            "noteItem, topItem, link",
            [noteItem, topItem, link]
          );

        if (renderredTemplate) {
          newLines.push(renderredTemplate);
          newLines.push("<p> </p>");
        }
      }
      await this._Addon.knowledge.addLinesToNote(undefined, newLines, -1);
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

        (window as unknown as XULWindow).openDialog(
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

      (window as unknown as XULWindow).openDialog(
        "chrome://Knowledge4Zotero/content/export.xul",
        "",
        "chrome,centerscreen,width=400,height=400",
        io
      );
      await io.deferred.promise;

      const options = io.dataOut;
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
      const noteItems = [];
      items.forEach((item) => {
        if (item.isNote()) {
          noteItems.push(item);
        }
        if (item.isRegularItem()) {
          noteItems.splice(0, 0, Zotero.Items.get(item.getNotes()));
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
      const note = message.content.editorInstance._item;
      let successCount = 0;
      let failCount = 0;
      if (note.parentItem) {
        for (const attchment of Zotero.Items.get(
          note.parentItem.getAttachments()
        ).filter((item: ZoteroItem) => {
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
          params: { annotations: Reader JSON type, annotationItem }
        }
      */
      const annotations = message.content.params.annotations;
      const annotationItem: ZoteroItem = message.content.params.annotationItem;

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

      const note: ZoteroItem = new Zotero.Item("note");
      note.libraryID = annotationItem.libraryID;
      note.parentID = annotationItem.parentItem.parentID;

      const renderredTemplate = await this._Addon.template.renderTemplateAsync(
        "[QuickNote]",
        "annotationItem, topItem",
        [annotationItem, annotationItem.parentItem.parentItem]
      );

      note.setNote(`<div data-schema-version="8">${renderredTemplate}\n</div>`);

      const tags = annotationItem.getTags();
      for (const tag of tags) {
        note.addTag(tag.tag, tag.type);
      }
      await note.saveTx();

      ZoteroPane.openNoteWindow(note.id);
      let t = 0;
      while (t < 100 && !ZoteroPane.findNoteWindow(note.id)) {
        await Zotero.Promise.delay(50);
        t += 1;
      }
      const _window = ZoteroPane.findNoteWindow(note.id);

      const noteEditor = _window.document.getElementById("zotero-note-editor");

      t = 0;
      while (
        (!noteEditor.getCurrentInstance || !noteEditor.getCurrentInstance()) &&
        t < 500
      ) {
        t += 1;
        await Zotero.Promise.delay(10);
      }
      const editorInstance = noteEditor.getCurrentInstance();
      editorInstance.focus();
      await editorInstance.insertAnnotations(annotations);

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
      var image = message.content.params.src;

      var io = Components.classes[
        "@mozilla.org/network/io-service;1"
      ].getService(Components.interfaces.nsIIOService);
      var channel = io.newChannel(image, null, null);
      var input = channel.open();
      var imgTools = Components.classes[
        "@mozilla.org/image/tools;1"
      ].getService(Components.interfaces.imgITools);

      var buffer = NetUtil.readInputStreamToString(input, input.available());
      var container = imgTools.decodeImageFromBuffer(
        buffer,
        buffer.length,
        channel.contentType
      );

      var trans = Components.classes[
        "@mozilla.org/widget/transferable;1"
      ].createInstance(Components.interfaces.nsITransferable);
      // Add Blob
      trans.addDataFlavor(channel.contentType);
      trans.setTransferData(channel.contentType, container, -1);

      // // Add Text
      // let str = Components.classes[
      //   "@mozilla.org/supports-string;1"
      // ].createInstance(Components.interfaces.nsISupportsString);
      // str.data = text;
      // trans.addDataFlavor("text/unicode");
      // trans.setTransferData("text/unicode", str, text.length * 2);

      // // Add HTML
      // str = Components.classes["@mozilla.org/supports-string;1"].createInstance(
      //   Components.interfaces.nsISupportsString
      // );
      // str.data = html;
      // trans.addDataFlavor("text/html");
      // trans.setTransferData("text/html", str, html.length * 2);

      var clipid = Components.interfaces.nsIClipboard;
      var clip =
        Components.classes["@mozilla.org/widget/clipboard;1"].getService(
          clipid
        );
      clip.setData(trans, null, clipid.kGlobalClipboard);
      this._Addon.views.showProgressWindow(
        "Better Notes",
        "Image copied to clipboard."
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
    // Initialize sync period
    // Default sync period is 10s
    if (
      typeof Zotero.Prefs.get("Knowledge4Zotero.syncPeriod") === "undefined"
    ) {
      this._Addon.syncList.changeSyncPeriod(10);
    }
    this._Addon.views.updateAutoInsertAnnotationsMenu();
  }
}

export default AddonEvents;
