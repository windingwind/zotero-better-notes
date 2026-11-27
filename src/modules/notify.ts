const windowNotifyIDs = new WeakMap<Window, string>();

export function registerNotify(
  types: _ZoteroTypes.Notifier.Type[],
  win: Window,
) {
  // Zotero 11 can fire onMainWindowLoad repeatedly for the same window
  // (once per library-view lifecycle); keep a single observer per window.
  if (windowNotifyIDs.has(win)) return;
  const callback = {
    notify: async (...data: Parameters<_ZoteroTypes.Notifier.Notify>) => {
      if (!addon?.data.alive) {
        unregisterNotify(notifyID);
        return;
      }
      // Fire-and-forget: a rejection here (e.g. a handler racing an item
      // that was just erased) must not become an unhandled rejection.
      addon.hooks.onNotify(...data).catch((e) => ztoolkit.log(e));
    },
  };

  // Register the callback in Zotero as an item observer
  const notifyID = Zotero.Notifier.registerObserver(callback, types);
  windowNotifyIDs.set(win, notifyID);

  // Unregister callback when the window closes (important to avoid a memory leak)
  win.addEventListener(
    "unload",
    (e: Event) => {
      unregisterNotify(notifyID);
      windowNotifyIDs.delete(win);
    },
    false,
  );
}

function unregisterNotify(notifyID: string) {
  Zotero.Notifier.unregisterObserver(notifyID);
}
