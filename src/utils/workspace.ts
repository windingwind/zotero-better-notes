export enum OutlineType {
  empty = 0,
  treeView,
  mindMap,
  bubbleMap,
}

export function getWorkspaceByUID(uid: string): HTMLElement | undefined {
  const workspace = addon.data.workspace.instances[uid]?.deref();
  if (!workspace?.ownerDocument) {
    delete addon.data.workspace.instances[uid];
    return undefined;
  }
  return workspace;
}
