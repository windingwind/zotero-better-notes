import { config } from "../../package.json";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { toHtml } from "hast-util-to-html";
import { toText } from "hast-util-to-text";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
// visit may push nodes twice, use new Array(...new Set(nodes))
// if the you want to process nodes outside visit
import { visit } from "unist-util-visit";
import rehypeFormat from "rehype-format";
import { h } from "hastscript";
import YAML = require("yamljs");

import { Root as HRoot } from "hast";
import { Root as MRoot } from "mdast";
import { fileExists, formatPath, jointPath, randomString } from "./str";
import {
  copyEmbeddedImagesInHTML,
  importImageToNote,
  renderNoteHTML,
} from "./note";
import {
  getLinkedNotesRecursively,
  getNoteLink,
  getNoteLinkParams,
} from "./link";
import { parseAnnotationHTML } from "./annotation";
import { getPref } from "./prefs";
import { showHint, showHintWithLink } from "./hint";
import { MessageHelper, wait } from "zotero-plugin-toolkit";
import { handlers } from "../extras/convertWorker/main";

export {
  md2note,
  note2md,
  note2noteDiff,
  note2link,
  link2note,
  link2params,
  link2html,
  md2html,
  html2md,
  annotations2html,
  note2html,
  note2latex,
  closeConvertServer,
};

function closeConvertServer() {
  if (addon.data.convert.server) {
    addon.data.convert.server.destroy();
    addon.data.convert.server = undefined;
  }
}

async function getConvertServer() {
  if (addon.data.convert.server) {
    return addon.data.convert.server;
  }

  const worker = new Worker(
    `chrome://${config.addonRef}/content/scripts/convertWorker.js`,
    { name: "convertWorker" },
  );
  const server = new MessageHelper<typeof handlers>({
    canBeDestroyed: false,
    dev: __env__ === "development",
    name: "convertWorkerMain",
    target: worker,
    handlers: {},
  });
  server.start();
  await server.proxy._ping();
  addon.data.convert.server = server;
  return server;
}

async function note2rehype(
  ...args: Parameters<(typeof handlers)["note2rehype"]>
) {
  const server = await getConvertServer();
  return await server.proxy.note2rehype(...args);
}

async function rehype2remark(
  ...args: Parameters<(typeof handlers)["rehype2remark"]>
) {
  const server = await getConvertServer();
  return await server.proxy.rehype2remark(...args);
}

async function rehype2note(
  ...args: Parameters<(typeof handlers)["rehype2note"]>
) {
  const server = await getConvertServer();
  return await server.proxy.rehype2note(...args);
}

async function remark2rehype(
  ...args: Parameters<(typeof handlers)["remark2rehype"]>
) {
  const server = await getConvertServer();
  return await server.proxy.remark2rehype(...args);
}

async function md2remark(...args: Parameters<(typeof handlers)["md2remark"]>) {
  const server = await getConvertServer();
  return await server.proxy.md2remark(...args);
}

async function remark2md(...args: Parameters<(typeof handlers)["remark2md"]>) {
  const server = await getConvertServer();
  return await server.proxy.remark2md(...args);
}

async function remark2latex(
  ...args: Parameters<(typeof handlers)["remark2latex"]>
) {
  const server = await getConvertServer();
  return await server.proxy.remark2latex(...args);
}

async function note2md(
  noteItem: Zotero.Item,
  dir: string,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
    cachedYAMLHeader?: Record<string, any>;
    skipSavingImages?: boolean;
  } = {},
) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = await note2rehype(noteStatus.content);
  processN2MRehypeHighlightNodes(
    getN2MRehypeHighlightNodes(rehype as HRoot),
    NodeMode.direct,
  );
  processN2MRehypeCitationNodes(
    getN2MRehypeCitationNodes(rehype as HRoot),
    NodeMode.direct,
  );
  await processN2MRehypeNoteLinkNodes(
    getN2MRehypeNoteLinkNodes(rehype),
    dir,
    options.keepNoteLink ? NodeMode.default : NodeMode.direct,
  );
  await processN2MRehypeImageNodes(
    getN2MRehypeImageNodes(rehype),
    noteItem.libraryID,
    jointPath(dir, getPref("syncAttachmentFolder") as string),
    options.skipSavingImages,
    false,
    NodeMode.direct,
  );
  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    throw new Error("Parsing Error: Rehype2Remark");
  }
  let md = await remark2md(remark as MRoot);
  try {
    md =
      (await addon.api.template.runTemplate(
        "[ExportMDFileContent]",
        "noteItem, mdContent",
        [noteItem, md],
      )) ?? md;
  } catch (e) {
    ztoolkit.log(e);
  }

  if (options.withYAMLHeader) {
    let header = {} as Record<string, any>;
    try {
      header = JSON.parse(
        await addon.api.template.runTemplate(
          "[ExportMDFileHeaderV2]",
          "noteItem",
          [noteItem],
        ),
      );
      const cachedHeader = options.cachedYAMLHeader || {};
      for (const key in cachedHeader) {
        if ((key === "tags" || key.startsWith("$")) && key in header) {
          // generated header overwrites cached header
          continue;
        } else {
          // otherwise do not overwrite
          header[key] = cachedHeader[key];
        }
      }
    } catch (e) {
      ztoolkit.log(e);
    }
    Object.assign(header, {
      $version: noteItem.version,
      $libraryID: noteItem.libraryID,
      $itemKey: noteItem.key,
    });
    const yamlFrontMatter = `---\n${YAML.stringify(header, 10)}\n---`;
    md = `${yamlFrontMatter}\n${md}`;
  }
  return md;
}

