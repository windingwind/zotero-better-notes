import { config } from "../../../package.json";

export async function openWorkspaceWindow(item: Zotero.Item) {
  const windowArgs = {
    _initPromise: Zotero.Promise.defer(),
  };
  const win = window.openDialog(
    `chrome://${config.addonRef}/content/workspaceWindow.xhtml`,
    `${config.addonRef}-workspaceWindow`,
    `chrome,centerscreen,resizable,status,width=800,height=400,dialog=no`,
    windowArgs,
  )!;
  await windowArgs._initPromise.promise;

  const container = win.document.querySelector(
    "#workspace-container",
  ) as XUL.Box;
  addon.hooks.onInitWorkspace(container, item);
}
