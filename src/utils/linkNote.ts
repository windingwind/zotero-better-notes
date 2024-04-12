import { config } from "../../package.json";
import { addLineToNote } from "./note";

export { openLinkNoteDialog };

async function openLinkNoteDialog(currentNote: Zotero.Item) {
  const io = {
    openedNoteIDs: Zotero_Tabs._tabs
      .map((tab) => tab.data?.itemID)
      .filter((id) => id && id != currentNote.id),
    currentNoteID: currentNote.id,
    deferred: Zotero.Promise.defer(),
  } as any;
  window.openDialog(
    `chrome://${config.addonRef}/content/linkNote.xhtml`,
    "_blank",
    "chrome,modal,centerscreen,resizable=no",
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
