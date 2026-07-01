import { initLinkPreviewPlugin, LinkPreviewOptions } from "./linkPreview";
import { initMagicKeyPlugin, MagicKeyOptions } from "./magicKey";
import { initMarkdownPastePlugin, MarkdownPasteOptions } from "./markdownPaste";
import { initTaskListPlugin, TaskListOptions } from "./taskList";
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
  taskList: TaskListOptions;
}) {
  const core = _currentEditorInstance._editorCore;
  // Idempotency guard: BN plugins are re-applied whenever the editor core is
  // (re)built. If this core already carries our plugins (each is tagged with a
  // `betterNotes` spec marker), skip so we never append duplicates or clobber
  // the paste plugin twice.
  if (
    core.view.state.plugins.some((plugin) => (plugin.spec as any).betterNotes)
  ) {
    console.log("BN editor plugins already initialized; skipping re-init");
    return;
  }
  let plugins = core.view.state.plugins;
  if (options.linkPreview.previewType !== "disable")
    plugins = initLinkPreviewPlugin(plugins, options.linkPreview);
  if (options.markdownPaste.enable) plugins = initMarkdownPastePlugin(plugins);
  if (options.taskList.enable) plugins = initTaskListPlugin(plugins);
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