async function md2note(
  mdStatus: MDStatus,
  noteItem: Zotero.Item,
  options: { isImport?: boolean } = {},
) {
  const remark = await md2remark(mdStatus.content);
  const _rehype = await remark2rehype(remark);
  const _note = await rehype2note(_rehype as HRoot);
  const rehype = await note2rehype(_note);

  // Check if image citation already belongs to note
  processM2NRehypeMetaImageNodes(getM2NRehypeImageNodes(rehype));

  processM2NRehypeHighlightNodes(getM2NRehypeHighlightNodes(rehype));
  await processM2NRehypeCitationNodes(
    getM2NRehypeCitationNodes(rehype),
    options.isImport,
  );
  processM2NRehypeNoteLinkNodes(getM2NRehypeNoteLinkNodes(rehype));
  await processM2NRehypeImageNodes(
    getM2NRehypeImageNodes(rehype),
    noteItem,
    mdStatus.filedir,
    options.isImport,
  );
  const noteContent = await rehype2note(rehype as HRoot);
  return noteContent;
}

async function note2latex(
  noteItem: Zotero.Item,
  dir: string,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
    cachedYAMLHeader?: Record<string, any>;
    skipSavingImages?: boolean;
  } = {},
) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = await note2rehype(noteStatus.content);

  await processN2LRehypeCitationNodes(
    getN2MRehypeCitationNodes(rehype as HRoot),
  );
  await processN2LRehypeHeaderNodes(getN2LRehypeHeaderNodes(rehype as HRoot));
  await processN2LRehypeLinkNodes(getN2LRehypeLinkNodes(rehype as HRoot));
  await processN2LRehypeListNodes(getN2LRehypeListNodes(rehype as HRoot));
  await processN2LRehypeTableNodes(getN2LRehypeTableNodes(rehype as HRoot));
  await processN2LRehypeImageNodes(
    getN2MRehypeImageNodes(rehype),
    noteItem.libraryID,
    jointPath(dir, getPref("syncAttachmentFolder") as string),
    options.skipSavingImages,
    false,
    NodeMode.direct,
  );

  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    throw new Error("Parsing Error: Rehype2Remark");
  }
  let latex = await remark2latex(remark as MRoot);
  try {
    latex =
      (await addon.api.template.runTemplate(
        "[ExportLatexFileContent]",
        "noteItem, latexContent",
        [noteItem, latex],
      )) ?? latex;
  } catch (e) {
    ztoolkit.log(e);
  }

  return latex;
}

async function note2noteDiff(noteItem: Zotero.Item) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = await note2rehype(noteStatus.content);
  await processM2NRehypeCitationNodes(getM2NRehypeCitationNodes(rehype), true);
  // Parse content like citations
  return await rehype2note(rehype as HRoot);
}

function note2link(
  noteItem: Zotero.Item,
  options: Parameters<typeof getNoteLink>[1] = {},
) {
  return getNoteLink(noteItem, options);
}

function link2note(link: string) {
  return getNoteLinkParams(link).noteItem;
}

function link2params(link: string) {
  return getNoteLinkParams(link);
}

