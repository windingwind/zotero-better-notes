import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark, { all } from "rehype-remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { defaultHandlers as rehype2remarkDefaultHandlers } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmTableToMarkdown } from "mdast-util-gfm-table";
import { toHtml } from "hast-util-to-html";
import { toText } from "hast-util-to-text";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
// visit may push nodes twice, use new Array(...new Set(nodes))
// if the you want to process nodes outside visit
import { visit } from "unist-util-visit";
import { visitParents } from "unist-util-visit-parents";
import { h } from "hastscript";

import { Root as HRoot, RootContent } from "hast";
import { ListContent, Root as MRoot, TableContent } from "mdast";
import { Nodes } from "hast-util-to-text/lib";

import { MessageHelper } from "zotero-plugin-toolkit";

export { handlers };

const handlers = {
  note2rehype,
  rehype2remark,
  rehype2note,
  remark2rehype,
  remark2md,
  remark2latex,
  md2remark,
};

const messageServer = new MessageHelper({
  canBeDestroyed: true,
  dev: true,
  name: "convertWorker",
  target: self,
  handlers,
});

messageServer.start();

function replace(targetNode: any, sourceNode: any) {
  targetNode.type = sourceNode.type;
  targetNode.tagName = sourceNode.tagName;
  targetNode.properties = sourceNode.properties;
  targetNode.value = sourceNode.value;
  targetNode.children = sourceNode.children;
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
            const ret = rehype2remarkDefaultHandlers.pre(h, node);
            return ret;
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
          let hasHeader = false;
          visit(
            node,
            (_n) =>
              _n.type === "element" &&
              ["tr", "td", "th"].includes((_n as any).tagName),
            (node) => {
              if (node.properties.style) {
                hasStyle = true;
              }
              if (!hasHeader && node.tagName === "th") {
                hasHeader = true;
              }
            },
          );
          // if (0 && hasStyle) {
          //   return h(node, "styleTable", toHtml(node));
          // } else {
          const tableNode = rehype2remarkDefaultHandlers.table(
            h,
            node,
          ) as TableContent;
          // Remove empty thead
          if (!hasHeader) {
            if (!tableNode.data) {
              tableNode.data = {};
            }
            tableNode.data.bnRemove = true;
          }
          return tableNode;
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
          const mNode = rehype2remarkDefaultHandlers.li(h, node) as ListContent;
          // If no more than 1 children, skip
          if (!mNode || mNode.children.length < 2) {
            return mNode;
          }
          const children: any[] = [];
          const paragraphNodes = ["list", "code", "math", "table"];
          // Merge none-list nodes inside li into the previous paragraph node to avoid line break
          while (mNode.children.length > 0) {
            const current = mNode.children.shift();
            let cached = children[children.length - 1];
            // https://github.com/windingwind/zotero-better-notes/issues/1207
            // Create a new paragraph node
            if (cached?.type !== "paragraph") {
              cached = {
                type: "paragraph",
                children: [],
              };
              children.push(cached);
            }
            if (current?.type === "paragraph") {
              cached.children.push(...current.children);
            }
            // https://github.com/windingwind/zotero-better-notes/issues/1300
            // @ts-ignore inlineMath is not in mdast
            else if (current?.type === "inlineMath") {
              cached.children.push({
                type: "text",
                value: " ",
              });
              cached.children.push(current);
              cached.children.push({
                type: "text",
                value: " ",
              });
            } else if (
              current?.type &&
              !paragraphNodes.includes(current?.type)
            ) {
              cached.children.push(current);
            } else {
              children.push(current);
            }
          }
          mNode.children.push(...children);
          return mNode;
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
  const handlers = {
    code: (node: { value: string }) => {
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
    inlineMath: (node: { value: string }) => {
      return "$" + node.value + "$";
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
  };
  const tableHandler = (node: any) => {
    const tbl = gfmTableToMarkdown();
    // table must use same handlers as rest of pipeline
    const txt = toMarkdown(node, {
      extensions: [tbl],
      // Use the same handlers as the rest of the pipeline
      handlers,
    });

    if (node.data?.bnRemove) {
      const lines = txt.split("\n");
      // Replace the first line cells from `|{multiple spaces}|{multiple spaces}|...` to `| <!-- --> | <!-- --> |...`
      lines[0] = lines[0].replace(/(\| +)+/g, (s) => {
        return s.replace(/ +/g, " <!-- --> ");
      });
      return lines.join("\n");
    }
    return txt;
  };
  return String(
    unified()
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkStringify, {
        // Prevent recursive call
        handlers: Object.assign({}, handlers, {
          table: tableHandler,
        }),
      } as any)
      .stringify(remark as any),
  );
}

function remark2latex(remark: MRoot) {
  return String(
    unified()
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkStringify, {
        handlers: {
          text: (node: { value: string }) => {
            return node.value;
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
      // handlers: {
      //   code: (h, node) => {
      //     return h(node, "pre", [h(node, "text", node.value)]);
      //   },
      // },
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
        // Remove \n at the end of code block, which is redundant
        if (node.value.endsWith("\n")) {
          node.value = node.value.slice(0, -1);
        }
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
      let hasHeader = false;
      visit(
        node,
        (_n: any) =>
          _n.type === "element" &&
          ["tr", "td", "th"].includes((_n as any).tagName),
        (node: any) => {
          if (node.properties.style) {
            hasStyle = true;
          }
          if (
            !hasHeader &&
            node.tagName === "th" &&
            node.children[0]?.value !== "<!-- -->"
          ) {
            hasHeader = true;
          }
        },
      );
      if (hasStyle) {
        node.value = toHtml(node).replace(/[\r\n]/g, "");
        node.children = [];
        node.type = "raw";
      }
      if (!hasHeader) {
        const index = node.children.findIndex(
          (_n: any) => _n.tagName === "thead",
        );
        // Remove children before thead
        if (index > -1) {
          node.children = node.children.slice(index + 1);
        }
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

      // https://github.com/windingwind/zotero-better-notes/issues/1300
      // For all math-inline node in list, remove 1 space from its sibling text node
      if (node.tagName === "li") {
        for (const p of node.children) {
          for (let idx = 0; idx < p.children.length; idx++) {
            const _n = p.children[idx];
            if (_n.properties?.className?.includes("math-inline")) {
              if (idx > 0) {
                const prev = p.children[idx - 1];
                if (prev.type === "text" && prev.value.endsWith(" ")) {
                  prev.value = prev.value.slice(0, -1);
                }
              }
              if (idx < p.children.length - 1) {
                const next = p.children[idx + 1];
                if (next.type === "text" && next.value.startsWith(" ")) {
                  next.value = next.value.slice(1);
                }
              }
            }
          }
        }
      }
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
