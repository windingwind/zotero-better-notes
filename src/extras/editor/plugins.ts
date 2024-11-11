import { initLinkPreviewPlugin, LinkPreviewOptions } from "./linkPreview";
import { initPasteMarkdownPlugin } from "./pasteMarkdown";

export { initPlugins };

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

function initPlugins(options: LinkPreviewOptions) {
  const core = _currentEditorInstance._editorCore;
  let plugins = core.view.state.plugins;
  plugins = initLinkPreviewPlugin(plugins, options);
  plugins = initPasteMarkdownPlugin(plugins);
  // Collect all plugins and reconfigure the state only once
  const newState = core.view.state.reconfigure({
    plugins,
  });
  core.view.updateState(newState);
}