async function link2html(
  link: string,
  options: {
    noteItem?: Zotero.Item;
    dryRun?: boolean;
    usePosition?: boolean;
  } = {},
) {
  ztoolkit.log(
    "link2html",
    link,
    options.noteItem?.id,
    options.dryRun,
    options.usePosition,
  );
  const linkParams = getNoteLinkParams(link);
  if (!linkParams.noteItem) {
    return "";
  }
  const refIds = getLinkedNotesRecursively(link);
  const refNotes = options.noteItem ? Zotero.Items.get(refIds) : [];
  ztoolkit.log(refIds);
  let html;
  if (options.usePosition) {
    const item = linkParams.noteItem;
    let lineIndex = linkParams.lineIndex;

    if (typeof linkParams.sectionName === "string") {
      const sectionTree = await addon.api.note.getNoteTreeFlattened(item);
      const sectionNode = sectionTree.find(
        (node) => node.model.name.trim() === linkParams.sectionName!.trim(),
      );
      lineIndex = sectionNode?.model.lineIndex;
    }
    html = (await addon.api.note.getLinesInNote(item))
      .slice(lineIndex)
      .join("\n");
  } else {
    html = addon.api.sync.getNoteStatus(linkParams.noteItem.id)?.content || "";
  }
  if (options.dryRun) {
    return await renderNoteHTML(html, refNotes);
  } else {
    return await copyEmbeddedImagesInHTML(
      // Only embed the note content
      html,
      options.noteItem,
      refNotes,
    );
  }
}

async function md2html(md: string) {
  const remark = await md2remark(md);
  const rehype = await remark2rehype(remark);
  const html = await rehype2note(rehype as HRoot);
  const parsedHTML = await parseKatexHTML(html);
  return parsedHTML;
}

async function html2md(html: string) {
  const rehype = await note2rehype(html);
  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    throw new Error("Parsing Error: HTML2MD");
  }
  const md = await remark2md(remark as MRoot);
  return md;
}

function annotations2html(
  annotations: Zotero.Item[],
  options: Parameters<typeof parseAnnotationHTML>[1] = {},
) {
  return parseAnnotationHTML(annotations, options);
}

async function note2html(
  noteItems: Zotero.Item | Zotero.Item[],
  options: {
    targetNoteItem?: Zotero.Item;
    html?: string;
    dryRun?: boolean;
  } = {},
) {
  if (!Array.isArray(noteItems)) {
    noteItems = [noteItems];
  }
  const { targetNoteItem, dryRun } = options;
  let html = options.html;
  if (!html) {
    html = noteItems.map((item) => item.getNote()).join("\n");
  }
  if (!dryRun && targetNoteItem?.isNote()) {
    const str = await copyEmbeddedImagesInHTML(html, targetNoteItem, noteItems);
    return str;
  }
  return await renderNoteHTML(html, noteItems);
}

async function parseKatexHTML(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // https://github.com/windingwind/zotero-better-notes/issues/1356
  doc
    .querySelectorAll("span.katex, span.katex-display")
    .forEach((katexSpan) => {
      // Look for the annotation element that holds the original TeX code.
      const annotation = katexSpan.querySelector(
        'annotation[encoding="application/x-tex"]',
      );
      if (annotation) {
        const isBlock = !!katexSpan.querySelector("math[display=block");
        let container: HTMLElement;

        if (isBlock) {
          container = doc.createElement("pre");
          container.textContent = `$$${annotation.textContent}$$`;
        } else {
          container = doc.createElement("span");
          container.textContent = `$${annotation.textContent}$`;
        }
        container.classList.add("math");
        // Replace the entire KaTeX span with the inline math string.
        katexSpan.parentNode?.replaceChild(container, katexSpan);
      }
    });
  return doc.body.innerHTML;
}

async function rehype2rehype(rehype: HRoot) {
  return unified()
    .use(rehypeFormat)
    .run(rehype as any);
}

function replace(targetNode: any, sourceNode: any) {
  targetNode.type = sourceNode.type;
  targetNode.tagName = sourceNode.tagName;
  targetNode.properties = sourceNode.properties;
  targetNode.value = sourceNode.value;
  targetNode.children = sourceNode.children;
}

function getN2MRehypeHighlightNodes(rehype: HRoot) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.properties?.className?.includes("highlight"),
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function getN2MRehypeCitationNodes(rehype: HRoot) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.properties?.className?.includes("citation"),
    (node) => {
      nodes.push(node);
    },
  );
  return new Array(...new Set(nodes));
}

