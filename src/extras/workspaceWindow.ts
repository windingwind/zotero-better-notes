window.addEventListener("DOMContentLoaded", () => {
  const registeredKey = Zotero.Notifier.registerObserver({
    notify(action, type, ids, extraData) {
      if (action === "modify" && type === "item") {
        const item = getItem();
        if ((ids as number[]).includes(item.id)) {
          updateTitle();
        }
      }
    },
  });

  window.addEventListener(
    "unload",
    () => {
      Zotero.Notifier.unregisterObserver(registeredKey);
    },
    { once: true },
  );

  window.arguments[0]._initPromise.resolve();
});

function updateTitle() {
  const item = getItem();
  if (item?.isNote()) {
    document.title = item.getNoteTitle();
  }
}

function getItem() {
  // @ts-ignore
  return document.querySelector("bn-workspace")?.item as Zotero.Item;
}

window.updateTitle = updateTitle;
