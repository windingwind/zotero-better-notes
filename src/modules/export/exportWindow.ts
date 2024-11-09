import { config } from "../../../package.json";
import { fill, slice } from "../../utils/str";

export async function showExportNoteOptions(
  noteIds: number[],
  overwriteOptions: Record<string, any> = {},
) {
  const items = Zotero.Items.get(noteIds);
  const noteItems: Zotero.Item[] = [];
  items.forEach((item) => {
    if (item.isNote()) {
      noteItems.push(item);
    }
    if (item.isRegularItem()) {
      noteItems.splice(0, 0, ...Zotero.Items.get(item.getNotes()));
    }
  });
  if (noteItems.length === 0) {
    return;
  }

  const io = {
    targetData: {
      left: noteItems.length - 1,
      title: fill(slice(noteItems[0].getNoteTitle(), 40), 40),
    },
    deferred: Zotero.Promise.defer(),
    accepted: false,
    useBuiltInExport: false,
  };

  Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/exportNotes.xhtml`,
    `${config.addonRef}-exportNotes`,
    "chrome,centerscreen,resizable",
    io,
  );

  await io.deferred.promise;

  if (io.accepted) {
    await addon.api.$export.exportNotes(
      noteItems,
      Object.assign(io as any, overwriteOptions),
    );
  }
  if (io.useBuiltInExport) {
    const exporter = new (Zotero.getMainWindow().Zotero_File_Exporter)();
    exporter.items = Zotero.Items.get(noteIds);
    if (!exporter.items || !exporter.items.length)
      throw "no items currently selected";
    exporter.save();
  }
}
