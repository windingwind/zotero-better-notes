import { getEditorAPI } from "../../utils/editor";

const registry = new Map<string, MagicKeyCommandOptions>();

export function registerMagicKeyCommand(
  options: MagicKeyCommandOptions,
): string | false {
  if (
    !options.id ||
    !options.title ||
    typeof options.handler !== "function" ||
    registry.has(options.id)
  ) {
    return false;
  }
  registry.set(options.id, options);
  for (const editor of Zotero.Notes._editorInstances) {
    void updateEditorCommands(editor);
  }
  return options.id;
}

export function unregisterMagicKeyCommand(id: string): boolean {
  if (!registry.delete(id)) {
    return false;
  }
  for (const editor of Zotero.Notes._editorInstances) {
    void updateEditorCommands(editor);
  }
  return true;
}

export async function initEditorMagicKeyCommands(
  editor: Zotero.EditorInstance,
) {
  if (!registry.size) {
    return;
  }
  await updateEditorCommands(editor);
}

async function updateEditorCommands(editor: Zotero.EditorInstance) {
  await editor._initPromise;
  if (
    Components.utils.isDeadWrapper(editor._iframeWindow) ||
    editor._disableUI
  ) {
    return;
  }
  let EditorAPI: EditorAPI | undefined;
  try {
    EditorAPI = getEditorAPI(editor);
  } catch (e) {
    return;
  }
  if (!EditorAPI?.setMagicKeyCommands) {
    return;
  }
  const commands = Array.from(registry.values(), (options) => ({
    title: options.title,
    icon: options.icon,
    searchParts: options.searchParts?.length
      ? options.searchParts
      : [options.id],
    // Swallow the handler's return value: the editor-side plugin dispatches
    // truthy returns as ProseMirror transactions.
    command: () => {
      (async () => options.handler(editor))().catch((e) =>
        Zotero.logError(e as Error),
      );
    },
    enabled:
      options.enabled &&
      (() => {
        try {
          return !!options.enabled!(editor);
        } catch (e) {
          Zotero.logError(e as Error);
          return false;
        }
      }),
  }));
  EditorAPI.setMagicKeyCommands(
    Components.utils.cloneInto(commands, editor._iframeWindow, {
      wrapReflectors: true,
      cloneFunctions: true,
    }),
  );
}