function getN2MRehypeNoteLinkNodes(rehype: any) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.tagName === "a" &&
      node.properties?.href &&
      /zotero:\/\/note\/\w+\/\w+\//.test(node.properties?.href),
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function getN2MRehypeImageNodes(rehype: any) {
  const nodes: any[] = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      node.tagName === "img" &&
      node.properties?.dataAttachmentKey,
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function processN2MRehypeHighlightNodes(
  nodes: string | any[],
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let annotation;
    try {
      annotation = JSON.parse(
        decodeURIComponent(node.properties.dataAnnotation),
      );
    } catch (e) {
      continue;
    }
    if (!annotation) {
      continue;
    }
    // annotation.uri was used before note-editor v4
    const uri = annotation.attachmentURI || annotation.uri;
    const position = annotation.position;

    if (typeof uri === "string" && typeof position === "object") {
      let openURI;
      const uriParts = uri.split("/");
      const libraryType = uriParts[3];
      const key = uriParts[uriParts.length - 1];
      if (libraryType === "users") {
        openURI = "zotero://open/library/items/" + key;
      }
      // groups
      else {
        const groupID = uriParts[4];
        openURI = "zotero://open/groups/" + groupID + "/items/" + key;
      }

      openURI +=
        "?page=" +
        (position.pageIndex + 1) +
        (annotation.annotationKey
          ? "&annotation=" + annotation.annotationKey
          : "");

      let newNode = h("span", [
        h(node.tagName, node.properties, node.children),
        h("span", " ("),
        h("a", { href: openURI }, ["pdf"]),
        h("span", ") "),
      ]);
      const annotKey =
        annotation.annotationKey ||
        randomString(
          8,
          Zotero.Utilities.Internal.md5(node.properties.dataAnnotation),
          Zotero.Utilities.allowedKeyChars,
        );

      if (mode === NodeMode.wrap) {
        newNode.children.splice(0, 0, h("wrapperleft", `annot:${annotKey}`));
        newNode.children.push(h("wrapperright", `annot:${annotKey}`));
      } else if (mode === NodeMode.replace) {
        newNode = h("placeholder", `annot:${annotKey}`);
      } else if (mode === NodeMode.direct) {
        const newChild = h("span") as any;
        replace(newChild, node);
        newChild.children = [h("a", { href: openURI }, node.children)];
        newChild.properties.ztype = "zhighlight";
        newNode = h("zhighlight", [newChild]);
      }
      replace(node, newNode);
    }
  }
}

function processN2MRehypeCitationNodes(
  nodes: string | any[],
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let citation;
    try {
      citation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
    } catch (e) {
      continue;
    }
    if (!citation?.citationItems?.length) {
      continue;
    }

    const uris: any[] = [];
    for (const citationItem of citation.citationItems) {
      const uri = citationItem.uris[0];
      if (typeof uri === "string") {
        const uriParts = uri.split("/");
        const libraryType = uriParts[3];
        const key = uriParts[uriParts.length - 1];
        if (libraryType === "users") {
          uris.push("zotero://select/library/items/" + key);
        }
        // groups
        else {
          const groupID = uriParts[4];
          uris.push("zotero://select/groups/" + groupID + "/items/" + key);
        }
      }
    }

    let childNodes: any[] = [];

    visit(
      node,
      (_n: any) => _n.properties?.className?.includes("citation-item"),
      (_n: any) => {
        return childNodes?.push(_n);
      },
    );

    // For unknown reasons, the element will be duplicated. Remove them.
    childNodes = new Array(...new Set(childNodes));

    // Fallback to pre v5 note-editor schema that was serializing citations as plain text i.e.:
    // <span class="citation" data-citation="...">(Jang et al., 2005, p. 14; Kongsgaard et al., 2009, p. 790)</span>
    if (!childNodes.length) {
      childNodes = toText(node).slice(1, -1).split("; ");
    }

    let newNode = h("span", node.properties, [
      { type: "text", value: "(" },
      ...childNodes.map((child, i) => {
        if (!child) {
          return h("text", "");
        }
        const newNode = h("span");
        replace(newNode, child);
        newNode.children = [h("a", { href: uris[i] }, child.children)];
        return newNode;
      }),
      { type: "text", value: ")" },
    ]);
    const citationKey = randomString(
      8,
      Zotero.Utilities.Internal.md5(node.properties.dataCitation),
      Zotero.Utilities.allowedKeyChars,
    );
    if (mode === NodeMode.wrap) {
      newNode.children.splice(0, 0, h("wrapperleft", `cite:${citationKey}`));
      newNode.children.push(h("wrapperright", `cite:${citationKey}`));
    } else if (mode === NodeMode.replace) {
      newNode = h("placeholder", `cite:${citationKey}`);
    } else if (mode === NodeMode.direct) {
      const newChild = h("span") as any;
      replace(newChild, newNode);
      newChild.properties.ztype = "zcitation";
      newNode = h("zcitation", [newChild]);
    }
    replace(node, newNode);
  }
}

