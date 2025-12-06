import { showHintWithLink } from "../../utils/hint";
import { getPref } from "../../utils/prefs";
import { formatPath, jointPath } from "../../utils/str";

export async function saveMD(
  filePath: string,
  noteId: number,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
  } = {},
) {
  const noteItem = Zotero.Items.get(noteId);
  const filename = PathUtils.split(filePath).pop()
  const dir = jointPath(...PathUtils.split(formatPath(filePath)).slice(0, -1));
  await IOUtils.makeDirectory(dir);
  await Zotero.File.putContentsAsync(
    filePath,
    await addon.api.convert.note2md(noteItem, dir, {...options, filename: filename}),
  );

  showHintWithLink(`Note Saved to ${filePath}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filePath);
  });
}

export async function syncMDBatch(
  saveDir: string,
  noteIds: number[],
  metaList?: Record<string, any>[],
) {
  const noteItems = Zotero.Items.get(noteIds);
  await IOUtils.makeDirectory(saveDir);

  let i = 0;
  for (const noteItem of noteItems) {
    const filename = await addon.api.sync.getMDFileName(noteItem.id, saveDir);
    const filePath = jointPath(saveDir, filename);
    const content = await addon.api.convert.note2md(noteItem, saveDir, {
      keepNoteLink: false,
      withYAMLHeader: true,
      cachedYAMLHeader: metaList?.[i],
      filename: filename,
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
    i += 1;
  }
}
