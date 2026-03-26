import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { getNoteLinkParams } from "../utils/link";
import { addLineToNote } from "../utils/note";
import { getPref } from "../utils/prefs";

export {
  registerReaderAnnotationButton,
  registerBookmarkToolbarButton,
  syncAnnotationNoteTags,
};

const BUTTON_STYLE = `
<style>
  .icon { border-radius: 4px; }
  .icon:hover { background-color: var(--fill-quinary); outline: 2px solid var(--fill-quinary); }
  .icon:active { background-color: var(--fill-quarternary); }
</style>`;

function getPageNoteButtonHTML(hasNote: boolean) {
  return `${hasNote ? ICONS.readerPageNoteActive : ICONS.readerPageNote}${BUTTON_STYLE}`;
}

function getPageNoteButtonTitle(hasNote: boolean) {
  return hasNote
    ? "Open bookmark (Better Notes)"
    : "Bookmark this page (Better Notes)";
}

async function getLinkedNoteKeyForPage(
  attachmentItem: Zotero.Item,
  pageIndex: number,
): Promise<string | null> {
  const annotations = attachmentItem.getAnnotations();
  for (const ann of annotations) {
    if (ann.annotationType !== "note") continue;
    try {
      const pos = JSON.parse(ann.annotationPosition);
      if (pos.pageIndex !== pageIndex) continue;
    } catch {
      continue;
    }
    const linkTarget = await addon.api.relation.getLinkTargetByAnnotation(
      ann.libraryID,
      ann.key,
    );
    if (linkTarget) {
      const targetItem = Zotero.Items.getByLibraryAndKey(
        linkTarget.toLibID,
        linkTarget.toKey,
      );
      if (targetItem && !targetItem.deleted) return linkTarget.toKey;
    }
  }
  return null;
}

function registerBookmarkToolbarButton() {
  Zotero.Reader.registerEventListener(
    "renderToolbar",
    (event) => {
      const { doc, append, reader } = event;
      if (reader.type !== "pdf") return;

      const button = ztoolkit.UI.createElement(doc, "div", {
        classList: ["icon"],
        properties: {
          innerHTML: getPageNoteButtonHTML(false),
          title: getPageNoteButtonTitle(false),
        },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              onPageNoteButtonClick(
                reader,
                button,
                doc,
                (e as MouseEvent).shiftKey ? "window" : "builtin",
              );
            },
          },
        ],
        enableElementRecord: false,
      });
      append(button);

      // Poll at 100ms; only update the DOM when page or note status changes.
      let lastPage = -1;
      let lastHasNote = false;
      const intervalId = setInterval(async () => {
        try {
          const state = await reader._getState();
          const pageIndex = state?.pageIndex;
          if (pageIndex === undefined) return;
          const noteKey = await getLinkedNoteKeyForPage(reader._item, pageIndex);
          const hasNote = !!noteKey;
          if (pageIndex === lastPage && hasNote === lastHasNote) return;
          lastPage = pageIndex;
          lastHasNote = hasNote;
          button.innerHTML = getPageNoteButtonHTML(hasNote);
          button.title = getPageNoteButtonTitle(hasNote);
        } catch {
          // Button became a DeadObject (reader closed) — stop polling.
          clearInterval(intervalId);
        }
      }, 100);
    },
    config.addonID,
  );
}

function openBookmarkNote(noteID: number, openMode: "window" | "builtin") {
  if (openMode === "window") {
    addon.hooks.onOpenNote(noteID, "window", { forceTakeover: true });
    return;
  }
  const noteItem = Zotero.Items.get(noteID);
  if (!noteItem) return;
  const win = Zotero.getMainWindow() as any;
  if (!win) return;
  // Open the context pane and switch to the built-in "notes" mode,
  // then navigate to the specific note (same as clicking from the notes list).
  win.ZoteroContextPane.collapsed = false;
  win.ZoteroContextPane.context.mode = "notes";
  const notesContext = win.ZoteroContextPane.context._getNotesContext(noteItem.libraryID);
  notesContext._setPinnedNote(noteItem);
}