async function processN2MRehypeNoteLinkNodes(
  nodes: string | any[],
  dir: string,
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const linkParam = getNoteLinkParams(node.properties.href);
    if (!linkParam.noteItem) {
      continue;
    }
    const link =
      mode === NodeMode.default ||
      !addon.api.sync.isSyncNote(linkParam.noteItem.id)
        ? node.properties.href
        : `./${await addon.api.sync.getMDFileName(linkParam.noteItem.id, dir)}`;
    const linkKey = randomString(
      8,
      Zotero.Utilities.Internal.md5(node.properties.href),
      Zotero.Utilities.allowedKeyChars,
    );
    if (mode === NodeMode.wrap) {
      const newNode = h("span", [
        h("wrapperleft", `note:${linkKey}`),
        h(
          node.tagName,
          Object.assign(node.properties, { href: link }),
          node.children,
        ),
        h("wrapperright", `note:${linkKey}`),
      ]);
      replace(node, newNode);
    } else if (mode === NodeMode.replace) {
      const newNode = h("placeholder", `note:${linkKey}`);
      replace(node, newNode);
    } else if (mode === NodeMode.direct || mode === NodeMode.default) {
      const newChild = h("a", node.properties, node.children) as any;
      newChild.properties.zhref = node.properties.href;
      newChild.properties.href = link;
      newChild.properties.ztype = "znotelink";
      // required for obsidian compatibility
      if (!newChild.properties.className?.includes("internal-link")) {
        if (!newChild.properties.className) {
          newChild.properties.className = [];
        }
        newChild.properties.className.push("internal-link");
      }
      const newNode = h("znotelink", [newChild]);
      replace(node, newNode);
    }
  }
}

async function processN2MRehypeImageNodes(
  nodes: string | any[],
  libraryID: number,
  dir: string,
  skipSavingImages: boolean = false,
  absolutePath: boolean = false,
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const imgKey = node.properties.dataAttachmentKey;
    const width = node.properties.width;

    const attachmentItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      libraryID,
      imgKey,
    )) as Zotero.Item;
    if (!attachmentItem) {
      continue;
    }

    const oldFile = String(await attachmentItem.getFilePathAsync());
    const ext = oldFile.split(".").pop();
    const newAbsPath = formatPath(`${dir}/${imgKey}.${ext}`);
    let newFile = oldFile;
    try {
      // Don't overwrite
      if (skipSavingImages || (await fileExists(newAbsPath))) {
        newFile = newAbsPath;
      } else {
        newFile = (await Zotero.File.copyToUnique(oldFile, newAbsPath)).path;
      }
      newFile = formatPath(
        absolutePath
          ? newFile
          : jointPath(
              getPref("syncAttachmentFolder") as string,
              PathUtils.split(newFile).pop() || "",
            ),
      );
    } catch (e) {
      ztoolkit.log(e);
    }

    node.properties.src = newFile ? newFile : oldFile;
    // If on Windows, convert path to Unix style
    if (Zotero.isWin) {
      node.properties.src = Zotero.File.normalizeToUnix(node.properties.src);
    }

    if (mode === NodeMode.direct) {
      const newChild = h("span") as any;
      replace(newChild, node);
      newChild.properties.ztype = "zimage";
      // const newNode = h("zimage", [newChild]);
      // replace(node, newNode);
      node.properties.alt = toHtml(newChild);
      if (width) {
        node.properties.alt = `${node.properties.alt} | ${width}`;
      }
    }
  }
}

