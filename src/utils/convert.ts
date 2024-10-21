import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark, { all } from "rehype-remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { defaultHandlers } from "hast-util-to-mdast";
import { toHtml } from "hast-util-to-html";
import { toText } from "hast-util-to-text";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
// visit may push nodes twice, use new Array(...new Set(nodes))
// if the you want to process nodes outside visit
import { visit } from "unist-util-visit";
import { visitParents } from "unist-util-visit-parents";
import rehypeFormat from "rehype-format";
import { h } from "hastscript";
import YAML = require("yamljs");

import { Root as HRoot, RootContent } from "hast";
import { ListContent, Root as MRoot } from "mdast";
import { Nodes } from "hast-util-to-text/lib";
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
};

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
  const rehype = note2rehype(noteStatus.content);
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
    return "Parsing Error: Rehype2Remark";
  }
  let md = remark2md(remark as MRoot);
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
  const remark = md2remark(mdStatus.content);
  const _rehype = await remark2rehype(remark);
  const _note = rehype2note(_rehype as HRoot);
  const rehype = note2rehype(_note);

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
  const noteContent = rehype2note(rehype as HRoot);
  return noteContent;
}

async function note2noteDiff(noteItem: Zotero.Item) {
  const noteStatus = addon.api.sync.getNoteStatus(noteItem.id)!;
  const rehype = note2rehype(noteStatus.content);
  await processM2NRehypeCitationNodes(getM2NRehypeCitationNodes(rehype), true);
  // Parse content like citations
  return rehype2note(rehype as HRoot);
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
  const remark = md2remark(md);
  const rehype = await remark2rehype(remark);
  const html = rehype2note(rehype as HRoot);
  return html;
}

async function html2md(html: string) {
  const rehype = note2rehype(html);
  const remark = await rehype2remark(rehype as HRoot);
  if (!remark) {
    return "Parsing Error: HTML2MD";
  }
  const md = remark2md(remark as MRoot);
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
  options: { targetNoteItem?: Zotero.Item; html?: string } = {},
) {
  if (!Array.isArray(noteItems)) {
    noteItems = [noteItems];
  }
  const { targetNoteItem } = options;
  let html = options.html;
  if (!html) {
    html = noteItems.map((item) => item.getNote()).join("\n");
  }
  if (targetNoteItem?.isNote()) {
    return await copyEmbeddedImagesInHTML(html, targetNoteItem, noteItems);
  }
  return await renderNoteHTML(html, noteItems);
}

function note2rehype(str: string) {
  const rehype = unified()
    .use(remarkGfm)
    .use(remarkMath)
    .use(rehypeParse, { fragment: true })
    .parse(str);

  // Make sure <br> is inline break. Remove \n before/after <br>
  const removeBlank = (node: any, parentNode: any, offset: number) => {
    const idx = parentNode.children.indexOf(node);
    const target = parentNode.children[idx + offset];
    if (
      target &&
      target.type === "text" &&
      !target.value.replace(/[\r\n]/g, "")
    ) {
      (parentNode.children as any[]).splice(idx + offset, 1);
    }
  };
  visitParents(
    rehype,
    (_n: any) => _n.type === "element" && _n.tagName === "br",
    (_n: any, ancestors) => {
      if (ancestors.length) {
        const parentNode = ancestors[ancestors.length - 1];
        removeBlank(_n, parentNode, -1);
        removeBlank(_n, parentNode, 1);
      }
    },
  );

  // Make sure <span> and <img> wrapped by <p>
  visitParents(
    rehype,
    (_n: any) =>
      _n.type === "element" && (_n.tagName === "span" || _n.tagName === "img"),
    (_n: any, ancestors) => {
      if (ancestors.length) {
        const parentNode = ancestors[ancestors.length - 1];
        if (parentNode === rehype) {
          const newChild = h("span");
          replace(newChild, _n);
          const p = h("p", [newChild]);
          replace(_n, p);
        }
      }
    },
  );

  // Make sure empty <p> under root node is removed
  visitParents(
    rehype,
    (_n: any) => _n.type === "element" && _n.tagName === "p",
    (_n: any, ancestors) => {
      if (ancestors.length) {
        const parentNode = ancestors[ancestors.length - 1];
        if (parentNode === rehype && !_n.children.length && !toText(_n)) {
          parentNode.children.splice(parentNode.children.indexOf(_n), 1);
        }
      }
    },
  );
  return rehype;
}

