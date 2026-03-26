import { config } from "../../../package.json";

export function registerBookmarkSection() {
  Zotero.ItemPaneManager.registerSection({
    paneID: "bn-note-bookmark",
    pluginID: config.addonID,
    bodyXHTML: `
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/workspace/related.css"
  ></html:link>
  <html:link
    rel="localization"
    href="${config.addonRef}-noteRelation.ftl"
  ></html:link>
</linkset>`,
    header: {
      icon: `chrome://${config.addonRef}/content/icons/bookmark-16.svg`,
      l10nID: `${config.addonRef}-note-bookmark-header`,
    },
    sidenav: {
      icon: `chrome://${config.addonRef}/content/icons/bookmark-20.svg`,
      l10nID: `${config.addonRef}-note-bookmark-sidenav`,
    },
    sectionButtons: [
      {
        type: "refresh",
        icon: "chrome://zotero/skin/16/universal/sync.svg",
        l10nID: `${config.addonRef}-note-bookmark-refresh`,
        onClick: ({ body, item, setL10nArgs }) => {
          renderBookmarkSection({
            body,
            item,
            setCount: makeSetCount(setL10nArgs),
          });
        },
      },
    ],
    onInit({ body, refresh }) {
      const notifierKey = Zotero.Notifier.registerObserver(
        {
          notify: (_event, type, ids) => {
            if (type !== "item") return;
            const itemID = parseInt(body.dataset.itemID || "0");
            if (itemID && (ids as number[]).includes(itemID)) refresh();
          },
        },
        ["item"],
      );
      body.classList.add("bn-link-body");
      body.dataset.notifierKey = notifierKey;
    },
    onDestroy({ body }) {
      const notifierKey = body.dataset.notifierKey;
      if (notifierKey) {
        Zotero.Notifier.unregisterObserver(notifierKey);
      }
    },
    onItemChange: ({ body, item, tabType, setEnabled }) => {
      if (
        (body.closest("bn-workspace") as HTMLElement | undefined) ||
        tabType === "note" ||
        tabType === "reader"
      ) {
        setEnabled(true);
        body.dataset.itemID = String(item.id);
        body.dataset.parentItemID = String(item.id);
        return;
      }
      setEnabled(false);
    },
    onRender: () => {},
    onAsyncRender: async ({ body, item, setL10nArgs }) => {
      await renderBookmarkSection({
        body,
        item,
        setCount: makeSetCount(setL10nArgs),
      });
    },
  });
}

async function renderBookmarkSection({
  body,
  item,
  setCount,
}: {
  body: HTMLElement;
  item: Zotero.Item;
  setCount: (count: number) => void;
}) {
  // Increment a generation counter so any in-flight render can detect it's stale.
  const gen = ((body.dataset.renderGen = String(
    (parseInt(body.dataset.renderGen || "0") + 1),
  )),
  parseInt(body.dataset.renderGen));
  const stale = () => parseInt(body.dataset.renderGen || "0") !== gen;

  body.querySelectorAll(".row").forEach((elem) => elem.remove());
  const doc = body.ownerDocument;

  // Find the attachment to query. If item is a regular item, use its first PDF child.
  let attachmentItem: Zotero.Item | undefined;
  if (item.isAttachment()) {
    attachmentItem = item;
  } else if (item.isRegularItem()) {
    const childIDs: number[] = item.getAttachments();
    attachmentItem = childIDs
      .map((id) => Zotero.Items.get(id))
      .find((a): a is Zotero.Item => !!a && a.isPDFAttachment());
  }

  if (!attachmentItem) {
    setCount(0);
    return;
  }

  // Walk all note-type annotations on the attachment and resolve their linked
  // bookmark notes via the relation DB (same approach as getLinkedNoteKeyForPage).
  const annotations = attachmentItem.getAnnotations();
  const noteAnnotations = annotations.filter(
    (ann) => ann.annotationType === "note",
  );
  const bookmarks: Zotero.Item[] = [];
  for (const ann of noteAnnotations) {
    const linkTarget = await addon.api.relation.getLinkTargetByAnnotation(
      ann.libraryID,
      ann.key,
    );
    if (!linkTarget) continue;
    const noteItem = Zotero.Items.getByLibraryAndKey(
      linkTarget.toLibID,
      linkTarget.toKey,
    );
    if (noteItem && !noteItem.deleted && noteItem.hasTag("bookmark")) {
      bookmarks.push(noteItem);
    }
  }

  // Abort if a newer render has already started.
  if (stale()) return;

  let count = 0;
  for (const noteItem of bookmarks) {
    count++;

    const row = doc.createElement("div");
    row.className = "row";

    const icon = ztoolkit
      .getGlobal("require")("components/icons")
      .getCSSItemTypeIcon("note");

    const label = doc.createElement("div");
    label.className = "label";
    const title = doc.createElement("span");
    title.textContent = noteItem.getNoteTitle();
    label.append(title);
    label.title = noteItem.getNoteTitle();

    const box = doc.createElement("div");
    box.addEventListener("click", () =>
      addon.hooks.onOpenNote(noteItem.id, "preview", {}),
    );
    box.className = "box keyboard-clickable";
    box.setAttribute("tabindex", "0");
    box.append(icon, label);

    row.append(box);

    const openBtn = (doc as any).createXULElement("toolbarbutton");
    openBtn.addEventListener("command", (event: MouseEvent) => {
      const position = event.shiftKey ? "window" : "tab";
      addon.hooks.onOpenNote(noteItem.id, position, {});
    });
    openBtn.className = "zotero-clicky zotero-clicky-open-link";
    openBtn.setAttribute("tabindex", "0");
    openBtn.setAttribute(
      "tooltiptext",
      "Open in new tab (Click) or new BN window (Shift+Click)",
    );
    row.append(openBtn);

    body.append(row);
  }

  setCount(count);
}

function makeSetCount(setL10nArgs: (str: string) => void) {
  return (count: number) => {
    setL10nArgs(`{"count": "${count}"}`);
  };
}