function getM2NRehypeAnnotationNodes(rehype: any) {
  const nodes: any[] = [];
  visit(
    rehype,
    (node: any) => node.type === "element" && node.properties?.dataAnnotation,
    (node: any) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function getM2NRehypeHighlightNodes(rehype: any) {
  const nodes: any[] = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" && node.properties?.ztype === "zhighlight",
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function getM2NRehypeCitationNodes(rehype: any) {
  const nodes: any[] = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      (node.properties?.ztype === "zcitation" || node.properties?.dataCitation),
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function getM2NRehypeNoteLinkNodes(rehype: any) {
  const nodes: any[] = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" && node.properties?.ztype === "znotelink",
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function getM2NRehypeImageNodes(rehype: any) {
  const nodes: any[] = [];
  visit(
    rehype,
    (node: any) => node.type === "element" && node.tagName === "img",
    (node) => nodes.push(node),
  );
  return new Array(...new Set(nodes));
}

function processM2NRehypeMetaImageNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }

  for (const node of nodes) {
    const alt = node.properties.alt as string;
    if (/zimage/.test(alt)) {
      // If alt.split("|")[last] can be parsed to number, it's width
      const width = Number(alt.split("|").pop() || "");
      let nodeRaw = alt;
      if (width > 0) {
        nodeRaw = alt.split("|").slice(0, -1).join("|");
      }

      const newNode = unified()
        .use(remarkGfm)
        .use(remarkMath)
        .use(rehypeParse, { fragment: true })
        .parse(nodeRaw).children[0] as any;
      if (!newNode) {
        continue;
      }
      newNode.properties.src = node.properties.src;
      if (width > 0) {
        newNode.properties.width = width;
      }
      replace(node, newNode);
    }
  }
}

function processM2NRehypeHighlightNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    // node.children[0] is <a>, its children is the real children
    node.children = node.children[0].children;
    delete node.properties.ztype;
  }
}

async function processM2NRehypeCitationNodes(
  nodes: string | any[],
  isImport: boolean = false,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let importFailed = false;
    if (isImport) {
      try {
        // {
        //   "citationItems": [
        //     {
        //       "uris": [
        //         "http://zotero.org/users/uid/items/itemkey"
        //       ]
        //     }
        //   ],
        //   "properties": {}
        // }
        const dataCitation = JSON.parse(
          decodeURIComponent(node.properties.dataCitation),
        );
        const ids = dataCitation.citationItems.map((c: { uris: string[] }) =>
          Zotero.URI.getURIItemID(c.uris[0]),
        );
        const html = await addon.api.convert.item2citation(ids, dataCitation);
        if (html) {
          const newNode = await note2rehype(html);
          // root -> p -> span(cite, this is what we actually want)
          replace(node, (newNode.children[0] as any).children[0]);
        } else {
          importFailed = true;
        }
      } catch (e) {
        ztoolkit.log(e);
      }
    }
    if (importFailed || !isImport) {
      visit(
        node,
        (_n: any) => _n.properties?.className?.includes("citation-item"),
        (_n) => {
          _n.children = [{ type: "text", value: toText(_n) }];
        },
      );
      delete node.properties?.ztype;
    }
  }
}

function processM2NRehypeNoteLinkNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    node.properties.href = node.properties.zhref;
    delete node.properties.class;
    delete node.properties.zhref;
    delete node.properties.ztype;
  }
}

async function processM2NRehypeImageNodes(
  nodes: any[],
  noteItem: Zotero.Item,
  fileDir: string,
  isImport: boolean = false,
) {
  if (!nodes.length || (isImport && !noteItem)) {
    return;
  }

  let attKeys = [] as string[];
  if (isImport) {
    attKeys = Zotero.Items.get(noteItem.getAttachments()).map(
      (item) => item.key,
    );
  }

  for (const node of nodes) {
    if (isImport) {
      // If image is already an attachment of note, skip import
      if (!attKeys.includes(node.properties.dataAttachmentKey)) {
        // We encode the src in md2remark and decode it here.
        let src = formatPath(decodeURIComponent(node.properties.src));
        const srcType = (src as string).startsWith("data:")
          ? "b64"
          : (src as string).startsWith("http")
            ? "url"
            : "file";
        if (srcType === "file") {
          if (!PathUtils.isAbsolute(src)) {
            src = jointPath(fileDir, src);
          }
          if (!(await fileExists(src))) {
            ztoolkit.log("parse image, path invalid", src);
            continue;
          }
        }
        const key = await importImageToNote(noteItem, src, srcType);
        node.properties.dataAttachmentKey = key;
      }
    }
    delete node.properties.src;
    node.properties.ztype && delete node.properties.ztype;
  }
}

function getN2LRehypeHeaderNodes(rehype: HRoot) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      ["h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "span"].includes(
        node.tagName,
      ),
    (node) => {
      nodes.push(node);
    },
  );
  return new Array(...new Set(nodes));
}

function getN2LRehypeLinkNodes(rehype: HRoot) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) => node.type === "element" && node.tagName === "a",
    (node) => {
      nodes.push(node);
    },
  );
  return new Array(...new Set(nodes));
}

function getN2LRehypeListNodes(rehype: HRoot) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      (node.tagName === "ul" || node.tagName === "ol"),
    (node) => {
      nodes.push(node);
    },
  );
  return new Array(...new Set(nodes));
}

function getN2LRehypeTableNodes(rehype: HRoot) {
  const nodes: any[] | null | undefined = [];
  visit(
    rehype,
    (node: any) => node.type === "element" && node.tagName === "table",
    (node) => {
      nodes.push(node);
    },
  );
  return new Array(...new Set(nodes));
}

