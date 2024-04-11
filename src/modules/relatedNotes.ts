export { onUpdateRelated };

function onUpdateRelated(items: Zotero.Item[] = []) {
  for (const item of items) {
    addon.api.related.updateNoteLinkRelation(item.id);
  }
}