async function rehype2remark(rehype: HRoot) {
  return await unified()
    .use(rehypeRemark, {
      handlers: {
        span: (h, node) => {
          if (
            node.properties?.style?.includes("text-decoration: line-through")
          ) {
            return h(node, "delete", all(h, node));
          } else if (node.properties?.style?.includes("background-color")) {
            return h(node, "html", toHtml(node));
          } else if (node.properties?.style?.includes("color")) {
            return h(node, "html", toHtml(node));
          } else if (node.properties?.className?.includes("math")) {
            return h(node, "inlineMath", toText(node).slice(1, -1));
          } else {
            return h(node, "paragraph", all(h, node));
          }
        },
        pre: (h, node) => {
          if (node.properties?.className?.includes("math")) {
            return h(node, "math", toText(node).slice(2, -2));
          } else {
            return h(node, "code", toText(node));
          }
        },
        u: (h, node) => {
          return h(node, "u", toText(node));
        },
        sub: (h, node) => {
          return h(node, "sub", toText(node));
        },
        sup: (h, node) => {
          return h(node, "sup", toText(node));
        },
        table: (h, node) => {
          let hasStyle = false;
          visit(
            node,
            (_n) =>
              _n.type === "element" &&
              ["tr", "td", "th"].includes((_n as any).tagName),
            (node) => {
              if (node.properties.style) {
                hasStyle = true;
              }
            },
          );
          // if (0 && hasStyle) {
          //   return h(node, "styleTable", toHtml(node));
          // } else {
          return defaultHandlers.table(h, node);
          // }
        },
        /*
         * See https://github.com/windingwind/zotero-better-notes/issues/820
         * The text content separated by non-text content (e.g. inline math)
         * inside `li`(rehype) will be converted to `paragraph`(remark),
         * which will be turned to line with \n in MD:
         * ```rehype
         * li: [text, text, inline-math, text]
         * ```
         * to
         * ```remark
         * listitem: [paragraph, inline-math, paragraph]
         * ```
         * to
         * ```md
         *  * text text
         *    inline-math
         *    text
         * ```
         */
        li: (h, node) => {
          const mnode = defaultHandlers.li(h, node) as ListContent;
          // If no more than 1 children, skip
          if (!mnode || mnode.children.length < 2) {
            return mnode;
          }
          const children: any[] = [];
          // Merge none-list nodes inside li into the previous paragraph node to avoid line break
          while (mnode.children.length > 0) {
            const current = mnode.children.shift();
            const cached = children[children.length - 1];
            if (cached?.type === "paragraph" && current?.type !== "list") {
              cached.children.push(current);
            } else {
              children.push(current);
            }
          }
          mnode.children.push(...children);
          return mnode;
        },
        wrapper: (h, node) => {
          return h(node, "wrapper", toText(node));
        },
        wrapperleft: (h, node) => {
          return h(node, "wrapperleft", toText(node));
        },
        wrapperright: (h, node) => {
          return h(node, "wrapperright", toText(node));
        },
        zhighlight: (h, node) => {
          return h(node, "zhighlight", toHtml(node));
        },
        zcitation: (h, node) => {
          return h(node, "zcitation", toHtml(node));
        },
        znotelink: (h, node) => {
          return h(node, "znotelink", toHtml(node));
        },
        zimage: (h, node) => {
          return h(node, "zimage", toHtml(node));
        },
      },
    })
    .run(rehype as any);
}

function remark2md(remark: MRoot) {
  return String(
    unified()
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkStringify, {
        handlers: {
          pre: (node: { value: string }) => {
            return "```\n" + node.value + "\n```";
          },
          u: (node: { value: string }) => {
            return "<u>" + node.value + "</u>";
          },
          sub: (node: { value: string }) => {
            return "<sub>" + node.value + "</sub>";
          },
          sup: (node: { value: string }) => {
            return "<sup>" + node.value + "</sup>";
          },
          styleTable: (node: { value: any }) => {
            return node.value;
          },
          wrapper: (node: { value: string }) => {
            return "\n<!-- " + node.value + " -->\n";
          },
          wrapperleft: (node: { value: string }) => {
            return "<!-- " + node.value + " -->\n";
          },
          wrapperright: (node: { value: string }) => {
            return "\n<!-- " + node.value + " -->";
          },
          zhighlight: (node: { value: string }) => {
            return node.value.replace(/(^<zhighlight>|<\/zhighlight>$)/g, "");
          },
          zcitation: (node: { value: string }) => {
            return node.value.replace(/(^<zcitation>|<\/zcitation>$)/g, "");
          },
          znotelink: (node: { value: string }) => {
            return node.value.replace(/(^<znotelink>|<\/znotelink>$)/g, "");
          },
          zimage: (node: { value: string }) => {
            return node.value.replace(/(^<zimage>|<\/zimage>$)/g, "");
          },
        },
      } as any)
      .stringify(remark as any),
  );
}

function md2remark(str: string) {
  // Parse Obsidian-style image ![[xxx.png]]
  // Encode spaces in link, otherwise it cannot be parsed to image node
  str = str
    .replace(/!\[\[(.*)\]\]/g, (s: string) => `![](${s.slice(3, -2)})`)
    .replace(
      /!\[(.*)\]\((.*)\)/g,
      (match, altText, imageURL) =>
        `![${altText}](${encodeURI(decodeURI(imageURL))})`,
    );
  const remark = unified()
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkParse)
    .parse(str);
  // visit(
  //   remark,
  //   (_n) => _n.type === "image",
  //   (_n: any) => {
  //     _n.type = "html";
  //     _n.value = toHtml(
  //       h("img", {
  //         src: _n.url,
  //       })
  //     );
  //   }
  // );
  return remark;
}