async function processN2LRehypeCitationNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  const items: Zotero.Item[] = [];
  const citationAllKeys: string[] = [];
  for (const node of nodes) {
    let citation;
    try {
      citation = JSON.parse(decodeURIComponent(node.properties.dataCitation));
    } catch (e) {
      Zotero.debug("citation parse error: " + e);
      continue;
    }
    if (!citation?.citationItems?.length) {
      Zotero.debug(citation?.citationItems);
      continue;
    }

    const citationKeys: string[] = [];
    for (const citationItem of citation.citationItems) {
      const uri = citationItem.uris[0];
      if (typeof uri === "string") {
        const uriParts = uri.split("/");
        const key = uriParts[uriParts.length - 1];
        const item_ = Zotero.Items.getByLibraryAndKey(
          Zotero.Libraries.userLibraryID,
          key,
        );
        if (!item_) {
          Zotero.debug("[Bid Export] Item not found, key = " + key);
          continue;
        }
        items.push(item_);
        const citationKey = item_.getField("citationKey");
        if (citationKey === "") {
          Zotero.debug("[Bid Export] Detect empty citationKey.");
          continue;
        }
        citationKeys.push(citationKey);
      }
    }
    citationAllKeys.push(...citationKeys);

    node.type = "text";
    node.value = "\\cite{" + citationKeys.join(",") + "}";
  }

  // save the citation as a .bib file
  await saveToBibFile(citationAllKeys);
}

async function saveToBibFile(citationAllKeys: string[]) {
  const BBT = "Better BibTex for Zotero";
  const installedExtensions = await Zotero.getInstalledExtensions();
  const installedAndEnabled = installedExtensions.some(
    (item) => item.includes(BBT) && !item.includes("disabled"),
  );
  if (!installedAndEnabled) {
    Zotero.debug("Better BibTex for Zotero is not installed.");
    showHint(
      "Export Error: Better BibTex for Zotero is needed for exporting the .bib file. Please install and enable it first.",
    );
    return;
  }

  const uniqueCitationKeys = Array.from(new Set(citationAllKeys));
  const res = await exportToBibtex(uniqueCitationKeys);
  const raw = await new ztoolkit.FilePicker(
    `${Zotero.getString("fileInterface.export")} Bibtex File`,
    "save",
    [["Bibtex File(*.bib)", "*.bib"]],
    `notegeneration.bib`,
  ).open();
  if (!raw) {
    Zotero.debug("[Bib Export] Bib file export canceled.");
    return;
  }
  const filename = formatPath(raw, ".bib");
  await Zotero.File.putContentsAsync(filename, res);
  showHintWithLink(
    `Bibliographic Saved to ${filename}`,
    "Show in Folder",
    (ev) => {
      Zotero.File.reveal(filename);
    },
  );
}

