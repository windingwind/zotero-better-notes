import { config } from "../../package.json";
import { showHint } from "./hint";
import { getString } from "./locale";
import { addLineToNote } from "./note";

export { openLinkCreator };

async function openLinkCreator(
  currentNote: Zotero.Item,
  options?: {
    lineIndex: number;
  },
) {
  if (!currentNote.id) {
    showHint(getString("alert-linkCreator-emptyNote"));
    return;
  }
  const io = {
    openedNoteIDs: Array.from(
      new Set(
        Zotero.Notes._editorInstances
          .map((editor) => editor._item?.id)
          .filter((id) => id),
      ),
    ),
    currentNoteID: currentNote.id,
    currentLineIndex: options?.lineIndex,
    deferred: Zotero.Promise.defer(),
  } as any;
  Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/linkCreator.xhtml`,
    `${config.addonRef}-linkCreator`,
    "chrome,modal,centerscreen,resizable=yes",
    io,
  );
  await io.deferred.promise;

  const targetNote = Zotero.Items.get(io.targetNoteID);
  const content = io.content;
  const lineIndex = io.lineIndex;

  if (!targetNote || !content) return;

  await addLineToNote(targetNote, content, lineIndex);

  await addon.api.relation.updateNoteLinkRelation(targetNote.id);
}
