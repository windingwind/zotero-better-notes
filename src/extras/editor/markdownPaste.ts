import { Plugin, PluginKey } from "prosemirror-state";
import { md2html } from "../../utils/convert";

export { initMarkdownPastePlugin, MarkdownPasteOptions };

declare const _currentEditorInstance: {
  _editorCore: EditorCore;
};

interface MarkdownPasteOptions {
  enable: boolean;
}

function initMarkdownPastePlugin(plugins: readonly Plugin[]) {
  const core = _currentEditorInstance._editorCore;
  console.log("Init BN Markdown Paste Plugin");
  const key = new PluginKey("pasteDropPlugin");
  const oldPastePluginIndex = plugins.findIndex(
    (plugin) => plugin.props.handlePaste && plugin.props.handleDrop,
  );
  if (oldPastePluginIndex === -1) {
    console.error("Paste plugin not found");
    return plugins;
  }
  const oldPastePlugin = plugins[oldPastePluginIndex];
  return [
    ...plugins.slice(0, oldPastePluginIndex),
    new Plugin({
      key,
      props: {
        handlePaste: (view, event, slice) => {
          if (!event.clipboardData) {
            return false;
          }
          const markdown = getMarkdown(event.clipboardData);

          if (!markdown) {
            // Try the old paste plugin
            return oldPastePlugin.props.handlePaste?.apply(oldPastePlugin, [
              view,
              event,
              slice,
            ]);
          }

          md2html(markdown).then((html: string) => {
            const slice = window.BetterNotesEditorAPI.getSliceFromHTML(
              view.state,
              html,
            );
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr);
          });
          return true;
        },
        handleDrop: (view, event, slice, moved) => {
          if (!event.dataTransfer) {
            return false;
          }

          const markdown = getMarkdown(event.dataTransfer);
          if (!markdown) {
            // Try the old drop plugin first
            return oldPastePlugin.props.handleDrop?.apply(oldPastePlugin, [
              view,
              event,
              slice,
              moved,
            ]);
          }

          md2html(markdown).then((html: string) => {
            const slice = window.BetterNotesEditorAPI.getSliceFromHTML(
              view.state,
              html,
            );
            const pos = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!pos) {
              return;
            }
            // Insert the slice to the current position
            const tr = view.state.tr.insert(pos.pos, slice);
            view.dispatch(tr);
          });

          return true;
        },
      },
      view: (editorView) => {
        return {
          destroy() {},
        };
      },
    }),
    ...plugins.slice(oldPastePluginIndex + 1),
  ];
}

function getMarkdown(clipboardData: DataTransfer) {
  if (clipboardData.types.includes("text/markdown")) {
    return clipboardData.getData("text/markdown");
  }

  // For Typora
  if (clipboardData.types.includes("text/x-markdown")) {
    return clipboardData.getData("text/x-markdown");
  }

  // Match markdown patterns
  if (clipboardData.types.includes("text/plain")) {
    const text = clipboardData.getData("text/plain");
    const markdownPatterns = [
      /^#/m, // Headers: Lines starting with #
      /^\s*[-+*]\s/m, // Unordered lists: Lines starting with -, +, or *
      /^\d+\.\s/m, // Ordered lists: Lines starting with numbers followed by a dot
      /\[.*\]\(.*\)/, // Links: [text](url)
      /`[^`]+`/, // Inline code: `code`
      /^> /m, // Blockquotes: Lines starting with >
      /```/, // Code blocks: Triple backticks
    ];

    for (const pattern of markdownPatterns) {
      if (pattern.test(text)) {
        return text;
      }
    }
  }
  return false;
}