async function remark2rehype(remark: any) {
  return await unified()
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .run(remark);
}

function rehype2note(rehype: HRoot) {
  // Del node
  visit(
    rehype,
    (node: any) => node.type === "element" && (node as any).tagName === "del",
    (node: any) => {
      node.tagName = "span";
      node.properties.style = "text-decoration: line-through";
    },
  );

  // Code node
  visitParents(
    rehype,
    (node: any) => node.type === "element" && (node as any).tagName === "code",
    (node: any, ancestors) => {
      const parent = ancestors.length
        ? ancestors[ancestors.length - 1]
        : undefined;
      if (parent?.type == "element" && parent?.tagName === "pre") {
        node.value = toText(node, { whitespace: "pre-wrap" });
        node.type = "text";
      }
    },
  );

  // Table node with style
  visit(
    rehype,
    (node: any) => node.type === "element" && (node as any).tagName === "table",
    (node: any) => {
      let hasStyle = false;
      visit(
        node,
        (_n: any) =>
          _n.type === "element" &&
          ["tr", "td", "th"].includes((_n as any).tagName),
        (node: any) => {
          if (node.properties.style) {
            hasStyle = true;
          }
        },
      );
      if (hasStyle) {
        node.value = toHtml(node).replace(/[\r\n]/g, "");
        node.children = [];
        node.type = "raw";
      }
    },
  );

  // Convert thead to tbody
  visit(
    rehype,
    (node: any) => node.type === "element" && (node as any).tagName === "thead",
    (node: any) => {
      node.value = toHtml(node).slice(7, -8);
      node.children = [];
      node.type = "raw";
    },
  );

  // Wrap lines in list with <span> (for diff)
  visitParents(rehype, "text", (node: any, ancestors) => {
    const parent = ancestors.length
      ? ancestors[ancestors.length - 1]
      : undefined;
    if (
      parent?.type == "element" &&
      ["li", "td"].includes(parent?.tagName) &&
      node.value.replace(/[\r\n]/g, "")
    ) {
      node.type = "element";
      node.tagName = "span";
      node.children = [
        { type: "text", value: node.value.replace(/[\r\n]/g, "") },
      ];
      node.value = undefined;
    }
  });

  // No empty breakline text node in list (for diff)
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      ((node as any).tagName === "li" || (node as any).tagName === "td"),
    (node: any) => {
      node.children = node.children.filter(
        (_n: { type: string; value: string }) =>
          _n.type === "element" ||
          (_n.type === "text" && _n.value.replace(/[\r\n]/g, "")),
      );
    },
  );

  // Math node
  visit(
    rehype,
    (node: any) =>
      node.type === "element" &&
      ((node as any).properties?.className?.includes("math-inline") ||
        (node as any).properties?.className?.includes("math-display")),
    (node: any) => {
      if (node.properties.className.includes("math-inline")) {
        node.children = [
          { type: "text", value: "$" },
          ...node.children,
          { type: "text", value: "$" },
        ];
      } else if (node.properties.className.includes("math-display")) {
        node.children = [
          { type: "text", value: "$$" },
          ...node.children,
          { type: "text", value: "$$" },
        ];
        node.tagName = "pre";
      }
      node.properties.className = "math";
    },
  );

  // Ignore link rel attribute, which exists in note
  visit(
    rehype,
    (node: any) => node.type === "element" && (node as any).tagName === "a",
    (node: any) => {
      node.properties.rel = undefined;
    },
  );

  // Ignore empty lines, as they are not parsed to md
  const tempChildren: RootContent[] = [];
  const isEmptyNode = (_n: Nodes) =>
    (_n.type === "text" && !_n.value.trim()) ||
    (_n.type === "element" &&
      _n.tagName === "p" &&
      !_n.children.length &&
      !toText(_n).trim());
  for (const child of rehype.children) {
    if (
      tempChildren.length &&
      isEmptyNode(tempChildren[tempChildren.length - 1] as Nodes) &&
      isEmptyNode(child as Nodes)
    ) {
      continue;
    }
    tempChildren.push(child);
  }

  rehype.children = tempChildren;

  return unified()
    .use(rehypeStringify, {
      allowDangerousCharacters: true,
      allowDangerousHtml: true,
    })
    .stringify(rehype as any);
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
    (node) => nodes.push(node),
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
        openURI = "zotero://open-pdf/library/items/" + key;
      }
      // groups
      else {
        const groupID = uriParts[4];
        openURI = "zotero://open-pdf/groups/" + groupID + "/items/" + key;
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
      newChild.properties.class = "internal-link"; // required for obsidian compatibility
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
    if (/zimage/.test(node.properties.alt)) {
      const newNode = unified()
        .use(remarkGfm)
        .use(remarkMath)
        .use(rehypeParse, { fragment: true })
        .parse(node.properties.alt).children[0] as any;
      if (!newNode) {
        continue;
      }
      newNode.properties.src = node.properties.src;
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
          const newNode = note2rehype(html);
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

enum NodeMode {
  default = 0,
  wrap,
  replace,
  direct,
}
