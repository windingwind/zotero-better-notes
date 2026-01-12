import { PatchHelper, wait } from "zotero-plugin-toolkit";
import { ICONS } from "../../utils/config";
import type { OutlinePane } from "../../elements/workspace/outlinePane";

export function patchNoteEditorCE(win: _ZoteroTypes.MainWindow) {
  const NoteEditorProto =
    win.document.createXULElement("note-editor").constructor.prototype;

  new PatchHelper().setData({
    target: NoteEditorProto,
    // @ts-ignore
    funcSign: "setBottomPlaceholderHeight",
    patcher: (origin) =>
      // @ts-ignore
      function (height: number | null = null) {
        // @ts-ignore
        const noteEditor = this as any;
        ztoolkit.log("patched setBottomPlaceholderHeight", noteEditor);

        if (!noteEditor.tabID) {
          // @ts-ignore
          return origin.apply(this, [height]);
        }

        const tabContent = noteEditor.closest("tab-content");

        const sideBarState = win.Zotero_Tabs.getSidebarState("note");

        if (!noteEditor._bnPatched) {
          noteEditor._bnPatched = true;
          const box = noteEditor.querySelector("box");
          box.classList.add("bn-note-editor-box");
          box.style.width = "100%";
          // Adjust when toolbar changes
          box.style.minWidth = "328px";
          noteEditor.style.height = "100%";

          const hbox = win.document.createXULElement("hbox") as XULBoxElement;
          hbox.setAttribute("id", "bn-note-editor-tab-container");
          hbox.style.height = "100%";

          const outlineContainer = win.document.createXULElement(
            "bn-outline",
          ) as OutlinePane;
          outlineContainer.setAttribute("id", "bn-outline-container");
          outlineContainer.setAttribute(
            "collapsed",
            sideBarState.open ? "false" : "true",
          );
          outlineContainer.style.width = `${sideBarState.width}px`;

          const splitter = win.document.createXULElement(
            "splitter",
          ) as XULSplitterElement;
          splitter.setAttribute("id", "bn-outline-splitter");
          splitter.setAttribute("collapse", "before");

          const splitterHandler = () => {
            const width = outlineContainer.getBoundingClientRect().width;
            tabContent.sidebarWidth = width;
            win.Zotero_Tabs.updateSidebarLayout({ width });
            win.ZoteroContextPane.update();
          };
          splitter.addEventListener("command", splitterHandler);
          splitter.addEventListener("mousemove", splitterHandler);

          hbox.appendChild(outlineContainer);
          hbox.appendChild(splitter);
          hbox.appendChild(box);

          noteEditor.appendChild(hbox);

          box.querySelector("#editor-view").docShell.windowDraggingAllowed =
            true;

          wait
            .waitUntilAsync(() => noteEditor._editorInstance)
            .then(() => {
              const editor =
                noteEditor._editorInstance as Zotero.EditorInstance;

              outlineContainer.item = noteEditor.item;
              outlineContainer._editorElement = noteEditor;
              outlineContainer.render();

              const _document = editor._iframeWindow.document;
              const toolbar = _document.querySelector(
                ".toolbar",
              ) as HTMLDivElement;

              // TODO: move to editor code
              const toggleOutline = ztoolkit.UI.createElement(
                _document,
                "button",
                {
                  classList: ["toolbar-button"],
                  properties: {
                    innerHTML: ICONS.workspaceToggle,
                    title: "Toggle left pane",
                  },
                  listeners: [
                    {
                      type: "click",
                      listener: (e) => {
                        const willOpen =
                          outlineContainer.getAttribute("collapsed") === "true";
                        outlineContainer.setAttribute(
                          "collapsed",
                          willOpen ? "false" : "true",
                        );
                        tabContent.sidebarOpen = willOpen;

                        win.Zotero_Tabs.updateSidebarLayout({
                          width: willOpen,
                        });
                        win.ZoteroContextPane.update();
                      },
                    },
                  ],
                },
              );

              requestIdleCallback(() =>
                toolbar.querySelector(".start")?.prepend(toggleOutline),
              );
            });
        }

        const box = noteEditor.querySelector(
          ".bn-note-editor-box",
        ) as XULBoxElement;
        noteEditor._bottomPlaceholder = height;
        if (typeof height !== "number") {
          height = 0;
        }
        box.style.height = `calc(100% - ${height}px)`;
        noteEditor.setToggleContextPaneButtonMode();
      },
    enabled: true,
  });
}
