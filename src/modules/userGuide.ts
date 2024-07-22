import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { clearPref, getPref, setPref } from "../utils/prefs";

export { showUserGuide };

const LATEST_TOUR_VERSION = 1;

async function showUserGuide(win: Window, force = false) {
  const doc = win.document;
  if (!force && getPref("latestTourVersion") == LATEST_TOUR_VERSION) return;
  setPref("latestTourVersion", LATEST_TOUR_VERSION);
  const exampleNote = `
# Welcome to Better Notes

This note is created by the Better Notes user guide.
You can always run the user guide again from menu Help -> Better Notes User Guide.

## 📝 Introduction

> Everything about note management. All in Zotero.

Better Notes (BN) is a plugin for [Zotero](https://zotero.org).

BN streamlines your workflows of:

- paper reading
- annotating
- note taking
- metadata analyzing
- knowledge exporting
- AI writing assistant

and:

- works out of the box
- highly customizable
- all in Zotero

## 🚀 Get Started

See the [Quick Start Guide](https://github.com/windingwind/zotero-better-notes?tab=readme-ov-file#-quick-start) to get started.

## 📚 Resources

You can find more information in the following links:

- [Documentation](https://github.com/windingwind/zotero-better-notes)
- [Issues](https://github.com/windingwind/zotero-better-notes/issues)
- [Discussions](https://github.com/windingwind/zotero-better-notes/discussions)
- [API](https://github.com/windingwind/zotero-better-notes?tab=readme-ov-file#-api)
`;
  let noteItem: Zotero.Item | undefined;
  let tabID: string;
  addon.data.hint.silent = true;
  await new ztoolkit.Guide()
    .addStep({
      title: getString("userGuide-start-title"),
      description: `<html:img src='chrome://${
        config.addonRef
      }/content/icons/knowledge-app.png' style="width: 300px; height: auto;"></html:img>
    <html:span style='width: 300px; display: block; margin-top: 10px;'>
      ${getString("userGuide-start-desc")}
    </html:span>`,
      position: "center",
      showButtons: ["next", "close"],
      closeBtnText: getString("userGuide-start-close"),
      showProgress: true,
      onCloseClick: () => {
        clearPref("latestTourVersion");
      },
    })
    .addStep({
      title: getString("userGuide-createNoteButton-title"),
      description: getString("userGuide-createNoteButton-desc"),
      element: "#zotero-tb-note-add",
      showButtons: ["prev", "next"],
      showProgress: true,
      onBeforeRender: async () => {
        Zotero_Tabs.select("zotero-pane");
        // @ts-ignore
        ZoteroPane.collectionsView.selectLibrary(1);
      },
    })
    .addStep({
      title: getString("userGuide-createNote-title"),
      description: getString("userGuide-createNote-desc"),
      position: "center",
      showButtons: ["next"],
      showProgress: true,
      onBeforeRender: async ({ state, config }) => {
        noteItem = (await Zotero.Items.getAll(1)).find((item) => item.isNote());
        if (noteItem) {
          await ZoteroPane.selectItem(noteItem.id);
          config.description = getString("userGuide-createNoteFound-desc");
        }
      },
      onExit: async () => {
        noteItem = new Zotero.Item("note");
        noteItem.setNote(await addon.api.convert.md2html(exampleNote));
        await noteItem.saveTx();
      },
    })
    .addStep({
      title: getString("userGuide-openNote-title"),
      description: getString("userGuide-openNote-desc"),
      element: "#item-tree-main-default .row.selected",
      showButtons: ["next"],
      nextBtnText: getString("userGuide-openNote-next"),
      showProgress: true,
    })
    .addStep({
      title: getString("userGuide-workspace-title"),
      description: getString("userGuide-workspace-desc"),
      position: "center",
      showButtons: ["next"],
      showProgress: true,
      onBeforeRender: async ({ state: { step, controller } }) => {
        tabID = (await addon.hooks.onOpenNote(noteItem!.id, "tab", {
          forceTakeover: true,
        })) as string;

        if (!tabID) {
          controller.abort();
          win.alert("Failed to open the note.");
          return;
        }
      },
    })
    .addStep({
      title: getString("userGuide-workspaceEditor-title"),
      description: getString("userGuide-workspaceEditor-desc"),
      element: () =>
        doc.querySelector(`#${tabID} #${config.addonRef}-editor-main`)!,
      position: "center",
      showButtons: ["prev", "next"],
      showProgress: true,
    })
    .addStep({
      title: getString("userGuide-workspaceEditorToolbar-title"),
      description: getString("userGuide-workspaceEditorToolbar-desc"),
      element: () =>
        (doc.querySelector(
          `#${tabID} #${config.addonRef}-editor-main`,
        ) as any)!._iframe.contentDocument.querySelector(".toolbar")!,
      onMask: ({ mask }) => {
        const elem = doc.querySelector(
          `#${tabID} #${config.addonRef}-editor-main`,
        ) as any;
        mask(elem);
        mask(elem._iframe.contentDocument.querySelector(".toolbar"));
      },
    })

    .addStep({
      title: getString("userGuide-workspaceEditorLinkCreator-title"),
      description: getString("userGuide-workspaceEditorLinkCreator-desc"),
      element: () =>
        (doc.querySelector(
          `#${tabID} #${config.addonRef}-editor-main`,
        ) as any)!._iframe.contentDocument.querySelector(
          ".toolbar .start button",
        )!,
      onMask: ({ mask }) => {
        const elem = doc.querySelector(
          `#${tabID} #${config.addonRef}-editor-main`,
        ) as any;
        mask(elem);
        mask(
          elem._iframe.contentDocument.querySelector(".toolbar .start button"),
        );
      },
    })
    .addStep({
      title: getString("userGuide-workspaceEditorMoreOptions-title"),
      description: getString("userGuide-workspaceEditorMoreOptions-desc"),
      element: () =>
        (doc.querySelector(
          `#${tabID} #${config.addonRef}-editor-main`,
        ) as any)!._iframe.contentDocument.querySelector(
          ".toolbar .end .dropdown.more-dropdown",
        )!,
      onMask: ({ mask }) => {
        const elem = doc.querySelector(
          `#${tabID} #${config.addonRef}-editor-main`,
        ) as any;
        mask(elem);
        mask(
          elem._iframe.contentDocument.querySelector(
            ".toolbar .end .dropdown.more-dropdown",
          ),
        );
      },
    })
    .addStep({
      title: getString("userGuide-workspaceOutline-title"),
      description: getString("userGuide-workspaceOutline-desc"),
      element: () => doc.querySelector(`#${tabID} bn-outline`)!,
      position: "center",
      showButtons: ["prev", "next"],
      showProgress: true,
    })
    .addStep({
      title: getString("userGuide-workspaceOutlineMode-title"),
      description: getString("userGuide-workspaceOutlineMode-desc"),
      element: () =>
        doc.querySelector(
          `#${tabID} bn-outline #${config.addonRef}-setOutline`,
        )!,
      showButtons: ["prev", "next"],
      showProgress: true,
    })
    .addStep({
      title: getString("userGuide-workspaceOutlineSaveAs-title"),
      description: getString("userGuide-workspaceOutlineSaveAs-desc"),
      element: () =>
        doc.querySelector(
          `#${tabID} bn-outline #${config.addonRef}-saveOutline`,
        )!,
      showButtons: ["prev", "next"],
      showProgress: true,
    })
    .addStep({
      title: getString("userGuide-workspaceNoteInfo-title"),
      description: getString("userGuide-workspaceNoteInfo-desc"),
      element: () => doc.querySelector(`#${tabID} bn-context`)!,
      position: "center",
      showButtons: ["prev", "next"],
      showProgress: true,
    })
    .addStep({
      title: getString("userGuide-finish-title"),
      description: getString("userGuide-finish-desc"),
      position: "center",
      showButtons: ["prev", "close"],
      showProgress: true,
    })
    .show(doc);

  addon.data.hint.silent = false;
}
