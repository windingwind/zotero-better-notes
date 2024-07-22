import TreeModel = require("tree-model");
import { showHintWithLink } from "../../utils/hint";
import { getNoteTree, parseHTMLLines, renderNoteHTML } from "../../utils/note";
import { htmlEscape, htmlUnescape } from "../../utils/str";

export async function saveFreeMind(filename: string, noteId: number) {
  const noteItem = Zotero.Items.get(noteId);
  await Zotero.File.putContentsAsync(filename, await note2mm(noteItem));
  showHintWithLink(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filename);
  });
}

async function note2mm(
  noteItem: Zotero.Item,
  options: { withContent?: boolean } = { withContent: true },
) {
  const root = getNoteTree(noteItem, false);
  const textNodeForEach = (e: Node, callbackfn: (e: any) => void) => {
    if (e.nodeType === Zotero.getMainWindow().document.TEXT_NODE) {
      callbackfn(e);
      return;
    }
    e.childNodes.forEach((_e) => textNodeForEach(_e, callbackfn));
  };
  let lines: string[] = [];
  if (options.withContent) {
    const doc = ztoolkit
      .getDOMParser()
      .parseFromString(await renderNoteHTML(noteItem), "text/html");
    textNodeForEach(doc.body, (e: Text) => {
      e.data = htmlEscape(doc, e.data);
    });
    lines = parseHTMLLines(doc.body.innerHTML).map((line) =>
      htmlUnescape(line),
    );
  }
  const convertClosingTags = (htmlStr: string) => {
    const regConfs = [
      {
        reg: /<br[^>]*?>/g,
        cbk: (str: string) => "<br></br>",
      },
      {
        reg: /<img[^>]*?>/g,
        cbk: (str: string) => {
          return `<img ${str.match(/src="[^"]+"/g)}></img>`;
        },
      },
    ];
    for (const regConf of regConfs) {
      htmlStr = htmlStr.replace(regConf.reg, regConf.cbk);
    }
    return htmlStr;
  };
  const convertNode = (node: TreeModel.Node<NoteNodeData>) => {
    mmXML += `<node ID="${node.model.id}" TEXT="${htmlEscape(
      Zotero.getMainWindow().document,
      node.model.name || noteItem.getNoteTitle(),
    )}"><hook NAME="AlwaysUnfoldedNode" />`;
    if (
      options.withContent &&
      node.model.lineIndex >= 0 &&
      node.model.endIndex >= 0
    ) {
      mmXML += `<richcontent TYPE="NOTE" CONTENT-TYPE="xml/"><html><head></head><body>${convertClosingTags(
        lines
          .slice(
            node.model.lineIndex,
            node.hasChildren()
              ? node.children[0].model.lineIndex
              : node.model.endIndex + 1,
          )
          .join("\n"),
      )}</body></html></richcontent>`;
    }
    if (node.hasChildren()) {
      node.children.forEach((child: TreeModel.Node<NoteNodeData>) => {
        convertNode(child);
      });
    }
    mmXML += "</node>";
  };
  let mmXML = '<map version="freeplane 1.9.0">';
  convertNode(root);
  mmXML += "</map>";
  ztoolkit.log(mmXML);
  return mmXML;
}
