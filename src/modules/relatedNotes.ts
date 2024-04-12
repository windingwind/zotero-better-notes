export { onUpdateRelated };

function onUpdateRelated(items: Zotero.Item[] = []) {
  for (const item of items) {
    addon.api.relation.updateNoteLinkRelation(item.id);
  }
}
