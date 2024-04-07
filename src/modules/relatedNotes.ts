import { getPref } from "../utils/prefs";

export { onUpdateRelated };

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