function promptBookmarkNote(readerDoc: Document): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = readerDoc.createElement("div");
    overlay.style.cssText = `
      position: fixed; top: 52px; left: 50%; transform: translateX(-50%);
      background: var(--color-pane-background, #2b2b2b);
      border: 1px solid var(--color-border, #3a3a3a);
      border-radius: 8px; padding: 14px 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      z-index: 99999; min-width: 320px;
      font-family: system-ui, sans-serif;
      color: var(--color-text, #e8e8e8);
    `;

    const title = readerDoc.createElement("div");
    title.textContent = "New Bookmark";
    title.style.cssText = "font-size: 13px; font-weight: 600; margin-bottom: 10px;";

    const input = readerDoc.createElement("input") as HTMLInputElement;
    input.type = "text";
    input.placeholder = "Add a note (optional)";
    input.style.cssText = `
      width: 100%; box-sizing: border-box;
      padding: 6px 10px; border-radius: 5px;
      border: 1px solid var(--color-border, #4a4a4a);
      background: var(--color-background, #1e1e1e);
      color: inherit; font-size: 13px;
      outline: none; margin-bottom: 10px; display: block;
    `;

    const buttons = readerDoc.createElement("div");
    buttons.style.cssText = "display: flex; gap: 8px; justify-content: flex-end;";

    const cancelBtn = readerDoc.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      padding: 5px 12px; border-radius: 5px;
      border: 1px solid var(--color-border, #4a4a4a);
      background: transparent; color: inherit;
      cursor: pointer; font-size: 12px;
    `;

    const okBtn = readerDoc.createElement("button");
    okBtn.textContent = "Bookmark";
    okBtn.style.cssText = `
      padding: 5px 12px; border-radius: 5px; border: none;
      background: #2ea8e5; color: #fff;
      cursor: pointer; font-size: 12px; font-weight: 500;
    `;

    const close = (value: string | null) => {
      overlay.remove();
      resolve(value);
    };

    cancelBtn.addEventListener("click", () => close(null));
    okBtn.addEventListener("click", () => close(input.value.trim()));
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") close(input.value.trim());
      if (e.key === "Escape") close(null);
    });

    buttons.append(cancelBtn, okBtn);
    overlay.append(title, input, buttons);
    readerDoc.body.appendChild(overlay);
    input.focus();
  });
}

async function onPageNoteButtonClick(
  reader: _ZoteroTypes.ReaderInstance,
  button: HTMLElement,
  readerDoc: Document,
  openMode: "window" | "builtin",
) {
  const state = await reader._getState();
  const pageIndex = state?.pageIndex ?? 0;

  const noteKey = await getLinkedNoteKeyForPage(reader._item, pageIndex);
  if (noteKey) {
    const noteItem = Zotero.Items.getByLibraryAndKey(
      reader._item.libraryID,
      noteKey,
    );
    if (noteItem) {
      openBookmarkNote(noteItem.id, openMode);
      return;
    }
  }

  const userNote = await promptBookmarkNote(readerDoc);
  if (userNote === null) return;

  await createNoteFromPage(reader, openMode, pageIndex, readerDoc, userNote);
  try {
    button.innerHTML = getPageNoteButtonHTML(true);
    button.title = getPageNoteButtonTitle(true);
  } catch {
    // DeadObject
  }
}

function registerReaderAnnotationButton() {
  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    (event) => {
      const { doc, append, params, reader } = event;
      // TEMP: If not many annotations, create the button immediately
      if (reader._item.numAnnotations() < 200) {
        createNoteFromAnnotationButton(doc, reader, params.annotation, append);
        return;
      }
      const annotationData = params.annotation;
      const placeholder = doc.createElement("img");
      placeholder.src = "chrome://zotero/error.png";
      placeholder.dataset.annotationId = annotationData.id;
      placeholder.dataset.libraryId = reader._item.libraryID.toString();
      // TEMP: Use error event to delay the button creation to avoid blocking the main thread
      placeholder.addEventListener("error", (event) => {
        const placeholder = event.currentTarget as HTMLElement;
        placeholder.ownerGlobal?.requestIdleCallback(() => {
          const annotationID = placeholder.dataset.annotationId;
          const libraryID = parseInt(placeholder.dataset.libraryId || "");
          const button = doc.createElement("div");
          button.classList.add("icon");
          button.innerHTML = getAnnotationNoteButtonInnerHTML(false);
          button.title = getAnnotationNoteButtonTitle(false);
          button.dataset.annotationId = annotationID;
          button.dataset.libraryId = libraryID.toString();
          button.addEventListener("click", (e) => {
            const button = e.currentTarget as HTMLElement;
            createNoteFromAnnotation(
              reader._item.libraryID,
              annotationID!,
              (e as MouseEvent).shiftKey ? "window" : "builtin",
            );
            button.innerHTML = getAnnotationNoteButtonInnerHTML(true);
            e.preventDefault();
          });
          placeholder.replaceWith(button);
          placeholder.ownerGlobal?.requestIdleCallback(() => {
            updateAnnotationNoteButton(button, libraryID, annotationID!);
          });
        });
      });
      append(placeholder);
    },
    config.addonID,
  );
}

function createNoteFromAnnotationButton(
  doc: Document,
  reader: _ZoteroTypes.ReaderInstance,
  annotationData: any,
  append: (element: HTMLElement) => void,
) {
  const button = ztoolkit.UI.createElement(doc, "div", {
    classList: ["icon"],
    properties: {
      innerHTML: getAnnotationNoteButtonInnerHTML(false),
      title: getAnnotationNoteButtonTitle(false),
    },
    listeners: [
      {
        type: "click",
        listener: (e) => {
          const button = e.currentTarget as HTMLElement;
          createNoteFromAnnotation(
            reader._item.libraryID,
            annotationData.id,
            (e as MouseEvent).shiftKey ? "window" : "builtin",
          );
          button.innerHTML = getAnnotationNoteButtonInnerHTML(true);
          e.preventDefault();
        },
      },
    ],
    enableElementRecord: false,
  });
  updateAnnotationNoteButton(button, reader._item.libraryID, annotationData.id);
  append(button);
}

function getAnnotationNoteButtonInnerHTML(hasNote: boolean) {
  return `${hasNote ? ICONS.openInNewWindow : ICONS.readerQuickNote}
<style>
  .icon {
    border-radius: 4px;
    color: #ffd400;
  }
  .icon:hover {
    background-color: var(--fill-quinary);
    outline: 2px solid var(--fill-quinary);
  }
  .icon:active {
    background-color: var(--fill-quarternary);
  }
</style>
  `;
}

function getAnnotationNoteButtonTitle(hasNote: boolean) {
  return hasNote ? "Open note" : "Create note from annotation";
}

function updateAnnotationNoteButton(
  button: HTMLElement,
  libraryID: number,
  itemKey: string,
) {
  hasNoteFromAnnotation(libraryID, itemKey).then((hasNote) => {
    button.innerHTML = getAnnotationNoteButtonInnerHTML(hasNote);
    button.title = getAnnotationNoteButtonTitle(hasNote);
  });
}

async function hasNoteFromAnnotation(
  libraryID: number,
  itemKey: string,
): Promise<boolean> {
  const annotationItem = Zotero.Items.getByLibraryAndKey(
    libraryID,
    itemKey,
  ) as Zotero.Item;
  if (!annotationItem) {
    return false;
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
    if (targetItem) {
      return true;
    }
  }
  return false;
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
      if (linkParams.noteItem && linkParams.noteItem.isNote()) {
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
    if (targetItem) {
      addon.hooks.onOpenNote(targetItem.id, openMode || "builtin", {});
      return;
    }
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

async function getPageHeight(
  readerDoc: Document,
  pageIndex: number,
): Promise<number> {
  try {
    // Search every iframe and XUL browser element in readerDoc for PDFViewerApplication.
    // readerDoc is reader.html's document; the PDF viewer is an iframe inside it.
    const frames = Array.from(
      readerDoc.querySelectorAll("iframe, browser"),
    ) as HTMLElement[];
    for (const frame of frames) {
      const win = (frame as any).contentWindow as any;
      if (!win) continue;
      const pdfApp = win.PDFViewerApplication;
      if (!pdfApp?.pdfViewer) continue;
      // getPageView() returns a pre-rendered PDFPageView whose viewport is already
      // computed. viewport.viewBox is [x1,y1,x2,y2] in PDF points at scale=1.
      const viewBox = pdfApp.pdfViewer.getPageView(pageIndex)?.viewport?.viewBox;
      if (viewBox) return viewBox[3]; // y2 = page height in PDF points
    }
  } catch {
    // ignore — fall through to default
  }
  return 792; // letter-height fallback
}

async function createNoteFromPage(
  reader: _ZoteroTypes.ReaderInstance,
  openMode: "window" | "builtin",
  pageIndex: number,
  readerDoc: Document,
  userNote: string = "",
) {
  const attachmentItem = reader._item;
  if (!attachmentItem || !attachmentItem.isAttachment()) {
    return;
  }

  const pageLabel = String(pageIndex + 1);

  // Place the anchor at the vertical center of the page, off the left edge so
  // the sticky-note icon is not visible. Querying the actual page height lets
  // Zotero navigate to exactly the middle of the slide/page.
  const pageHeight = await getPageHeight(readerDoc, pageIndex);
  const midY = Math.round(pageHeight / 2);

  // Create a sticky-note annotation anchored to the current page.
  // sortIndex format: "PPPPP|YYYYYY|XXXXX" (page, y-from-top, x-from-left)
  const sortIndex = `${String(pageIndex).padStart(5, "0")}|${String(midY).padStart(6, "0")}|00000`;
  const key = (attachmentItem as any)._generateKey() as string;
  const annotation = await Zotero.Annotations.saveFromJSON(attachmentItem, {
    id: key,
    key,
    type: "note",
    text: "",
    comment: userNote ? `${userNote}, Bookmark, p. ${pageLabel}` : `Bookmark, p. ${pageLabel}`,
    color: "#2ea8e5",
    pageLabel,
    sortIndex,
    position: { pageIndex, rects: [[-30, midY - 10, -10, midY + 10]] },
    readOnly: false,
    libraryID: attachmentItem.libraryID,
    dateModified: new Date().toISOString(),
  } as _ZoteroTypes.Annotations.AnnotationJson);

  annotation.addTag("bookmark");
  await annotation.saveTx();

  // Push the new annotation into the live reader view immediately.
  reader.setAnnotations([annotation]);

  const topItem = attachmentItem.parentItem;

  const note: Zotero.Item = new Zotero.Item("note");
  note.libraryID = attachmentItem.libraryID;
  note.parentID = topItem?.id;
  note.addTag("bookmark");
  await note.saveTx();

  const renderedTemplate = await addon.api.template.runTemplate(
    "[QuickBookmarkV2]",
    "attachmentItem, topItem, annotationItem, pageLabel, noteItem, userNote",
    [attachmentItem, topItem, annotation, pageLabel, note, userNote],
    { useDefault: true },
  );
  await addLineToNote(note, renderedTemplate);
  await note.saveTx();

  await addon.api.relation.linkAnnotationToTarget({
    fromLibID: annotation.libraryID,
    fromKey: annotation.key,
    toLibID: note.libraryID,
    toKey: note.key,
    url: addon.api.convert.note2link(note, { ignore: true })!,
  });

  openBookmarkNote(note.id, openMode);
}

async function syncAnnotationNoteTags(
  itemID: number,
  action: "add" | "remove",
  tagData: { tag: string; type: number },
) {
  if (!getPref("annotationNote.enableTagSync")) {
    return;
  }
  const item = Zotero.Items.get(itemID);
  if (!item || (!item.isAnnotation() && !item.isNote())) {
    return;
  }
  let targetItem: Zotero.Item;
  if (item.isAnnotation()) {
    const annotationModel = await addon.api.relation.getLinkTargetByAnnotation(
      item.libraryID,
      item.key,
    );
    if (!annotationModel) {
      return;
    }
    targetItem = Zotero.Items.getByLibraryAndKey(
      annotationModel.toLibID,
      annotationModel.toKey,
    ) as Zotero.Item;
  } else {
    const annotationModel = await addon.api.relation.getAnnotationByLinkTarget(
      item.libraryID,
      item.key,
    );
    if (!annotationModel) {
      return;
    }
    targetItem = Zotero.Items.getByLibraryAndKey(
      annotationModel.fromLibID,
      annotationModel.fromKey,
    ) as Zotero.Item;
  }
  if (!targetItem) {
    return;
  }

  if (action === "add") {
    targetItem.addTag(tagData.tag, tagData.type);
  } else {
    targetItem.removeTag(tagData.tag);
  }

  await targetItem.saveTx();
}
