import { getNoteLink, getNoteLinkParams } from "./link";

export { getRelatedNoteIds, updateRelatedNotes };

async function updateRelatedNotes(noteID: number) {
  const noteItem = Zotero.Items.get(noteID);
  if (!noteItem) {
    ztoolkit.log(`updateRelatedNotes: ${noteID} is not a note.`);
    return;
  }
  const { detectedIDSet, currentIDSet } = await getRelatedNoteIds(noteID);

  await Zotero.DB.executeTransaction(async () => {
    const saveParams = {
      skipDateModifiedUpdate: true,
      skipSelect: true,
      notifierData: {
        skipBN: true,
      },
    };
    for (const toAddNote of Zotero.Items.get(Array.from(detectedIDSet))) {
      if (currentIDSet.has(toAddNote.id)) {
        // Remove existing notes from current dict for later process
        currentIDSet.delete(toAddNote.id);
        continue;
      }
      toAddNote.addRelatedItem(noteItem);
      noteItem.addRelatedItem(toAddNote);
      toAddNote.save(saveParams);
      currentIDSet.delete(toAddNote.id);
    }
    for (const toRemoveNote of Zotero.Items.get(Array.from(currentIDSet))) {
      // Remove related notes that are not in the new list
      toRemoveNote.removeRelatedItem(noteItem);
      noteItem.removeRelatedItem(toRemoveNote);
      toRemoveNote.save(saveParams);
    }
    noteItem.save(saveParams);
  });
}

async function getRelatedNoteIds(noteId: number) {
  let detectedIDs: number[] = [];
  const note = Zotero.Items.get(noteId);
  const linkMatches = note.getNote().match(/zotero:\/\/note\/\w+\/\w+\//g);
  const currentIDs: number[] = [];

  if (linkMatches) {
    const subNoteIds = (
      await Promise.all(
        linkMatches.map(async (link) => getNoteLinkParams(link).noteItem),
      )
    )
      .filter((item) => item && item.isNote())
      .map((item) => (item as Zotero.Item).id);
    detectedIDs = detectedIDs.concat(subNoteIds);
  }

  const currentNoteLink = getNoteLink(note);
  if (currentNoteLink) {
    // Get current related items
    for (const relItemKey of note.relatedItems) {
      try {
        const relItem = (await Zotero.Items.getByLibraryAndKeyAsync(
          note.libraryID,
          relItemKey,
        )) as Zotero.Item;

        // If the related item is a note and contains the current note link
        // Add it to the related note list
        if (relItem.isNote()) {
          if (relItem.getNote().includes(currentNoteLink)) {
            detectedIDs.push(relItem.id);
          }
          currentIDs.push(relItem.id);
        }
      } catch (e) {
        ztoolkit.log(e);
      }
    }
  }

  const detectedIDSet = new Set(detectedIDs);
  detectedIDSet.delete(noteId);
  const currentIDSet = new Set(currentIDs);
  return { detectedIDSet, currentIDSet };
}
