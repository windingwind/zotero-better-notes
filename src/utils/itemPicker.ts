export async function itemPicker() {
  const io = {
    singleSelection: false,
    dataIn: null as unknown,
    dataOut: null as unknown,
    deferred: Zotero.Promise.defer(),
  };

  (window as unknown as XUL.XULWindow).openDialog(
    ztoolkit.isZotero7()
      ? "chrome://zotero/content/selectItemsDialog.xhtml"
      : "chrome://zotero/content/selectItemsDialog.xul",
    "",
    "chrome,dialog=no,centerscreen,resizable=yes",
    io,
  );
  await io.deferred.promise;

  const itemIds = io.dataOut as number[];
  return itemIds;
}
