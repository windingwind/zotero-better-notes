import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { getNoteLink, getNoteLinkParams } from "../utils/link";
import { addLineToNote } from "../utils/note";

export function registerReaderAnnotationButton() {
  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    (event) => {
      const { doc, append, params, reader } = event;
      const annotationData = params.annotation;
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
                  reader._item.libraryID,
                  annotationData.id,
                  (e as MouseEvent).shiftKey ? "window" : "builtin",
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
          enableElementRecord: false,
        }),
      );
    },
    config.addonID,
  );
}

async function createNoteFromAnnotation(
  libraryID: number,
  itemKey: string,
  openMode: "window" | "builtin" | undefined,
) {
  const annotationItem = Zotero.Items.getByLibraryAndKey(
    libraryID,
    itemKey,
  ) as Zotero.Item;
  if (!annotationItem) {
    return;
  }

  // Check if the annotation has a note link tag
  const annotationTags = annotationItem.getTags().map((_) => _.tag);
  const linkRegex = new RegExp("^zotero://note/(.*)$");
  for (const tag of annotationTags) {
    if (linkRegex.test(tag)) {
      const linkParams = getNoteLinkParams(tag);
      if (linkParams.noteItem) {
        addon.hooks.onOpenNote(linkParams.noteItem.id, openMode || "tab", {
          lineIndex: linkParams.lineIndex || undefined,
        });
        // Remove deprecated link tag and create a link in IndexedDB
        await addon.api.relation.linkAnnotationToTarget({
          fromLibID: annotationItem.libraryID,
          fromKey: annotationItem.key,
          toLibID: linkParams.libraryID,
          toKey: linkParams.noteKey!,
          url: tag,
        });
        annotationItem.removeTag(tag);
        await annotationItem.saveTx();
        return;
      } else {
        annotationItem.removeTag(tag);
        await annotationItem.saveTx();
      }
    }
  }

  const linkTarget = await addon.api.relation.getLinkTargetByAnnotation(
    annotationItem.libraryID,
    annotationItem.key,
  );
  if (linkTarget) {
    const targetItem = Zotero.Items.getByLibraryAndKey(
      linkTarget.toLibID,
      linkTarget.toKey,
    );
    if (targetItem)
      addon.hooks.onOpenNote(targetItem.id, openMode || "builtin", {});
    return;
  }

  const note: Zotero.Item = new Zotero.Item("note");
  note.libraryID = annotationItem.libraryID;
  note.parentID = annotationItem.parentItem!.parentID;
  await note.saveTx();

  const renderedTemplate = await addon.api.template.runTemplate(
    "[QuickNoteV5]",
    "annotationItem, topItem, noteItem",
    [annotationItem, annotationItem.parentItem!.parentItem, note],
  );
  await addLineToNote(note, renderedTemplate);

  const tags = annotationItem.getTags();
  for (const tag of tags) {
    note.addTag(tag.tag, tag.type);
  }
  await note.saveTx();

  await addon.api.relation.linkAnnotationToTarget({
    fromLibID: annotationItem.libraryID,
    fromKey: annotationItem.key,
    toLibID: note.libraryID,
    toKey: note.key,
    url: addon.api.convert.note2link(note, { ignore: true })!,
  });

  addon.hooks.onOpenNote(note.id, "builtin", {});
}
