import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { getNoteLinkParams } from "../utils/link";
import { addLineToNote } from "../utils/note";
import { getPref } from "../utils/prefs";

export {
  registerReaderAnnotationButton,
  syncAnnotationNoteTags,
  stopCacheCleanupTimer,
  invalidateAnnotationNoteCacheByItemIDs,
};

const MAX_CACHE_SIZE = 1000;
const CACHE_STALE_TIME_MS = 90 * 60 * 1000; // 90 minutes
const CACHE_CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  hasNote: boolean;
  lastAccessTime: number;
}

const annotationNoteStateCache = new Map<string, CacheEntry>();
const buttonUpdateRequestToken = new WeakMap<HTMLElement, number>();
let cacheCleanupTimer: ReturnType<typeof setInterval> | null = null;

function getAnnotationCacheKey(libraryID: number, itemKey: string) {
  return `${libraryID}:${itemKey}`;
}

function startCacheCleanupTimer() {
  if (cacheCleanupTimer) {
    return;
  }
  cacheCleanupTimer = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [key, entry] of annotationNoteStateCache.entries()) {
      if (now - entry.lastAccessTime > CACHE_STALE_TIME_MS) {
        annotationNoteStateCache.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      ztoolkit.log(
        `[annotationNote] Cleaned ${cleanedCount} stale cache entries. Cache size: ${annotationNoteStateCache.size}`,
      );
    }
  }, CACHE_CLEANUP_INTERVAL_MS);
}

function stopCacheCleanupTimer() {
  if (cacheCleanupTimer) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }
}

function evictOldestCacheEntry() {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of annotationNoteStateCache.entries()) {
    if (entry.lastAccessTime < oldestTime) {
      oldestTime = entry.lastAccessTime;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    annotationNoteStateCache.delete(oldestKey);
  }
}

function setCacheEntry(key: string, hasNote: boolean) {
  const now = Date.now();
  annotationNoteStateCache.set(key, { hasNote, lastAccessTime: now });

  // Enforce size limit
  if (annotationNoteStateCache.size > MAX_CACHE_SIZE) {
    evictOldestCacheEntry();
  }

  // Ensure cleanup timer is running
  startCacheCleanupTimer();
}

function getCacheEntry(key: string): CacheEntry | undefined {
  const entry = annotationNoteStateCache.get(key);
  if (entry) {
    // Update last access time on read
    entry.lastAccessTime = Date.now();
  }
  return entry;
}

async function invalidateAnnotationNoteCacheByItemIDs(itemIDs: (number | string)[]) {
  let shouldClearAll = false;
  const keysToDelete = new Set<string>();

  for (const rawID of itemIDs) {
    const itemID = typeof rawID === "number" ? rawID : Number(rawID);
    if (!Number.isFinite(itemID)) {
      continue;
    }

    const item = Zotero.Items.get(itemID);
    // Deleted items may no longer be resolvable here.
    if (!item) {
      shouldClearAll = true;
      break;
    }

    if (item.isAnnotation()) {
      keysToDelete.add(getAnnotationCacheKey(item.libraryID, item.key));
      continue;
    }

    if (item.isNote()) {
      const annotationModel = await addon.api.relation.getAnnotationByLinkTarget(
        item.libraryID,
        item.key,
      );
      if (annotationModel) {
        keysToDelete.add(
          getAnnotationCacheKey(annotationModel.fromLibID, annotationModel.fromKey),
        );
      }
    }
  }

  if (shouldClearAll) {
    annotationNoteStateCache.clear();
    return;
  }

  for (const key of keysToDelete) {
    annotationNoteStateCache.delete(key);
  }
}

function registerReaderAnnotationButton() {
  startCacheCleanupTimer();
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
      const cacheKey = getAnnotationCacheKey(reader._item.libraryID, annotationData.id);
      const cachedEntry = getCacheEntry(cacheKey);
      const initialHasNote = cachedEntry?.hasNote ?? false;
      const button = doc.createElement("div");
      button.classList.add("icon");
      button.innerHTML = getAnnotationNoteButtonInnerHTML(initialHasNote);
      button.title = getAnnotationNoteButtonTitle(initialHasNote);
      button.dataset.annotationId = annotationData.id;
      button.dataset.libraryId = reader._item.libraryID.toString();
      button.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLElement;
        createNoteFromAnnotation(
          reader._item.libraryID,
          annotationData.id,
          (e as MouseEvent).shiftKey ? "window" : "builtin",
        );
        button.innerHTML = getAnnotationNoteButtonInnerHTML(true);
        e.preventDefault();
      });
      append(button);

      // Defer relation query to idle time to keep typing smooth when there are many annotations.
      const scheduleUpdate = () => {
        if (!button.isConnected) {
          return;
        }
        updateAnnotationNoteButton(button, reader._item.libraryID, annotationData.id);
      };
      if (doc.defaultView?.requestIdleCallback) {
        doc.defaultView.requestIdleCallback(scheduleUpdate);
      } else {
        doc.defaultView?.setTimeout(scheduleUpdate, 0);
      }
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
  const cacheKey = getAnnotationCacheKey(reader._item.libraryID, annotationData.id);
  const cachedEntry = getCacheEntry(cacheKey);
  const initialHasNote = cachedEntry?.hasNote ?? false;

  const button = ztoolkit.UI.createElement(doc, "div", {
    classList: ["icon"],
    properties: {
      innerHTML: getAnnotationNoteButtonInnerHTML(initialHasNote),
      title: getAnnotationNoteButtonTitle(initialHasNote),
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
  const cacheKey = getAnnotationCacheKey(libraryID, itemKey);
  const requestToken = (buttonUpdateRequestToken.get(button) ?? 0) + 1;
  buttonUpdateRequestToken.set(button, requestToken);
  const cachedEntry = getCacheEntry(cacheKey);
  if (cachedEntry) {
    button.innerHTML = getAnnotationNoteButtonInnerHTML(cachedEntry.hasNote);
    button.title = getAnnotationNoteButtonTitle(cachedEntry.hasNote);
  }

  hasNoteFromAnnotation(libraryID, itemKey).then((hasNote) => {
    if (buttonUpdateRequestToken.get(button) !== requestToken) {
      return;
    }
    setCacheEntry(cacheKey, hasNote);
    if (!button.isConnected) {
      return;
    }
    button.innerHTML = getAnnotationNoteButtonInnerHTML(hasNote);
    button.title = getAnnotationNoteButtonTitle(hasNote);
  }).catch((e) => {
    if (__env__ === "development") {
      console.warn("[annotationNote] updateAnnotationNoteButton failed", e);
    }
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
    setCacheEntry(
      getAnnotationCacheKey(annotationItem.libraryID, annotationItem.key),
      false,
    );
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

  setCacheEntry(
    getAnnotationCacheKey(annotationItem.libraryID, annotationItem.key),
    true,
  );

  addon.hooks.onOpenNote(note.id, "builtin", {});
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
