const SECTION_CLASS = "bn-editor-section";

const registry = new Map<string, EditorSectionOptions>();

export function registerEditorSection(
  options: EditorSectionOptions,
): string | false {
  if (!options.paneID || registry.has(options.paneID)) {
    return false;
  }
  registry.set(options.paneID, options);
  for (const editor of Zotero.Notes._editorInstances) {
    void mountSection(editor, options);
  }
  return options.paneID;
}

export function unregisterEditorSection(paneID: string): boolean {
  if (!registry.delete(paneID)) {
    return false;
  }
  for (const editor of Zotero.Notes._editorInstances) {
    getHost(editor)
      ?.querySelector(`.${SECTION_CLASS}[data-pane="${paneID}"]`)
      ?.remove();
  }
  return true;
}

export async function initEditorSections(editor: Zotero.EditorInstance) {
  if (editor._disableUI) {
    return;
  }
  for (const options of registry.values()) {
    await mountSection(editor, options);
  }
}

function getHost(editor: Zotero.EditorInstance): HTMLElement | null {
  const win = editor._iframeWindow as any;
  const iframe = win?.browsingContext?.embedderElement ?? win?.frameElement;
  return (iframe?.closest("note-editor") as HTMLElement) ?? null;
}

async function mountSection(
  editor: Zotero.EditorInstance,
  options: EditorSectionOptions,
) {
  await editor._initPromise;
  if (Components.utils.isDeadWrapper(editor._iframeWindow) || !editor._item) {
    return;
  }

  const host = getHost(editor);
  if (!host) {
    return;
  }
  // Skip note previews (note editors nested in the context pane).
  if (
    host.hasAttribute("data-id") ||
    host.classList.contains("bn-note-preview")
  ) {
    return;
  }
  if (options.shouldMount && !options.shouldMount(editor, host)) {
    return;
  }

  const container = host.querySelector("links-box") as HTMLElement | null;
  if (!container) {
    return;
  }

  container.style.maxHeight = "50vh";
  container.style.overflowY = "auto";

  let elem = host.querySelector(
    `.${SECTION_CLASS}[data-pane="${options.paneID}"]`,
  ) as any;

  if (!elem) {
    elem = (host.ownerDocument as any).createXULElement(
      "item-pane-custom-section",
    );
    elem.classList.add(SECTION_CLASS);
    elem.pluginID = options.pluginID;
    elem.paneID = options.paneID;
    elem.bodyXHTML = options.bodyXHTML || "";
    elem.registerSectionIcon({
      icon: options.header.icon,
      darkIcon: options.header.darkIcon,
    });
    elem.registerHook({ type: "init", callback: options.onInit });
    elem.registerHook({ type: "destroy", callback: options.onDestroy });
    elem.registerHook({ type: "itemChange", callback: options.onItemChange });
    elem.registerHook({ type: "render", callback: options.onRender });
    elem.registerHook({ type: "asyncRender", callback: options.onAsyncRender });
    elem.registerHook({ type: "toggle", callback: options.onToggle });
    for (const button of options.sectionButtons || []) {
      elem.registerSectionButton(button);
    }
    // Appending upgrades the custom element and synchronously runs init().
    container.append(elem);

    elem.setL10nID(options.header.l10nID);
    if (options.header.l10nArgs) {
      elem.setL10nArgs(options.header.l10nArgs);
    }
  }

  // Setting `item` fires the itemChange hook; `_forceRenderAll` fires render.
  elem.tabType = "note";
  elem.editable = !editor._readOnly;
  elem.item = editor._item;
  await elem._forceRenderAll();
}
