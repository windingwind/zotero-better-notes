import { config } from "../../../package.json";
import { VirtualizedTableHelper } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import { PluginCEBase } from "../base";
import TreeModel = require("tree-model");
import { waitUtilAsync } from "../../utils/wait";

export class NotePreview extends PluginCEBase {
  _item?: Zotero.Item;
  noteOutlineView!: VirtualizedTableHelper;
  noteOutline: TreeModel.Node<NoteNodeData>[] = [];

  get content() {
    return MozXULElement.parseXULToFragment(`
<linkset>
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/linkCreator/notePreview.css"
  ></html:link>
</linkset>
<hbox class="toolbar">
  <hbox class="toolbar-start"></hbox>
  <hbox class="toolbar-middle"></hbox>
  <hbox class="toolbar-end"></hbox>
</hbox>
<vbox id="bn-note-preview-content" class="container">
  <iframe
    id="bn-note-preview"
    class="container"
    type="content"
  ></iframe>
</vbox>
`);
  }

  async init() {}

  async render(options: { before: string; middle: string; after: string }) {
    const iframe = this.querySelector("#bn-note-preview") as HTMLIFrameElement;

    const activeElement = document.activeElement as HTMLElement;

    iframe!.contentDocument!.documentElement.innerHTML = `<html>
    <head>
      <title></title>
      <link
        rel="stylesheet"
        type="text/css"
        href="chrome://zotero-platform/content/zotero.css"
      />
      <link
        rel="stylesheet"
        type="text/css"
        href="chrome://${config.addonRef}/content/lib/css/github-markdown.css"
      />
      <link
        rel="stylesheet"
        href="chrome://${config.addonRef}/content/lib/css/katex.min.css"
        crossorigin="anonymous"
      />
      <style>
        html {
          color-scheme: light dark;
          background: var(--material-sidepane);
        }
        body {
          overflow-x: clip;
        }
        #inserted {
          border: var(--material-border);
          box-shadow: 0 2px 5px color-mix(in srgb, var(--material-background) 15%, transparent);
          border-radius: 4px;
          background: var(--material-background);
          padding: 10px;
          transition: all 0.3s ease;
        }
        #inserted:hover {
          box-shadow: 0 5px 15px color-mix(in srgb, var(--material-background) 20%, transparent);
          background: var(--color-background50);
        }
      </style>
    </head>
    <body>
      <div>${options.before}</div>
      <div id="inserted">${options.middle}</div>
      <div>${options.after}</div>
    </body>
  </html>
  `;
    activeElement?.focus();
    await waitUtilAsync(
      () => iframe.contentDocument?.readyState === "complete",
    );

    // Scroll the inserted section into the center of the iframe
    const inserted = iframe.contentDocument?.getElementById("inserted");
    if (inserted) {
      const rect = inserted.getBoundingClientRect();
      const container = inserted.parentElement!;
      container.scrollTo({
        top:
          container.scrollTop +
          rect.top -
          container.clientHeight / 2 +
          rect.height,
        behavior: "smooth",
      });
    }
  }
}
