export async function resetData() {
  // Delete collections, items, tags
  const collections = await Zotero.Collections.getAllIDs(
    Zotero.Libraries.userLibraryID,
  );
  await Zotero.Collections.erase(collections);

  const items = await Zotero.Items.getAllIDs(Zotero.Libraries.userLibraryID);
  await Zotero.Items.erase(items);
}

export async function resetTabs() {
  const win = Zotero.getMainWindow();
  const Zotero_Tabs = win.Zotero_Tabs;
  Zotero_Tabs.closeAll();
}

export async function resetAll() {
  await resetTabs();
  await resetData();
}
