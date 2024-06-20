export async function itemPicker() {
  const io = {
    singleSelection: false,
    dataIn: null as unknown,
    dataOut: null as unknown,
    deferred: Zotero.Promise.defer(),
  };

  Zotero.getMainWindow().openDialog(
    "chrome://zotero/content/selectItemsDialog.xhtml",
    "",
    "chrome,dialog=no,centerscreen,resizable=yes",
    io,
  );
  await io.deferred.promise;

  const itemIds = io.dataOut as number[];
  return itemIds;
}
