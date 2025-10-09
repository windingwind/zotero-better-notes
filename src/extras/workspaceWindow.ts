window.addEventListener("DOMContentLoaded", () => {
  let savedScrollPosition: number | null = null;
  let isRestoring = false;

  // Hook the note-editor's notify method to intercept before initEditor is called
  const workspace = document.querySelector("bn-workspace");
  if (workspace) {
    const noteEditor = workspace.querySelector("note-editor");
    if (noteEditor && !noteEditor._bnScrollHooked) {
      noteEditor._bnScrollHooked = true; // Prevent double hooking

      const originalNotify = noteEditor.notify;
      noteEditor.notify = async function(event, type, ids, extraData) {
        // Check if this is a modify event for our item from another editor
        const item = getItem();
        if (event === "modify" && type === "item" && item && ids.includes(item.id)) {
          const editor = getEditor();
          const isOwnEdit = editor && extraData[item.id]?.noteEditorID === editor.instanceID;

          // If not our own edit, save scroll position and hide iframe BEFORE notify processes
          if (!isOwnEdit && !isRestoring) {
            savedScrollPosition = saveScrollPosition();
            const iframe = getIframe();
            if (iframe) {
              iframe.style.opacity = "0";
              iframe.style.pointerEvents = "none";
            }
            isRestoring = true;

            // Schedule restoration after notify completes
            setTimeout(async () => {
              await waitForEditorReady();
              if (savedScrollPosition !== null) {
                restoreScrollPosition(savedScrollPosition);
                savedScrollPosition = null;
              }
              const iframe = getIframe();
              if (iframe) {
                iframe.style.opacity = "1";
                iframe.style.pointerEvents = "auto";
              }
              isRestoring = false;
            }, 0);
          }
        }

        // Call original notify
        return await originalNotify.call(this, event, type, ids, extraData);
      };
    }
  }

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

function getEditor() {
  const workspace = document.querySelector("bn-workspace");
  // @ts-ignore
  return workspace?.editor as Zotero.EditorInstance | undefined;
}

function getEditorElement(): HTMLElement | null {
  const editor = getEditor();
  if (!editor?._iframeWindow) {
    return null;
  }
  return editor._iframeWindow.document.querySelector(".editor-core");
}

function getIframe(): HTMLIFrameElement | null {
  const workspace = document.querySelector("bn-workspace");
  if (!workspace) return null;
  const noteEditor = workspace.querySelector("note-editor");
  if (!noteEditor) return null;
  return noteEditor.querySelector("iframe");
}

function saveScrollPosition(): number | null {
  try {
    const editor = getEditor();
    if (!editor?._iframeWindow) {
      return null;
    }

    const editorCore = editor._iframeWindow.document.querySelector(".editor-core");
    if (!editorCore) {
      return null;
    }

    return editorCore.scrollTop;
  } catch (e) {
    console.error("Failed to save scroll position:", e);
    return null;
  }
}

function restoreScrollPosition(scrollTop: number): void {
  try {
    const editor = getEditor();
    if (!editor?._iframeWindow) {
      return;
    }

    const editorCore = editor._iframeWindow.document.querySelector(".editor-core");
    if (!editorCore) {
      return;
    }

    editorCore.scrollTop = scrollTop;
  } catch (e) {
    console.error("Failed to restore scroll position:", e);
  }
}

async function waitForEditorReady(): Promise<void> {
  const maxAttempts = 50; // Maximum 5 seconds (50 * 100ms)
  let attempts = 0;

  return new Promise((resolve) => {
    const checkEditor = () => {
      attempts++;

      try {
        const editor = getEditor();
        if (editor?._iframeWindow && editor._initPromise) {
          // Wait for editor initialization promise
          editor._initPromise.then(() => {
            // Give it a bit more time for DOM to settle
            setTimeout(() => resolve(), 100);
          }).catch(() => {
            // If promise fails, still resolve to avoid hanging
            resolve();
          });
          return;
        }
      } catch (e) {
        // Ignore errors during checking
      }

      if (attempts >= maxAttempts) {
        // Timeout, resolve anyway
        resolve();
        return;
      }

      // Check again after 100ms
      setTimeout(checkEditor, 100);
    };

    checkEditor();
  });
}

window.updateTitle = updateTitle;
