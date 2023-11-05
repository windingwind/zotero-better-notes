import { showHintWithLink } from "../../utils/hint";
import { getPref } from "../../utils/prefs";
import { formatPath, jointPath } from "../../utils/str";

export async function saveMD(
  filename: string,
  noteId: number,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
  },
) {
  const noteItem = Zotero.Items.get(noteId);
  const dir = jointPath(
    ...PathUtils.split(formatPath(filename)).slice(0, -1),
  );
  const hasImage = noteItem.getNote().includes("<img");
  if (hasImage) {
    await Zotero.File.createDirectoryIfMissingAsync(dir);
  }
  await Zotero.File.putContentsAsync(
    filename,
    await addon.api.convert.note2md(noteItem, dir, options),
  );

  showHintWithLink(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filename);
  });
}

export async function syncMDBatch(saveDir: string, noteIds: number[]) {
  const noteItems = Zotero.Items.get(noteIds);
  await Zotero.File.createDirectoryIfMissingAsync(saveDir);
  const attachmentsDir = jointPath(saveDir, getPref("syncAttachmentFolder") as string);
  const hasImage = noteItems.some((noteItem) =>
    noteItem.getNote().includes("<img"),
  );
  if (hasImage) {
    await Zotero.File.createDirectoryIfMissingAsync(attachmentsDir);
  }
  for (const noteItem of noteItems) {
    const filename = await addon.api.sync.getMDFileName(noteItem.id, saveDir);
    const filePath = jointPath(saveDir, filename);
    const content = await addon.api.convert.note2md(noteItem, saveDir, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });
    await Zotero.File.putContentsAsync(filePath, content);
    addon.api.sync.updateSyncStatus(noteItem.id, {
      path: saveDir,
      filename,
      itemID: noteItem.id,
      md5: Zotero.Utilities.Internal.md5(
        addon.api.sync.getMDStatusFromContent(content).content,
        false,
      ),
      noteMd5: Zotero.Utilities.Internal.md5(noteItem.getNote(), false),
      lastsync: new Date().getTime(),
    });
  }
}