function exportToBibtex(citationKeys: string[]): Promise<string> {
  const data = {
    jsonrpc: "2.0",
    method: "item.export",
    params: [citationKeys, "bibtex"],
  };

  const port = Services.prefs.getIntPref("extensions.zotero.httpServer.port");

  return fetch(`http://localhost:${port}/better-bibtex/json-rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        Zotero.debug("[Bib Export] Network response was not ok");
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      Zotero.debug("[Bib Export] Response data: " + JSON.stringify(result));
      return "result" in result ? (result.result as string) : "";
    })
    .catch((error) => {
      Zotero.debug("[Bib Export] Fetch error: " + error.message);
      return "";
    });
}

async function processN2LRehypeHeaderNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    let hx = "";
    if (node.tagName === "h1") {
      hx = "\\section{" + getTextFromNode(node) + "}\n";
    } else if (node.tagName === "h2") {
      hx = "\\subsection{" + getTextFromNode(node) + "}\n";
    } else if (node.tagName === "h3") {
      hx = "\\subsubsection{" + getTextFromNode(node) + "}\n";
    } else if (["h4", "h5", "h6"].includes(node.tagName)) {
      hx = "\\textbf{" + getTextFromNode(node) + "}\n";
    } else if (node.tagName === "strong") {
      hx = "\\textbf{" + getTextFromNode(node) + "}";
    } else if (node.tagName === "em") {
      hx = "\\textit{" + getTextFromNode(node) + "}";
    } else if (node.tagName === "span") {
      hx = getTextFromNode(node);
    } else {
      hx = getTextFromNode(node);
    }

    node.type = "text";
    node.value = hx;
  }
}

async function processN2LRehypeLinkNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    node.type = "text";
    node.value = `\\href{${node.properties.href}}{${getTextFromNode(node)}}`;
  }
}

async function processN2LRehypeListNodes(nodes: string | any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const item_str: string[] = [];
    for (const itemKey in node.children) {
      const itemNode = node.children[itemKey];
      if (itemNode.type === "element" && itemNode.tagName === "li") {
        item_str.push(getTextFromNode(itemNode));
      }
    }

    const join_str = item_str.join("\n\\item");
    let listStr;
    if (node.tagName === "ul") {
      const ulStr = `\\begin{itemize}\n\\item ${join_str} \n\\end{itemize}`;
      listStr = ulStr;
    } else if (node.tagName === "ol") {
      const olStr = `\\begin{enumerate}\n\\item ${join_str} \n\\end{enumerate}`;
      listStr = olStr;
    }

    node.type = "text";
    node.value = listStr;
  }
}

async function processN2LRehypeTableNodes(nodes: any[]) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    if (node.type === "element" && node.tagName === "table") {
      const latexTable = convertHtmlTableToLatex(node.children[1]);
      node.type = "text";
      node.value = latexTable;
    }
  }
}

function convertHtmlTableToLatex(tableNode: any): string {
  let colCount = 0;
  let rowCount = 0;
  const tableData: string[][] = [];

  for (const child of tableNode.children) {
    if (child.type === "element" && child.tagName === "tr") {
      rowCount++;
      const rowData: string[] = [];
      for (const td of child.children) {
        if (
          td.type === "element" &&
          (td.tagName === "td" || td.tagName === "th")
        ) {
          colCount = Math.max(colCount, rowData.length + 1);
          rowData.push(getTextFromNode(td));
        }
      }
      tableData.push(rowData);
    }
  }

  let columnFormat = "|";
  for (let i = 0; i < colCount; i++) {
    columnFormat += "l|"; // Assuming left alignment for all columns
  }

  const latexRows: string[] = [];
  latexRows.push("\\hline");
  for (const row of tableData) {
    const rowContent = row
      .map((cell) => cell.replace(/_/g, "\\_").replace(/&/g, "\\&"))
      .join(" & ");
    latexRows.push(rowContent + " \\\\");
    latexRows.push("\\hline");
  }

  const latexTableStr = `\\begin{table}[htbp]\n\\centering\n\\caption{Caption}\n\\label{tab:simple_table}\n\\begin{tabular}{${columnFormat}}
${latexRows.join("\n")}
\\end{tabular}\n\\end{table}`;

  return latexTableStr;
}

function getTextFromNode(node: any): string {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") {
      text += child.value === "\n " ? "" : child.value;
    } else if (child.children) {
      text += getTextFromNode(child);
    }
  }
  return text;
}

async function processN2LRehypeImageNodes(
  nodes: string | any[],
  libraryID: number,
  dir: string,
  skipSavingImages: boolean = false,
  absolutePath: boolean = false,
  mode: NodeMode = NodeMode.default,
) {
  if (!nodes.length) {
    return;
  }
  for (const node of nodes) {
    const imgKey = node.properties.dataAttachmentKey;
    const attachmentItem = (await Zotero.Items.getByLibraryAndKeyAsync(
      libraryID,
      imgKey,
    )) as Zotero.Item;
    if (!attachmentItem) {
      continue;
    }

    const oldFile = String(await attachmentItem.getFilePathAsync());
    const ext = oldFile.split(".").pop();
    const newAbsPath = formatPath(`${dir}/${imgKey}.${ext}`);
    let newFile = oldFile;
    try {
      // Don't overwrite
      if (skipSavingImages || (await fileExists(newAbsPath))) {
        newFile = newAbsPath;
      } else {
        newFile = (await Zotero.File.copyToUnique(oldFile, newAbsPath)).path;
      }
      newFile = formatPath(
        absolutePath
          ? newFile
          : jointPath(
              getPref("syncAttachmentFolder") as string,
              PathUtils.split(newFile).pop() || "",
            ),
      );
    } catch (e) {
      ztoolkit.log(e);
    }

    let filename = newFile ? newFile : oldFile;
    // If on Windows, convert path to Unix style
    if (Zotero.isWin) {
      filename = Zotero.File.normalizeToUnix(filename);
    }

    const imgStr = `\\begin{figure}[!t]
\\centering
\\includegraphics[width=4.5in]{{./${filename}}}
\\caption{}
\\label{${imgKey}}
\\end{figure}`;
    node.type = "text";
    node.value = imgStr;
  }
}

enum NodeMode {
  default = 0,
  wrap,
  replace,
  direct,
}
