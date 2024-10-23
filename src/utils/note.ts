import TreeModel = require("tree-model");
import katex = require("katex");
import { getEditorInstance, getPositionAtLine, insert } from "./editor";
import { formatPath, getItemDataURL } from "./str";
import { config } from "../../package.json";
import { getParsingServer } from "./parsing";

export {
  renderNoteHTML,
  parseHTMLLines,
  getLinesInNote,
  addLineToNote,
  getNoteTree,
  getNoteTreeFlattened,
  getNoteTreeNodeById,
  copyEmbeddedImagesFromNote,
  copyEmbeddedImagesInHTML,
  importImageToNote,
};

async function parseHTMLLines(html: string) {
  const server = await getParsingServer();
  return await server.exec("parseHTMLLines", [html]);
}

async function getLinesInNote(
  note: Zotero.Item,
  options?: {
    convertToHTML?: boolean;
  },
): Promise<string[]> {
  if (!note) {
    return [];
  }
  const noteText: string = note.getNote();
  if (options?.convertToHTML) {
    return new Promise((resolve) => {
      addon.api.convert.note2html(note).then((html) => {
        resolve(parseHTMLLines(html));
      });
    });
  }
  return parseHTMLLines(noteText);
}

async function setLinesToNote(note: Zotero.Item, lines: string[]) {
  if (!note) {
    return [];
  }
  const noteText: string = note.getNote();
  const containerIndex = noteText.search(/data-schema-version="[0-9]*/g);
  if (containerIndex === -1) {
    note.setNote(
      `<div data-schema-version="${config.dataSchemaVersion}">${lines.join(
        "\n",
      )}</div>`,
    );
  } else {
    const noteHead = noteText.substring(0, containerIndex);
    note.setNote(
      `${noteHead}data-schema-version="${config.dataSchemaVersion
      }">${lines.join("\n")}</div>`,
    );
  }

  await note.saveTx();
}

async function addLineToNote(
  note: Zotero.Item,
  html: string,
  lineIndex: number = -1,
  forceMetadata: boolean = false,
) {
  if (!note || !html) {
    return;
  }
  const noteLines = await getLinesInNote(note);
  if (lineIndex < 0 || lineIndex >= noteLines.length) {
    lineIndex = noteLines.length;
  }
  ztoolkit.log(`insert to ${lineIndex}, it used to be ${noteLines[lineIndex]}`);
  ztoolkit.log(html);

  const editor = getEditorInstance(note.id);
  if (editor && !forceMetadata) {
    // The note is opened. Add line via note editor
    const pos = getPositionAtLine(editor, lineIndex, "start");
    ztoolkit.log("Add note line via note editor", pos);
    insert(editor, html, pos);
    // The selection is automatically moved to the next line
  } else {
    // The note editor does not exits yet. Fall back to modify the metadata
    ztoolkit.log("Add note line via note metadata");
    noteLines.splice(lineIndex, 0, html);
    await setLinesToNote(note, noteLines);
  }
}

async function renderNoteHTML(
  html: string,
  refNotes: Zotero.Item[],
): Promise<string>;
async function renderNoteHTML(noteItem: Zotero.Item): Promise<string>;
async function renderNoteHTML(
  htmlOrNote: string | Zotero.Item,
  refNotes?: Zotero.Item[],
): Promise<string> {
  let html: string;
  if (typeof htmlOrNote === "string") {
    html = htmlOrNote;
    refNotes = (refNotes || []).filter((item) => item.isNote());
  } else {
    const noteItem = htmlOrNote as Zotero.Item;
    if (!noteItem.isNote()) {
      throw new Error("Item is not a note");
    }
    html = noteItem.getNote();
    refNotes = [noteItem];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imageAttachments = refNotes.reduce((acc, note) => {
    acc.push(...Zotero.Items.get(note.getAttachments()));
    return acc;
  }, [] as Zotero.Item[]);

  for (const attachment of imageAttachments) {
    if (await attachment.fileExists()) {
      const imageNodes = Array.from(
        doc.querySelectorAll(`img[data-attachment-key="${attachment.key}"]`),
      ) as HTMLImageElement[];
      if (imageNodes.length) {
        try {
          const b64 = await getItemDataURL(attachment);
          imageNodes.forEach((node) => {
            node.setAttribute("src", b64);
            const width = Number(node.getAttribute("width"));
            const height = Number(node.getAttribute("height"));
            // 650/470 is the default width of images in Word
            const maxWidth = Zotero.isMac ? 470 : 650;
            if (width > maxWidth) {
              node.setAttribute("width", maxWidth.toString());
              if (height) {
                node.setAttribute(
                  "height",
                  Math.round((height * maxWidth) / width).toString(),
                );
              }
            }
            if (node.hasAttribute("width")) {
              node.style.width = `${node.getAttribute("width")}px`;
            }
            if (node.hasAttribute("height")) {
              node.style.height = `${node.getAttribute("height")}px`;
            }
          });
        } catch (e) {
          ztoolkit.log(e);
        }
      }
    }
  }

  const bgNodes = doc.querySelectorAll(
    "span[style]",
  ) as NodeListOf<HTMLElement>;
  for (const node of Array.from(bgNodes) as HTMLSpanElement[]) {
    // Browser converts #RRGGBBAA hex color to rgba function, and we convert it to rgb function,
    // because word processors don't understand colors with alpha channel
    if (
      node.style.backgroundColor &&
      node.style.backgroundColor.startsWith("rgba")
    ) {
      node.style.backgroundColor =
        node.style.backgroundColor
          .replace("rgba", "rgb")
          .split(",")
          .slice(0, 3)
          .join(",") + ")";
    }
  }

  const mathDelimiterRegex = /^\$+|\$+$/g;
  doc.querySelectorAll(".math").forEach((node) => {
    const displayMode = node.innerHTML.startsWith("$$");
    node.innerHTML = katex.renderToString(
      node.textContent!.replace(mathDelimiterRegex, ""),
      {
        throwOnError: false,
        // output: "mathml",
        displayMode,
      },
    );
  });
  return doc.body.innerHTML;
}

async function getNoteTree(
  note: Zotero.Item,
  parseLink: boolean = true,
): Promise<TreeModel.Node<NoteNodeData>> {
  const timeLabel = `getNoteTree-${note.id}-${Math.random()}`;
  Zotero.getMainWindow().console.time(timeLabel);

  const noteLines = await getLinesInNote(note);
  const parser = new DOMParser();
  const tree = new TreeModel();
  const root = tree.parse({
    id: -1,
    level: 0,
    lineIndex: -1,
    endIndex: -1,
  });
  let id = 0;
  let lastNode = root;
  const headingRegex = new RegExp("^<h([1-6])(.*?)</h[1-6]>");
  const linkRegex = new RegExp('href="(zotero://note/[^"]*)"');
  for (const i in noteLines) {
    let currentLevel = 7;
    const lineElement = noteLines[i];
    const matchHeadingResult = lineElement.match(headingRegex);
    const matchLinkResult = parseLink ? lineElement.match(linkRegex) : null;
    const isHeading = Boolean(matchHeadingResult);
    // Links in blockquote are ignored
    const isLink =
      Boolean(matchLinkResult) && !noteLines[i].startsWith("<blockquote");
    if (isHeading || isLink) {
      let name = "";
      let link = "";
      if (isHeading) {
        currentLevel = parseInt(matchHeadingResult![1] || "7");
      } else {
        link = matchLinkResult![1];
      }
      name = parser.parseFromString(lineElement, "text/html").body.innerText;

      // Find parent node
      let parentNode = lastNode;
      while (parentNode.model.level >= currentLevel) {
        parentNode = parentNode.parent;
      }

      const currentNode = tree.parse({
        id: id++,
        level: currentLevel,
        name: name,
        lineIndex: parseInt(i),
        endIndex: noteLines.length - 1,
        link: link,
      });
      parentNode.addChild(currentNode);
      const currentIndex = parentNode.children.indexOf(currentNode);
      if (currentIndex > 0) {
        const previousNode = parentNode.children[
          currentIndex - 1
        ] as TreeModel.Node<NoteNodeData>;
        // Traverse the previous node tree and set the end index
        previousNode.walk((node) => {
          if (node.model.endIndex > parseInt(i) - 1) {
            node.model.endIndex = parseInt(i) - 1;
          }
          Zotero.getMainWindow().console.timeEnd(timeLabel);

          return true;
        });
        previousNode.model.endIndex = parseInt(i) - 1;
      }
      lastNode = currentNode;
    }
  }
  Zotero.getMainWindow().console.timeEnd(timeLabel);
  return root;
}

async function getNoteTreeFlattened(
  note: Zotero.Item,
  options: {
    keepRoot?: boolean;
    keepLink?: boolean;
    customFilter?: (node: TreeModel.Node<NoteNodeData>) => boolean;
  } = { keepRoot: false, keepLink: false },
): Promise<TreeModel.Node<NoteNodeData>[]> {
  if (!note) {
    return [];
  }
  return (await getNoteTree(note)).all(
    (node) =>
      (options.keepRoot || node.model.lineIndex >= 0) &&
      (options.keepLink || node.model.level <= 6) &&
      (options.customFilter ? options.customFilter(node) : true),
  );
}

async function getNoteTreeNodeById(
  note: Zotero.Item,
  id: number,
  root: TreeModel.Node<NoteNodeData> | undefined = undefined,
) {
  root = root || (await getNoteTree(note));
  return root.first(function (node) {
    return node.model.id === id;
  });
}

async function getNoteTreeNodesByLevel(
  note: Zotero.Item,
  level: number,
  root: TreeModel.Node<NoteNodeData> | undefined = undefined,
) {
  root = root || (await getNoteTree(note));
  return root.all(function (node) {
    return node.model.level === level;
  });
}

async function copyEmbeddedImagesFromNote(
  targetNote: Zotero.Item,
  sourceNotes: Zotero.Item[],
) {
  await Zotero.DB.executeTransaction(async () => {
    for (const fromNote of sourceNotes) {
      await Zotero.Notes.copyEmbeddedImages(fromNote, targetNote);
    }
  });
}

async function copyEmbeddedImagesInHTML(
  html: string,
  targetNote?: Zotero.Item,
  refNotes: Zotero.Item[] = [],
) {
  ztoolkit.log(
    "parseEmbeddedImagesInHTML",
    html,
    targetNote?.getNoteTitle(),
    refNotes.length,
  );
  if (!targetNote) {
    return html;
  }

  const attachments = refNotes.reduce((acc, note) => {
    acc.push(...Zotero.Items.get(note.getAttachments()));
    return acc;
  }, [] as Zotero.Item[]);
  if (!attachments.length) {
    return html;
  }

  ztoolkit.log(attachments.length, "attachments found in refNotes");

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Copy note image attachments and replace keys in the new note
  for (const attachment of attachments) {
    if (await attachment.fileExists()) {
      const nodes = Array.from(
        doc.querySelectorAll(`img[data-attachment-key="${attachment.key}"]`),
      ) as HTMLImageElement[];
      if (nodes.length) {
        let copiedAttachment: Zotero.Item;
        await Zotero.DB.executeTransaction(async () => {
          Zotero.DB.requireTransaction();
          copiedAttachment = await Zotero.Attachments.copyEmbeddedImage({
            attachment,
            note: targetNote,
          });
        });
        nodes.forEach((node) =>
          node?.setAttribute("data-attachment-key", copiedAttachment.key), Node
        );
      }
    }
  }
  ztoolkit.log("embed", doc.body.innerHTML);
  return doc.body.innerHTML;
}

function dataURLtoBlob(dataurl: string) {
  const parts = dataurl.split(",");
  const matches = parts[0]?.match(/:(.*?);/);
  if (!matches || !matches[1]) {
    return;
  }
  const mime = matches[1];
  if (parts[0].indexOf("base64") !== -1) {
    const bstr = ztoolkit.getGlobal("atob")(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new (ztoolkit.getGlobal("Blob"))([u8arr], {
      type: mime,
    });
  }
  return null;
}

async function importImageToNote(
  note: Zotero.Item,
  src: string,
  type: "b64" | "url" | "file" = "b64",
): Promise<string | void> {
  if (!note || !note.isNote()) {
    return "";
  }
  let blob: Blob;
  if (src.startsWith("data:")) {
    const dataBlob = dataURLtoBlob(src);
    if (!dataBlob) {
      return;
    }
    blob = dataBlob;
  } else if (type === "url") {
    let res;
    try {
      res = await Zotero.HTTP.request("GET", src, { responseType: "blob" });
    } catch (e) {
      return;
    }
    blob = res.response;
  } else if (type === "file") {
    src = formatPath(src);
    const noteAttachmentKeys = Zotero.Items.get(note.getAttachments()).map(
      (_i) => _i.key,
    );
    const filename = src.split("/").pop()?.split(".").shift();
    // The exported image is KEY.png by default.
    // If it is already an attachment, just keep it.
    if (noteAttachmentKeys.includes(filename || "")) {
      return filename;
    }
    const imageData = await Zotero.File.getBinaryContentsAsync(src);
    const array = new Uint8Array(imageData.length);
    for (let i = 0; i < imageData.length; i++) {
      array[i] = imageData.charCodeAt(i);
    }
    blob = new Blob([array], { type: "image/png" });
  } else {
    return;
  }

  if (!blob) {
    ztoolkit.log("Failed to import image.");
    return;
  }

  const attachment = await Zotero.Attachments.importEmbeddedImage({
    blob,
    parentItemID: note.id,
    saveOptions: {},
  });

  return attachment.key;
}
