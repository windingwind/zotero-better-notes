export const TAB_TYPE = "note";

function scrollTabEditorTo(
  item: Zotero.Item,
  options: {
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  const tab = Zotero.getMainWindow().Zotero_Tabs._tabs.find(
    (tab) => tab.data?.itemID == item.id,
  );
  if (!tab || tab.type !== TAB_TYPE) return;
  const workspace = Zotero.getMainWindow().document.querySelector(
    `#${tab.id} > bn-workspace`,
  );
  if (!workspace) return;
  // @ts-ignore
  workspace.scrollEditorTo(options);
}
