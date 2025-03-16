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
  // Collect all plugins and reconfigure the state only once
  const newState = core.view.state.reconfigure({
    plugins: [
      ...plugins,
      columnResizing({
        cellMinWidth: 80,
        handleWidth: 5,
      }),
    ],
  });

  initNodeViews(core.view);

  core.view.updateState(newState);
}
