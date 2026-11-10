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
  // Since Zotero 11, closeAll() also closes library tabs, leaving no
  // collectionsView/itemsView for the tests to use
  Zotero_Tabs.close(
    Zotero_Tabs._tabs
      .filter((tab) => tab.type.split("-")[0] !== "library")
      .map((tab) => tab.id),
  );
}

export async function resetAll() {
  await resetTabs();
  await resetData();
}
