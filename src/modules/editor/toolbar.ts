import { config } from "../../../package.json";
import { ICONS } from "../../utils/config";
import {
  copyNoteLink,
  getLineAtCursor,
  getSectionAtCursor,
  insert,
} from "../../utils/editor";
import { getString } from "../../utils/locale";
import { openLinkCreator } from "../../utils/linkCreator";
import { slice } from "../../utils/str";
import { waitUtilAsync } from "../../utils/wait";
import { getWorkspaceUID, getWorkspaceByUID } from "../../utils/workspace";

export async function initEditorToolbar(editor: Zotero.EditorInstance) {
  if (editor._disableUI) {
    return;
  }

  const noteItem = editor._item;

  const _document = editor._iframeWindow.document;
  try {
    await waitUtilAsync(() => !!_document.querySelector(".toolbar"));
  } catch (e) {
    ztoolkit.log("Editor toolbar not found");
  }
  const toolbar = _document.querySelector(".toolbar") as HTMLDivElement;
  if (!toolbar) {
    ztoolkit.log("Editor toolbar not found");
    return;
  }

  if (editor._tabID) {
    const sidebarState =
      Zotero.getMainWindow().Zotero_Tabs.getSidebarState("note");
    registerEditorToolbarElement(
      editor,
      toolbar,
      "start",
      ztoolkit.UI.createElement(_document, "button", {
        classList: ["toolbar-button", "bn-toggle-left-pane"],
        properties: {
          innerHTML: ICONS.workspaceToggle,
          title: "Toggle left pane",
        },
        styles: {
          display: sidebarState.open ? "none" : "inherit",
        },
        listeners: [
          {
            type: "click",
            listener: () => {
              Zotero.Notes.toggleSidebar(true);
            },
          },
        ],
      }),
    );
  }

  const iconNotMainKnowledge = `<svg t="1651124314636" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1689" width="20" height="20" fill="currentColor"><path d="M877.44 383.786667L624.426667 117.333333C594.986667 86.186667 554.88 69.12 512 69.12s-82.986667 17.066667-112.426667 48.213333L146.56 383.786667a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V485.973333c0-38.186667-14.506667-74.453333-40.96-102.186666z m-44.373333 404.266666c0 38.826667-31.573333 70.186667-70.186667 70.186667H261.333333c-38.826667 0-70.186667-31.573333-70.186666-70.186667V485.973333c0-16.213333 6.186667-31.786667 17.28-43.52L461.44 176c13.226667-13.866667 31.146667-21.546667 50.56-21.546667s37.333333 7.68 50.56 21.76l253.013333 266.453334c11.306667 11.733333 17.28 27.306667 17.28 43.52v301.866666z" p-id="1690"></path><path d="M608 687.786667h-192c-23.466667 0-42.666667 19.2-42.666667 42.666666s19.2 42.666667 42.666667 42.666667h192c23.466667 0 42.666667-19.2 42.666667-42.666667s-19.2-42.666667-42.666667-42.666666z" p-id="1691"></path></svg>`;

  const iconAddToNoteEnd = `<svg t="1651124422933" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3269" width="20" height="20" fill="currentColor"><path d="M896.00324 352c70.7 0 128-57.3 128-128 0-70.6-57.4-128-128-128-70.7 0-128 57.3-128 128 0 18.8 4.1 36.7 11.3 52.8 2.7 6 1.4 13.1-3.3 17.8l-24.2 24.2c-5.7 5.7-14.9 6.3-21.2 1.2-38.1-30.1-86.3-48-138.6-48-18.8 0-37.1 2.3-54.6 6.7-6.9 1.7-14.1-1.4-17.7-7.5l-6.6-11.4c-3.4-5.8-2.7-13.1 1.6-18.3 18.6-22.6 29.7-51.6 29.3-83.2C543.10324 89 486.30324 32.6 417.00324 32c-70.6-0.6-128.1 56.1-129 126.3-0.9 69.5 56.5 128.6 126 129.6 9.4 0.1 18.5-0.7 27.4-2.5 6.8-1.4 13.6 1.7 17.1 7.7l2.2 3.8c4 7 2.2 15.9-4.2 20.7-42.4 32.3-73 79.4-84 133.6-1.5 7.4-8.1 12.7-15.7 12.7h-94.1c-6.6 0-12.6-4-14.9-10.2-18.1-48-64.3-82.2-118.5-82.8C58.70324 370.3 0.50324 427.6 0.00324 498.1-0.49676 569.2 57.00324 627 128.00324 627c56.7 0 104.8-36.9 121.6-87.9 2.2-6.6 8.3-11.1 15.2-11.1h92c7.6 0 14.2 5.4 15.7 12.9 9.5 46.7 33.5 88 67 119.2 5.4 5 6.6 13.2 2.9 19.6l-21.7 37.6c-3.7 6.3-11.1 9.4-18.2 7.4-11.1-3.1-22.7-4.7-34.8-4.7-69.7 0.1-127 56.8-127.8 126.6-0.8 71.7 57.4 130 129.1 129.4 69.5-0.6 126.3-57.3 126.9-126.8 0.3-28-8.5-53.9-23.5-75.1-3.6-5.1-3.9-11.8-0.8-17.2l24.9-43.1c3.9-6.7 12-9.7 19.3-7 23.7 8.6 49.3 13.2 76 13.2 34.9 0 67.9-8 97.3-22.2 7.6-3.7 16.7-0.9 20.9 6.4l37 64c-26.3 23.5-43 57.7-43 95.8 0 70.9 58 128.5 128.9 128 69.7-0.5 126.2-56.7 127.1-126.3 0.9-70.1-57-129.3-127.1-129.7-6.2 0-12.3 0.4-18.3 1.2-6.5 0.9-12.8-2.2-16.1-7.8l-39.2-67.9c-3.4-5.9-2.7-13.3 1.7-18.4 34.2-39.3 54.9-90.7 54.9-147 0-38.9-9.9-75.5-27.4-107.4-3.4-6.2-2.2-13.9 2.8-18.9l28.4-28.4c4.9-4.9 12.4-6 18.7-2.9 17.4 8.6 36.9 13.5 57.6 13.5z m0-192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM128.00324 563c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m240 349c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m464-112c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM416.00324 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m289.1 385.1C674.90324 639.4 634.70324 656 592.00324 656s-82.9-16.6-113.1-46.9C448.60324 578.9 432.00324 538.7 432.00324 496s16.6-82.9 46.9-113.1C509.10324 352.6 549.30324 336 592.00324 336s82.9 16.6 113.1 46.9C735.40324 413.1 752.00324 453.3 752.00324 496s-16.6 82.9-46.9 113.1z" p-id="3270"></path></svg>`;

  // --- BEGIN CUSTOM RECENT MAIN NOTES BTN ---
  const recentMainNotesButton = ztoolkit.UI.createElement(_document, "button", {
    classList: ["toolbar-button"],
    properties: {
      innerHTML: iconNotMainKnowledge, // 0.8.8 Set Main Note Icon
      title: "Recent Main Notes",
    },
  }) as HTMLButtonElement;

  registerEditorToolbarElement(editor, toolbar, "start", recentMainNotesButton);

  recentMainNotesButton.addEventListener("mouseover", async () => {
    if (
      recentMainNotesButton.parentElement?.querySelector(
        ".bn-recentnotes-popup",
      )
    )
      return;

    const popup = ztoolkit.UI.createElement(_document, "div", {
      classList: ["popup", "bn-recentnotes-popup"],
      styles: {
        position: "absolute",
        zIndex: "1000",
        minWidth: "200px",
        maxHeight: "400px",
        overflowY: "auto",
        backgroundColor: "var(--color-bg, Canvas)",
        color: "var(--color-text, CanvasText)",
        border: "1px solid var(--border-color, #ccc)",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        padding: "4px 0",
        left: "0",
        top: "100%",
      },
    }) as HTMLDivElement;

    const wrapper = recentMainNotesButton.parentElement!;
    wrapper.style.position = "relative";
    wrapper.appendChild(popup);

    const addMenuItem = (
      text: string,
      callback: () => void,
      isHeader = false,
    ) => {
      const btn = ztoolkit.UI.createElement(_document, "button", {
        classList: ["option"],
        properties: { textContent: text, title: text },
        styles: {
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "4px 12px",
          border: "none",
          background: "none",
          cursor: isHeader ? "default" : "pointer",
          fontSize: "12px",
          color: "inherit",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontWeight: isHeader ? "bold" : "normal",
          opacity: isHeader ? "0.6" : "1",
        },
      });
      if (!isHeader) {
        btn.addEventListener(
          "mouseover",
          () => (btn.style.backgroundColor = "rgba(128, 128, 128, 0.2)"),
        );
        btn.addEventListener(
          "mouseout",
          () => (btn.style.backgroundColor = "transparent"),
        );
        btn.addEventListener("click", () => {
          try {
            popup.remove();
          } catch (e) {}
          callback();
        });
      }
      popup.appendChild(btn);
    };

    const recentPref =
      Zotero.Prefs.get("betternotes.recentMainNoteIds") ||
      Zotero.Prefs.get("Knowledge4Zotero.recentMainNoteIds") ||
      "";
    const recentIds = String(recentPref)
      .split(",")
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id) && id > 0);
    const uniqueIds = Array.from(new Set(recentIds));
    const items = Zotero.Items.get(uniqueIds).filter((i) => i && !i.deleted);

    addMenuItem("📋 Recent Main Notes", () => {}, true);

    if (items.length === 0) {
      addMenuItem("  (No recent main notes)", () => {});
    } else {
      for (const item of items) {
        addMenuItem(`📄 ${item.getNoteTitle() || "Untitled"}`, () => {
          Zotero.Prefs.set("betternotes.mainNoteID", String(item.id));
        });
      }
    }

    const leaveHandler = () => {
      try {
        popup.remove();
      } catch (e) {}
      try {
        wrapper.removeEventListener("mouseleave", leaveHandler);
      } catch (e) {}
    };
    setTimeout(() => {
      try {
        if (popup.parentElement)
          wrapper.addEventListener("mouseleave", leaveHandler);
      } catch (e) {}
    }, 100);
  });
  // --- END CUSTOM RECENT MAIN NOTES BTN ---

  // --- BEGIN CUSTOM ADD LINK / MAIN NOTE BTN ---
  const addLinkButton = ztoolkit.UI.createElement(_document, "button", {
    classList: ["toolbar-button"],
    properties: {
      innerHTML: iconAddToNoteEnd, // 0.8.8 Add Link Icon
      title: "Add link",
    },
  }) as HTMLButtonElement;

  registerEditorToolbarElement(editor, toolbar, "start", addLinkButton);

  addLinkButton.addEventListener("mouseover", async () => {
    // Don't create duplicate popups
    if (addLinkButton.parentElement?.querySelector(".bn-addlink-popup")) return;

    const popup = ztoolkit.UI.createElement(_document, "div", {
      classList: ["popup", "bn-addlink-popup"],
      styles: {
        position: "absolute",
        zIndex: "1000",
        minWidth: "240px",
        maxHeight: "450px",
        overflowY: "auto",
        backgroundColor: "var(--color-bg, Canvas)",
        color: "var(--color-text, CanvasText)",
        border: "1px solid var(--border-color, #ccc)",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        padding: "0",
        left: "0",
        top: "100%",
      },
    }) as HTMLDivElement;

    const wrapper = addLinkButton.parentElement!;
    wrapper.style.position = "relative";
    wrapper.appendChild(popup);

    const renderPopup = async () => {
      popup.innerHTML = "";

      let mainNoteId = 0;
      try {
        mainNoteId =
          parseInt(String(Zotero.Prefs.get("betternotes.mainNoteID"))) || 0;
      } catch (e) {}
      const mainNote = mainNoteId ? Zotero.Items.get(mainNoteId) : null;
      const curPos = String(
        Zotero.Prefs.get("betternotes.insertLinkPosition") || "end",
      );

      // --- HTML Helper (Safer for Zotero 8) ---
      const createEl = (
        tag: string,
        props: any = {},
        styles: any = {},
        listeners: any[] = [],
      ) => {
        const el = ztoolkit.UI.createElement(_document, tag, {
          namespace: ["button", "label", "menu"].includes(tag)
            ? "html"
            : undefined,
          properties: props,
          listeners,
        });
        if (styles && el && (el as any).style) {
          for (const k in styles) {
            (el as any).style[k] = styles[k];
          }
        }
        return el;
      };

      // 1) Status Bar / Preview
      const statusBar = createEl(
        "div",
        { textContent: "📍 Ready to link..." },
        {
          padding: "6px 12px",
          fontSize: "11px",
          backgroundColor: "rgba(128,128,128,0.1)",
          borderBottom: "1px solid rgba(128,128,128,0.2)",
          color: "var(--color-text-muted, #666)",
        },
      );
      popup.appendChild(statusBar);

      const updateStatus = (target: string, pos: string) => {
        statusBar.textContent = `📍 Linking to ${pos.toUpperCase()} of "${target}"`;
        statusBar.style.color = "var(--color-primary, #007bff)";
      };

      const addMenuItem = (
        text: string,
        callback: () => void,
        opts: { style?: any; persistent?: boolean; onHover?: () => void } = {},
      ) => {
        const btn = createEl(
          "button",
          { textContent: text, title: text },
          {
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "4px 12px",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "12px",
            color: "inherit",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            ...(opts.style || {}),
          },
          [
            {
              type: "click",
              listener: () => {
                if (!opts.persistent)
                  try {
                    popup.remove();
                  } catch (e) {}
                callback();
              },
            },
          ],
        );
        btn.addEventListener("mouseover", () => {
          btn.style.backgroundColor = "rgba(128, 128, 128, 0.2)";
          if (opts.onHover) opts.onHover();
        });
        btn.addEventListener(
          "mouseout",
          () => (btn.style.backgroundColor = "transparent"),
        );
        popup.appendChild(btn);
      };

      const addSeparator = () =>
        popup.appendChild(
          createEl(
            "div",
            {},
            {
              height: "1px",
              backgroundColor: "rgba(128, 128, 128, 0.2)",
              margin: "4px 0",
            },
          ),
        );

      // 2) Top Action Button ( respects mode)
      if (mainNote && mainNote.id !== noteItem.id) {
        const actionText =
          curPos === "start"
            ? "🔝 Add link to Start of Main Note"
            : "🔚 Add link to End of Main Note";
        addMenuItem(
          actionText,
          async () => {
            editor.saveSync();
            const currentNoteLink = addon.api.convert.note2link(noteItem, {
              lineIndex: getLineAtCursor(editor),
            });
            const html = `<p dir="ltr"><a href="${currentNoteLink}" rel="noopener noreferrer nofollow">${noteItem.getNoteTitle() || noteItem.id}</a></p>`;

            let idx = curPos === "start" ? 0 : -1;
            // If start mode, try to insert AFTER the first H1 if it exists
            if (curPos === "start") {
              try {
                const nodes = await addon.api.note.getNoteTreeFlattened(
                  mainNote,
                  { keepLink: false },
                );
                if (nodes.length > 0 && nodes[0].model.level === 1) {
                  idx = nodes[0].model.lineIndex + 1; // v19: Safe under H1
                }
              } catch (e) {}
            }

            await addon.api.note.insert(mainNote, html, idx, false);
            const backlink = `\n<p dir="ltr">Referred in <a href="${addon.api.convert.note2link(mainNote, { lineIndex: idx })}">${mainNote.getNoteTitle()} (${curPos === "start" ? "Start" : "End"})</a></p>`;
            insert(editor, backlink);
          },
          {
            style: {
              fontWeight: "bold",
              borderBottom: "1px solid rgba(128,128,128,0.1)",
            },
            onHover: () => updateStatus(mainNote.getNoteTitle(), curPos),
          },
        );
      }

      addMenuItem("🔗 Open Link Creator...", () => {
        editor.saveSync();
        openLinkCreator(noteItem, { lineIndex: getLineAtCursor(editor) });
      });

      if (mainNote && mainNote.isNote() && mainNote.id !== noteItem.id) {
        addSeparator();
        const outlineHeader = createEl(
          "div",
          { textContent: "📋 Main Note Sections" },
          {
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: "bold",
            opacity: "0.6",
          },
        );
        popup.appendChild(outlineHeader);

        try {
          const nodes = await addon.api.note.getNoteTreeFlattened(mainNote, {
            keepLink: false,
          });
          nodes.forEach((node, i) => {
            const indent = "  ".repeat(Math.max(0, node.model.level - 1));
            const name = node.model.name || "Untitled";
            addMenuItem(
              `${indent}${name}`,
              async () => {
                editor.saveSync();
                const link = addon.api.convert.note2link(noteItem, {
                  lineIndex: getLineAtCursor(editor),
                });
                const html = `<p dir="ltr"><a href="${link}" rel="noopener noreferrer nofollow">${noteItem.getNoteTitle()}</a></p>`;

                let idx = 0;
                if (curPos === "start") {
                  idx = node.model.lineIndex + 1; // v19: Immediately after heading line
                } else {
                  // End of section: After the last line of the section
                  idx = node.model.endIndex + 1;
                }

                await addon.api.note.insert(mainNote, html, idx, false);
                const back = `\n<p dir="ltr">Referred in <a href="${addon.api.convert.note2link(mainNote, { sectionName: name })}">${mainNote.getNoteTitle()}/${name}</a></p>`;
                insert(editor, back);
              },
              {
                style: { paddingLeft: `${12 + (node.model.level - 1) * 16}px` },
                onHover: () => updateStatus(name, curPos),
              },
            );
          });
        } catch (e) {
          addMenuItem("  (Error loading headings)", () => {});
        }

        // 3) Bottom Radio Selector (Sticky)
        addSeparator();
        const footer = createEl(
          "div",
          {},
          {
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "rgba(128,128,128,0.05)",
          },
        );
        footer.appendChild(
          createEl(
            "span",
            { textContent: "Insert at:" },
            { fontSize: "11px", fontWeight: "bold" },
          ),
        );

        ["start", "end"].forEach((p) => {
          const label = createEl(
            "label",
            {},
            {
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              cursor: "pointer",
            },
          );
          const radio = createEl("input", {
            type: "radio",
            name: "pos",
            value: p,
            checked: curPos === p,
          }) as HTMLInputElement;
          radio.addEventListener("change", () => {
            Zotero.Prefs.set("betternotes.insertLinkPosition", p);
            renderPopup();
          });
          label.appendChild(radio);
          label.appendChild(
            createEl("span", {
              textContent: p.charAt(0).toUpperCase() + p.slice(1),
            }),
          );
          footer.appendChild(label);
        });
        popup.appendChild(footer);
      } else if (!mainNote && mainNoteId > 0) {
        addMenuItem("⚠ Main Note not found", () =>
          Zotero.Prefs.set("betternotes.mainNoteID", "0"),
        );
      } else if (!mainNote) {
        addMenuItem("ℹ Set a Main Note first.", () => {});
      }
    };

    await renderPopup();

    const leaveHandler = () => {
      popup.remove();
      wrapper.removeEventListener("mouseleave", leaveHandler);
    };
    setTimeout(() => {
      if (popup.parentElement)
        wrapper.addEventListener("mouseleave", leaveHandler);
    }, 100);
  });
  // --- END CUSTOM ADD LINK / MAIN NOTE BTN ---

  const settingsButton = editor._iframeWindow.document.querySelector(
    ".toolbar .end .dropdown .toolbar-button",
  ) as HTMLDivElement;

  const MutationObserver = // @ts-ignore
    editor._iframeWindow.MutationObserver as typeof window.MutationObserver;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(async (mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class" &&
        mutation.target === settingsButton
      ) {
        if (settingsButton.classList.contains("active")) {
          const dropdown = settingsButton.parentElement!;
          const popup = dropdown.querySelector(".popup") as HTMLDivElement;
          ztoolkit.log(popup);
          registerEditorToolbarPopup(editor, popup, await getMenuData(editor));
        }
      }
    });
  });
  observer.observe(settingsButton, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

async function getMenuData(editor: Zotero.EditorInstance) {
  const noteItem = editor._item;

  const currentLine = getLineAtCursor(editor);
  const currentSection = (await getSectionAtCursor(editor)) || "";
  const settingsMenuData: PopupData[] = [
    {
      id: makeId("settings-openAsTab"),
      text: getString("editor-toolbar-settings-openAsTab"),
      callback: (e) => {
        addon.hooks.onOpenNote(noteItem.id, "tab");
      },
    },
    {
      id: makeId("settings-openAsWindow"),
      text: getString("editor-toolbar-settings-openAsWindow"),
      callback: (e) => {
        addon.hooks.onOpenNote(noteItem.id, "window", { forceTakeover: true });
      },
    },
    {
      id: makeId("settings-showInLibrary"),
      text: getString("editor-toolbar-settings-showInLibrary"),
      callback: (e) => {
        Zotero.getMainWindow().ZoteroPane.selectItems([e.editor._item.id]);
      },
    },
  ];

  if (currentLine >= 0) {
    settingsMenuData.push(
      ...(<PopupData[]>[
        {
          type: "splitter",
        },
        {
          id: makeId("settings-export"),
          text: getString("editor-toolbar-settings-export"),
          callback: (e) => {
            if (addon.api.sync.isSyncNote(noteItem.id)) {
              addon.hooks.onShowSyncInfo(noteItem.id);
            } else {
              addon.hooks.onShowExportNoteOptions([noteItem.id]);
            }
          },
        },
        {
          type: "splitter",
        },
        {
          id: makeId("settings-insertTemplate"),
          text: getString("editor-toolbar-settings-insertTemplate"),
          callback: (e) => {
            addon.hooks.onShowTemplatePicker("insert", {
              noteId: e.editor._item.id,
              lineIndex: currentLine,
            });
          },
        },
        {
          id: makeId("settings-refreshTemplates"),
          text: getString("editor-toolbar-settings-refreshTemplates"),
          callback: (e) => {
            addon.hooks.onRefreshTemplatesInNote(e.editor);
          },
        },
        {
          type: "splitter",
        },
        {
          id: makeId("settings-copyLink"),
          text: getString("editor-toolbar-settings-copyLink", {
            args: {
              line: currentLine,
            },
          }),
          callback: (e) => {
            copyNoteLink(e.editor, "line");
          },
        },
        {
          id: makeId("settings-copyLinkAtSection"),
          text: getString("editor-toolbar-settings-copyLinkAtSection", {
            args: {
              section: slice(currentSection, 10),
            },
          }),
          callback: (e) => {
            copyNoteLink(e.editor, "section");
          },
        },
        {
          id: makeId("settings-updateRelatedNotes"),
          text: getString("editor-toolbar-settings-updateRelatedNotes"),
          callback: (e) => {
            addon.api.relation.updateNoteLinkRelation(e.editor._item.id);
          },
        },
      ]),
    );
  }

  const parentAttachment = await noteItem.parentItem?.getBestAttachment();
  if (parentAttachment) {
    settingsMenuData.push(
      ...(<PopupData[]>[
        {
          type: "splitter",
        },
        {
          id: makeId("settings-openParent"),
          text: getString("editor-toolbar-settings-openParent"),
          callback: (e) => {
            Zotero.getMainWindow().ZoteroPane.viewAttachment([
              parentAttachment.id,
            ]);
            Zotero.Notifier.trigger("open", "file", parentAttachment.id);
          },
        },
      ]),
    );
  }

  if (addon.api.sync.isSyncNote(noteItem.id)) {
    settingsMenuData.splice(5, 0, {
      id: makeId("settings-refreshSyncing"),
      text: getString("editor-toolbar-settings-refreshSyncing"),
      callback: (e) => {
        addon.hooks.onSyncing([noteItem], {
          quiet: false,
          skipActive: false,
          reason: "manual-editor",
        });
      },
    });
  }

  return settingsMenuData;
}

declare interface PopupData {
  type?: "item" | "splitter";
  id?: string;
  text?: string;
  prefix?: string;
  suffix?: string;
  callback?: (e: MouseEvent & { editor: Zotero.EditorInstance }) => any;
}

async function registerEditorToolbarPopup(
  editor: Zotero.EditorInstance,
  popup: HTMLDivElement,
  popupLines: PopupData[],
) {
  await editor._initPromise;
  ztoolkit.UI.appendElement(
    {
      tag: "fragment",
      children: popupLines.map((props) => {
        return props.type === "splitter"
          ? {
              tag: "div",
              classList: ["separator"],
              properties: {
                id: props.id,
              },
            }
          : {
              tag: "button",
              classList: ["option"],
              properties: {
                id: props.id,
                innerHTML:
                  slice((props.prefix || "") + props.text, 50) +
                  (props.suffix || ""),
                title: "",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e) => {
                    Object.assign(e, { editor });
                    props.callback &&
                      props.callback(
                        e as any as MouseEvent & {
                          editor: Zotero.EditorInstance;
                        },
                      );
                  },
                },
              ],
            };
      }),
    },
    popup,
  ) as HTMLDivElement;

  popup.style.removeProperty("left");
  popup.style.right = "0px";
}

async function registerEditorToolbarElement(
  editor: Zotero.EditorInstance,
  toolbar: HTMLDivElement,
  position: "start" | "middle" | "end",
  elem: HTMLElement,
  after: boolean = false,
) {
  await editor._initPromise;
  const target = toolbar.querySelector(`.${position}`);
  if (target) {
    if (after) {
      target.append(elem);
    } else {
      target.prepend(elem);
    }
  }
  return elem;
}

function makeId(key: string) {
  return `${config.addonRef}-${key}`;
}
