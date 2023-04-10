export async function parseCitationHTML(citationIds: number[]) {
  let html = "";
  let items = await Zotero.Items.getAsync(citationIds);
  for (let item of items) {
    if (
      item.isNote() &&
      !(await Zotero.Notes.ensureEmbeddedImagesAreAvailable(item)) &&
      !Zotero.Notes.promptToIgnoreMissingImage()
    ) {
      return null;
    }
  }

  for (let item of items) {
    if (item.isRegularItem()) {
      // @ts-ignore
      let itemData = Zotero.Utilities.Item.itemToCSLJSON(item);
      let citation = {
        citationItems: [
          {
            uris: [Zotero.URI.getItemURI(item)],
            itemData,
          },
        ],
        properties: {},
      };
      let formatted = Zotero.EditorInstanceUtilities.formatCitation(citation);
      html += `<p><span class="citation" data-citation="${encodeURIComponent(
        JSON.stringify(citation)
      )}">${formatted}</span></p>`;
    }
  }
  return html;
}
