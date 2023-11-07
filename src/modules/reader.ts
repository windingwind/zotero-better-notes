import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { getNoteLink, getNoteLinkParams } from "../utils/link";
import { addLineToNote } from "../utils/note";

export function registerReaderAnnotationButton() {
  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    (event) => {
      const { doc, append, params } = event;
      const annotationData = params.annotation;
      const annotationItem = Zotero.Items.getByLibraryAndKey(
        annotationData.libraryID,
        annotationData.id,
      ) as Zotero.Item;

      if (!annotationItem) {
        return;
      }
      const itemID = annotationItem.id;
      append(
        ztoolkit.UI.createElement(doc, "div", {
          tag: "div",
          classList: ["icon"],
          properties: {
            innerHTML: ICONS.readerQuickNote,
          },
          listeners: [
            {
              type: "click",
              listener: (e) => {
                createNoteFromAnnotation(
                  itemID,
                  (e as MouseEvent).shiftKey ? "standalone" : "auto",
                );
                e.preventDefault();
              },
            },
            {
              type: "mouseover",
              listener: (e) => {
                (e.target as HTMLElement).style.backgroundColor = "#F0F0F0";
              },
            },
            {
              type: "mouseout",
              listener: (e) => {
                (e.target as HTMLElement).style.removeProperty(
                  "background-color",
                );
              },
            },
          ],
          enableElementRecord: true,
        }),
      );
    },
    config.addonID,
  );
}

async function createNoteFromAnnotation(
  itemID: number,
  openMode: "standalone" | "auto" = "auto",
) {
  const annotationItem = Zotero.Items.get(itemID);
  if (!annotationItem) {
    return;
  }
  const annotationTags = annotationItem.getTags().map((_) => _.tag);
  const linkRegex = new RegExp("^zotero://note/(.*)$");
  for (const tag of annotationTags) {
    if (linkRegex.test(tag)) {
      const linkParams = getNoteLinkParams(tag);
      if (linkParams.noteItem) {
        addon.hooks.onOpenNote(linkParams.noteItem.id, openMode, {
          lineIndex: linkParams.lineIndex || undefined,
        });
        return;
      } else {
        annotationItem.removeTag(tag);
        await annotationItem.saveTx();
      }
    }
  }

  const note: Zotero.Item = new Zotero.Item("note");
  note.libraryID = annotationItem.libraryID;
  note.parentID = annotationItem.parentItem!.parentID;
  await note.saveTx();

  // await waitUtilAsync(() => Boolean(getEditorInstance(note.id)));

  const renderredTemplate = await addon.api.template.runTemplate(
    "[QuickNoteV5]",
    "annotationItem, topItem, noteItem",
    [annotationItem, annotationItem.parentItem!.parentItem, note],
  );
  await addLineToNote(note, renderredTemplate);

  const tags = annotationItem.getTags();
  for (const tag of tags) {
    note.addTag(tag.tag, tag.type);
  }
  await note.saveTx();

  ZoteroPane.openNoteWindow(note.id);

  annotationItem.addTag(getNoteLink(note)!);
  await annotationItem.saveTx();
}
