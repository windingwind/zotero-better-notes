export async function waitNoMoreThan<T>(
  promise: Promise<T>,
  timeout: number = 3000,
  message: string = "Timeout",
) {
  let resolved = false;

  return Promise.any([
    promise.then((result) => {
      resolved = true;
      return result;
    }),
    Zotero.Promise.delay(timeout).then(() => {
      if (resolved) return;
      throw new Error(message);
    }),
  ]);
}

export async function waitForNotifierEvent(
  event: _ZoteroTypes.Notifier.Event,
  type: _ZoteroTypes.Notifier.Type,
  options: {
    timeout?: number;
    customCallback?: (
      ev: _ZoteroTypes.Notifier.Event,
      type: _ZoteroTypes.Notifier.Type,
      ids: Array<number | string>,
      extraData: any,
    ) => boolean;
  } = {},
) {
  if (!event) throw new Error("event not provided");
  const { timeout, customCallback } = options;
  let resolved = false;

  return waitNoMoreThan(
    new Promise((resolve, reject) => {
      const notifierID = Zotero.Notifier.registerObserver(
        {
          notify: function (ev, type, ids, extraData) {
            if (
              ev == event &&
              (customCallback ? customCallback(ev, type, ids, extraData) : true)
            ) {
              Zotero.Notifier.unregisterObserver(notifierID);
              resolved = true;

              resolve({
                ids: ids,
                extraData: extraData,
              });
            }
          },
        },
        [type],
        "test",
        101,
      );
    }),
    timeout,
  );
}

export function waitForTabSelectEvent(timeout: number = 3000) {
  return waitForNotifierEvent("select", "tab", { timeout });
}

export function waitForItemModifyEvent(itemID: number, timeout: number = 3000) {
  return waitForNotifierEvent("modify", "item", {
    timeout,
    customCallback(ev, type, ids, extraData) {
      return ids.includes(itemID);
    },
  });
}

/**
 * Waits for a window with a specific URL to open. Returns a promise for the window, and
 * optionally passes the window to a callback immediately for use with modal dialogs,
 * which prevent async code from continuing
 */
export async function waitForWindow(uri: string, timeout: number = 3000) {
  return waitNoMoreThan(
    new Promise<Window>((resolve, reject) => {
      const loadObserver = function (ev: Event) {
        ev.originalTarget?.removeEventListener("load", loadObserver, false);
        const href = (ev.target as Window)?.location.href;
        Zotero.debug("Window opened: " + href);

        if (href != uri) {
          Zotero.debug(`Ignoring window ${href} in waitForWindow()`);
          return;
        }

        Services.ww.unregisterNotification(winObserver);
        const win = ev.target?.ownerGlobal;
        // Give window code time to run on load
        win?.setTimeout(function () {
          resolve(win);
        });
      };
      const winObserver = {
        observe: function (subject: Window, topic: string, data: any) {
          if (topic != "domwindowopened") return;
          subject.addEventListener("load", loadObserver, false);
        },
      } as nsIObserver;
      Services.ww.registerNotification(winObserver);
    }),
    timeout,
  );
}

export async function waitForNoteWindow() {
  return await waitForWindow("chrome://zotero/content/note.xhtml");
}
