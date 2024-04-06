export function initWorkspace(container: XUL.Box, item: Zotero.Item) {
  if (!container) {
    return;
  }

  container.style.minWidth = "0px";
  container.style.minHeight = "0px";

  // @ts-ignore
  const customElements = container.ownerGlobal
    .customElements as CustomElementRegistry;

  const workspace = new (customElements.get("bn-workspace")!)() as any;
  container.append(workspace);
  workspace.item = item;
  workspace.containerType = "tab";
  workspace.render();
}
