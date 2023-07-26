export async function parseCitationHTML(citationIds: number[]) {
  let html = "";
  const items = await Zotero.Items.getAsync(citationIds);
  for (const item of items) {
    if (
      item.isNote() &&
      !(await Zotero.Notes.ensureEmbeddedImagesAreAvailable(item)) &&
      !Zotero.Notes.promptToIgnoreMissingImage()
    ) {
      return null;
    }
  }

  for (const item of items) {
    if (item.isRegularItem()) {
      // @ts-ignore
      const itemData = Zotero.Utilities.Item.itemToCSLJSON(item);
      const citation = {
        citationItems: [
          {
            uris: [Zotero.URI.getItemURI(item)],
            itemData,
          },
        ],
        properties: {},
      };
      const formatted = Zotero.EditorInstanceUtilities.formatCitation(citation);
      html += `<p><span class="citation" data-citation="${encodeURIComponent(
        JSON.stringify(citation),
      )}">${formatted}</span></p>`;
    }
  }
  return html;
}
