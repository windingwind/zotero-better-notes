export async function parseCitationHTML(
  citationIds: number[],
  args: {
    locator?: string;
    label?: string;
    prefix?: string;
    suffix?: string;
  }[] = [],
) {
  let html = "";
  if (citationIds.length === 0 || !citationIds.every((id) => id)) {
    return null;
  }
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

  let i = 0;
  for (const item of items) {
    if (item.isRegularItem()) {
      const currentArgs = {
        locator: args[i].locator || "",
        label: args[i].label || "",
        prefix: args[i].prefix || "",
        suffix: args[i].suffix || "",
      };
      // @ts-ignore
      const itemData = Zotero.Utilities.Item.itemToCSLJSON(item);
      const citation = {
        citationItems: [
          {
            uris: [Zotero.URI.getItemURI(item)],
            ...currentArgs,
            itemData,
          },
        ],
        properties: {},
      };
      const formatted = Zotero.EditorInstanceUtilities.formatCitation(citation);
      html += `<p><span class="citation" data-citation="${encodeURIComponent(
        JSON.stringify(citation),
      )}">${formatted}</span></p>`;
      i++;
    }
  }
  return html;
}
