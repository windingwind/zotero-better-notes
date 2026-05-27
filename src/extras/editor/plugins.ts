import { initLinkPreviewPlugin, LinkPreviewOptions } from "./linkPreview";
import { initMagicKeyPlugin, MagicKeyOptions } from "./magicKey";
import { initMarkdownPastePlugin, MarkdownPasteOptions } from "./markdownPaste";
// Use custom column resizing plugin, since the original one breaks
import { columnResizing } from "./columnResizing";
import { initNodeViews } from "./nodeViews";

export { initPlugins };

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

function initPlugins(options: {
  linkPreview: LinkPreviewOptions;
  magicKey: MagicKeyOptions;
  markdownPaste: MarkdownPasteOptions;
}) {
  const core = _currentEditorInstance._editorCore;
  let plugins = core.view.state.plugins;
  if (options.linkPreview.previewType !== "disable")
    plugins = initLinkPreviewPlugin(plugins, options.linkPreview);
  if (options.markdownPaste.enable) plugins = initMarkdownPastePlugin(plugins);
  plugins = initMagicKeyPlugin(plugins, options.magicKey);
  // Zotero 10's bundled note-editor already registers a `tableColumnResizing`
  // plugin in the base editor state. ProseMirror's `reconfigure` rejects two
  // plugins sharing the same `PluginKey`, so adding our custom
  // `columnResizing` on top throws — and the throw aborts `reconfigure`,
  // which means `linkPreview` / `magicKey` / `markdownPaste` are never
  // installed and the in-editor hover-preview, magic key, and markdown
  // paste features silently stop working (see issue #1579).
  //
  // Strip any pre-existing `tableColumnResizing` plugin from the inherited
  // list so our replacement wins, mirroring how the upstream note-editor
  // build composes the resize plugin in.
  const filteredPlugins = plugins.filter(
    (p: any) => p?.spec?.key?.key !== "tableColumnResizing$1",
  );
  // Collect all plugins and reconfigure the state only once
  const newState = core.view.state.reconfigure({
    plugins: [
      ...filteredPlugins,
      columnResizing({
        cellMinWidth: 80,
        handleWidth: 5,
      }),
    ],
  });

  // Zotero 10's `TableView` constructor now requires an `editorView`
  // argument; calling the older 0-arg form throws. The throw aborts
  // `initPlugins` before `updateState` runs, so the same silent breakage
  // applies. Swallow the failure here — node-view registration is not
  // load-bearing for hover-preview / magic key / markdown paste.
  try {
    initNodeViews(core.view);
  } catch (e) {
    console.warn("[BetterNotes] initNodeViews failed:", e);
  }

  core.view.updateState(newState);
}
