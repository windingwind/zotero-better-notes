import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { getNoteLink, getNoteLinkParams } from "../utils/link";
import { addLineToNote } from "../utils/note";

export function registerReaderInitializer() {
  ztoolkit.ReaderInstance.register(
    "initialized",
    `${config.addonRef}-annotationButtons`,
    initializeReaderAnnotationButton,
  );
  // Force re-initialize
  Zotero.Reader._readers.forEach((r) => {
    initializeReaderAnnotationButton(r);
  });
}

export function unregisterReaderInitializer() {
  Zotero.Reader._readers.forEach((r) => {
    unInitializeReaderAnnotationButton(r);
  });
}

export async function checkReaderAnnotationButton(items: Zotero.Item[]) {
  const hitSet = new Set<number>();
  let t = 0;
  const period = 100;
  const wait = 5000;
  while (items.length > hitSet.size && t < wait) {
    for (const instance of Zotero.Reader._readers) {
      const hitItems = await initializeReaderAnnotationButton(instance);
      hitItems.forEach((item) => hitSet.add(item.id));
    }
    await Zotero.Promise.delay(period);
    t += period;
  }
}

async function initializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance,
): Promise<Zotero.Item[]> {
  if (!instance) {
    return [];
  }
  await instance._initPromise;
  await instance._waitForReader();
  const _document = instance._iframeWindow?.document;
  if (!_document) {
    return [];
  }
  const hitItems: Zotero.Item[] = [];
  for (const moreButton of Array.from(_document.querySelectorAll(".more"))) {
    if (moreButton.getAttribute("_betternotesInitialized") === "true") {
      continue;
    }
    moreButton.setAttribute("_betternotesInitialized", "true");

    let annotationWrapper = moreButton;
    while (!annotationWrapper.getAttribute("data-sidebar-annotation-id")) {
      annotationWrapper = annotationWrapper.parentElement!;
    }
    const itemKey =
      annotationWrapper.getAttribute("data-sidebar-annotation-id") || "";
    if (!instance.itemID) {
      continue;
    }
    const libraryID = Zotero.Items.get(instance.itemID).libraryID;
    const annotationItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      libraryID,
      itemKey,
    )) as Zotero.Item;

    if (!annotationItem) {
      continue;
    }

    hitItems.push(annotationItem);

    const annotationButtons: TagElementProps[] = [
      {
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
                annotationItem,
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
      },
    ];

    ztoolkit.UI.insertElementBefore(
      {
        tag: "fragment",
        children: annotationButtons,
      },
      moreButton,
    );
  }
  return hitItems;
}

async function unInitializeReaderAnnotationButton(
  instance: _ZoteroTypes.ReaderInstance,
): Promise<void> {
  if (!instance) {
    return;
  }
  await instance._initPromise;
  await instance._waitForReader();
  const _document = instance._iframeWindow?.document;
  if (!_document) {
    return;
  }
  for (const moreButton of Array.from(_document.querySelectorAll(".more"))) {
    if (moreButton.getAttribute("_betternotesInitialized") === "true") {
      moreButton.removeAttribute("_betternotesInitialized");
    }
  }
}

async function createNoteFromAnnotation(
  annotationItem: Zotero.Item,
  openMode: "standalone" | "auto" = "auto",
) {
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
