import { config } from "../../../package.json";

export async function openWorkspaceWindow(
  item: Zotero.Item,
  options: { lineIndex?: number; sectionName?: string } = {},
) {
  const windowArgs = {
    _initPromise: Zotero.Promise.defer(),
  };
  const win = Zotero.getMainWindow().openDialog(
    `chrome://${config.addonRef}/content/workspaceWindow.xhtml`,
    `${config.addonRef}-workspaceWindow`,
    `chrome,centerscreen,resizable,status,width=800,height=400,dialog=no`,
    windowArgs,
  )!;
  await windowArgs._initPromise.promise;

  const container = win.document.querySelector(
    "#workspace-container",
  ) as XUL.Box;
  const workspace = await addon.hooks.onInitWorkspace(container, item);
  workspace?.scrollEditorTo(options);

  win.focus();
  win.updateTitle();
  return win;
}
