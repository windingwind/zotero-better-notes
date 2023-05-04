import { config } from "../../../package.json";
import { isWindowAlive, localeWindow } from "../../utils/window";
import { messageHandler } from "./message";

export async function showWorkspaceWindow() {
  if (isWindowAlive(addon.data.workspace.window.window)) {
    addon.data.workspace.window.window?.focus();
    return;
  }
  const windowArgs = {
    _initPromise: Zotero.Promise.defer(),
  };
  const win = window.openDialog(
    `chrome://${config.addonRef}/content/workspaceWindow.xhtml`,
    `${config.addonRef}-workspaceWindow`,
    `chrome,centerscreen,resizable,status,width=800,height=400,dialog=no`,
    windowArgs
  )!;
  await windowArgs._initPromise.promise;
  localeWindow(win);
  addon.data.workspace.window.active = true;
  addon.data.workspace.window.window = win;
  addon.data.workspace.window.container = win.document.querySelector(
    "#workspace-container"
  ) as XUL.Box;
  addon.hooks.onInitWorkspace(addon.data.workspace.window.container);
  win.addEventListener("message", messageHandler, false);
  win.addEventListener("unload", function onWindowUnload(ev) {
    addon.data.workspace.window.active = false;
    this.window.removeEventListener("unload", onWindowUnload, false);
    this.window.removeEventListener("message", messageHandler, false);
  });
}
