import { config } from "../../../package.json";
import { waitUtilAsync } from "../../utils/wait";
import { getWorkspaceByUID } from "../../utils/workspace";

export function openNotePreview(
  noteItem: Zotero.Item,
  workspaceUID: string,
  options: {
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: `bn-note-preview-${workspaceUID}-${noteItem.id}`,
    pluginID: config.addonID,
    header: {
      icon: "chrome://zotero/skin/16/universal/note.svg",
      l10nID: `${config.addonRef}-note-preview-header`,
    },
    sidenav: {
      icon: "chrome://zotero/skin/20/universal/note.svg",
      l10nID: `${config.addonRef}-note-preview-sidenav`,
      l10nArgs: JSON.stringify({ title: noteItem.getNoteTitle() }),
    },
    bodyXHTML: `<note-editor data-id="${noteItem.id}" class="bn-note-preview"></note-editor>`,
    sectionButtons: [
      {
        type: "openNote",
        icon: "chrome://zotero/skin/16/universal/open-link.svg",
        l10nID: `${config.addonRef}-note-preview-open`,
        onClick: ({ event }) => {
          const position = (event as MouseEvent).shiftKey ? "window" : "tab";
          Zotero[config.addonRef].hooks.onOpenNote(noteItem.id, position);
        },
      },
      {
        type: "closePreview",
        icon: "chrome://zotero/skin/16/universal/minus.svg",
        l10nID: `${config.addonRef}-note-preview-close`,
        onClick: () => {
          Zotero.ItemPaneManager.unregisterSection(key || "");
        },
      },
      {
        type: "fullHeight",
        icon: `chrome://${config.addonRef}/content/icons/full-16.svg`,
        l10nID: `${config.addonRef}-note-preview-full`,
        onClick: ({ body }) => {
          const iframe = body.querySelector("iframe");
          const details = body.closest("bn-details");
          const head = body
            .closest("item-pane-custom-section")
            ?.querySelector(".head");
          const heightKey = "--details-height";
          if (iframe?.style.getPropertyValue(heightKey)) {
            iframe.style.removeProperty(heightKey);
            // @ts-ignore
            if (details.pinnedPane === key) {
              // @ts-ignore
              details.pinnedPane = "";
            }
          } else {
            iframe?.style.setProperty(
              heightKey,
              `${details!.clientHeight - head!.clientHeight - 8}px`,
            );
            // @ts-ignore
            details.pinnedPane = key;
            // @ts-ignore
            details.scrollToPane(key);
          }
        },
      },
    ],
    onItemChange: ({ body, setEnabled }) => {
      if (
        (body.closest("bn-workspace") as HTMLElement | undefined)?.dataset
          .uid !== workspaceUID
      ) {
        setEnabled(false);
        return;
      }
      setEnabled(true);
    },
    onRender: ({ setSectionSummary }) => {
      setSectionSummary(noteItem.getNoteTitle());
    },
    onAsyncRender: async ({ body }) => {
      const editorElement = body.querySelector("note-editor")! as EditorElement;
      await waitUtilAsync(() => Boolean(editorElement._initialized));
      if (!editorElement._initialized) {
        throw new Error("initNoteEditor: waiting initialization failed");
      }
      editorElement.mode = "edit";
      editorElement.viewMode = "library";
      editorElement.parent = noteItem?.parentItem;
      editorElement.item = noteItem;
      await waitUtilAsync(() => Boolean(editorElement._editorInstance));
      await editorElement._editorInstance._initPromise;

      if (typeof options.lineIndex === "number") {
        addon.api.editor.scroll(
          editorElement._editorInstance,
          options.lineIndex,
        );
      }
      if (typeof options.sectionName === "string") {
        addon.api.editor.scrollToSection(
          editorElement._editorInstance,
          options.sectionName,
        );
      }
    },
  });

  const workspace = getWorkspaceByUID(workspaceUID);
  setTimeout(
    () =>
      // @ts-ignore
      workspace?.querySelector("bn-details")?.scrollToPane(key),
    500,
  );

  if (!key) {
    scrollPreviewEditorTo(noteItem, workspaceUID, options);
  }
}

function scrollPreviewEditorTo(
  item: Zotero.Item,
  workspaceUID: string,
  options: {
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  const workspace = getWorkspaceByUID(workspaceUID);
  if (!workspace) return;
  const editor = workspace.querySelector(
    `note-editor[data-id="${item.id}"]`,
  ) as EditorElement;
  if (!editor) return;
  const section = editor.closest("item-pane-custom-section");
  // @ts-ignore
  workspace?.querySelector("bn-details")?.scrollToPane(section.dataset.pane);
  if (typeof options.lineIndex === "number") {
    addon.api.editor.scroll(editor._editorInstance, options.lineIndex);
  }
  if (typeof options.sectionName === "string") {
    addon.api.editor.scrollToSection(
      editor._editorInstance,
      options.sectionName,
    );
  }
}
