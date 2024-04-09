import { getPref, setPref } from "../utils/prefs";

export { onUpdateRelated, promptRelatedPermission };

function onUpdateRelated(
  items: Zotero.Item[] = [],
  { skipActive } = {
    skipActive: true,
  },
) {
  if (!getPref("related.takeover")) {
    return;
  }
  if (skipActive) {
    // Skip active note editors' targets
    const activeNoteIds = Zotero.Notes._editorInstances
      .filter(
        (editor) =>
          !Components.utils.isDeadWrapper(editor._iframeWindow) &&
          editor._iframeWindow.document.hasFocus(),
      )
      .map((editor) => editor._item.id);
    const filteredItems = items.filter(
      (item) => !activeNoteIds.includes(item.id),
    );
    items = filteredItems;
  }
  for (const item of items) {
    addon.api.related.updateRelatedNotes(item.id);
  }
}

function promptRelatedPermission() {
  if (getPref("related.takeover")) {
    return;
  }
  const result = Zotero.Prompt.confirm({
    title: "Permission Request",
    text: `Better Notes want to take over (add and remove) related field of your notes.
If you refuse, you can still use Better Notes, but most of the linking features will not work.
You can change this permission in settings later.`,
    button0: "Allow",
    button1: "Refuse",
  });

  if (result === 0) {
    setPref("related.takeover", true);
  }
}
