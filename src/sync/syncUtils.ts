import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { all, defaultHandlers } from "hast-util-to-mdast";
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
import seedrandom = require("seedrandom");
import YAML = require("yamljs");

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";
import { NodeMode } from "../utils";

class SyncUtils extends AddonBase {
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  // A seedable version of Zotero.Utilities.randomString
  randomString(len: number, chars: string, seed: string) {
    if (!chars) {
      chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    }
    if (!len) {
      len = 8;
    }
    let randomstring = "";
    const random: Function = seedrandom(seed);
    for (let i = 0; i < len; i++) {
      const rnum = Math.floor(random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
  }

  async _getDataURL(item: Zotero.Item) {
    let path = await item.getFilePathAsync();
    let buf = new Uint8Array((await OS.File.read(path, {})) as Uint8Array)
      .buffer;
    return (
      "data:" +
      item.attachmentContentType +
      ";base64," +
      this._arrayBufferToBase64(buf)
    );
  }

  _arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  getNoteStatus(noteItem: Zotero.Item): NoteStatus {
    if (!noteItem.isNote()) {
      return;
    }
    const fullContent = noteItem.getNote();
    const ret = {
      meta: "",
      content: "",
      tail: "</div>",
      lastmodify: Zotero.Date.sqlToDate(noteItem.dateModified, true),
    };
    const metaRegex = /"?data-schema-version"?="[0-9]*">/;
    const match = fullContent?.match(metaRegex);
    if (!match || match.length == 0) {
      ret.meta = '<div "data-schema-version"="9">';
      ret.content = fullContent || "";
      return ret;
    }
    const idx = fullContent.search(metaRegex);
    if (idx != -1) {
      ret.content = fullContent.substring(
        idx + match[0].length,
        fullContent.length - ret.tail.length
      );
    }
    return ret;
  }

  getEmptySyncStatus(): SyncStatus {
    return {
      path: "",
      filename: "",
      md5: "",
      noteMd5: "",
      lastsync: new Date().getTime(),
      itemID: -1,
    };
  }

  getSyncStatus(noteItem: Zotero.Item): SyncStatus {
    return JSON.parse(
      (Zotero.Prefs.get(
        `Knowledge4Zotero.syncDetail-${noteItem.id}`
      ) as string) || JSON.stringify(this.getEmptySyncStatus())
    );
  }

  getMDStatusFromContent(contentRaw: string): MDStatus {
    const result = contentRaw.match(/^---([\s\S]*)---\n/);
    const ret: MDStatus = {
      meta: { version: -1 },
      content: contentRaw,
      filedir: "",
      filename: "",
      lastmodify: new Date(0),
    };
    if (result) {
      const yaml = result[0].replace(/---/g, "");
      ret.content = contentRaw.slice(result[0].length);
      try {
        ret.meta = YAML.parse(yaml);
      } catch (e) {
        Zotero.debug(e);
        console.log(e);
      }
    }
    return ret;
  }

  async getMDStatus(source: Zotero.Item | string): Promise<MDStatus> {
    let ret: MDStatus = {
      meta: null,
      content: "",
      filedir: "",
      filename: "",
      lastmodify: new Date(0),
    };
    try {
      let filepath = "";
      if (typeof source === "string") {
        filepath = source;
      } else if (source.isNote && source.isNote()) {
        const syncStatus = this.getSyncStatus(source);
        filepath = `${syncStatus.path}/${syncStatus.filename}`;
      }
      filepath = Zotero.File.normalizeToUnix(filepath);
      if (await OS.File.exists(filepath)) {
        let contentRaw = (await OS.File.read(filepath, {
          encoding: "utf-8",
        })) as string;
        ret = this.getMDStatusFromContent(contentRaw);
        const pathSplit = filepath.split("/");
        ret.filedir = Zotero.File.normalizeToUnix(
          pathSplit.slice(0, -1).join("/")
        );
        ret.filename = filepath.split("/").pop();
        const stat = await OS.File.stat(filepath);
        ret.lastmodify = stat.lastModificationDate;
      }
    } catch (e) {
      Zotero.debug(e);
      console.log(e);
    }
    return ret;
  }

  note2rehype(str) {
    const rehype = unified()
      .use(remarkGfm)
      .use(remarkMath)
      .use(rehypeParse, { fragment: true })
      .parse(str);

    // Make sure <br> is inline break. Remove \n before/after <br>
    const removeBlank = (node, parentNode, offset) => {
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
      }
    );

    // Make sure <span> and <img> wrapped by <p>
    visitParents(
      rehype,
      (_n: any) =>
        _n.type === "element" &&
        (_n.tagName === "span" || _n.tagName === "img"),
      (_n: any, ancestors) => {
        if (ancestors.length) {
          const parentNode = ancestors[ancestors.length - 1];
          if (parentNode === rehype) {
            const newChild = h("span");
            this.replace(newChild, _n);
            const p = h("p", [newChild]);
            this.replace(_n, p);
          }
        }
      }
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
      }
    );
    return rehype;
  }

  async rehype2remark(rehype) {
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
              }
            );
            if (0 && hasStyle) {
              return h(node, "styleTable", toHtml(node));
            } else {
              return defaultHandlers.table(h, node);
            }
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
      .run(rehype);
  }

  remark2md(remark) {
    return String(
      unified()
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkStringify, {
          handlers: {
            pre: (node) => {
              return "```\n" + node.value + "\n```";
            },
            u: (node) => {
              return "<u>" + node.value + "</u>";
            },
            sub: (node) => {
              return "<sub>" + node.value + "</sub>";
            },
            sup: (node) => {
              return "<sup>" + node.value + "</sup>";
            },
            styleTable: (node) => {
              return node.value;
            },
            wrapper: (node) => {
              return "\n<!-- " + node.value + " -->\n";
            },
            wrapperleft: (node) => {
              return "<!-- " + node.value + " -->\n";
            },
            wrapperright: (node) => {
              return "\n<!-- " + node.value + " -->";
            },
            zhighlight: (node) => {
              return node.value.replace(/(^<zhighlight>|<\/zhighlight>$)/g, "");
            },
            zcitation: (node) => {
              return node.value.replace(/(^<zcitation>|<\/zcitation>$)/g, "");
            },
            znotelink: (node) => {
              return node.value.replace(/(^<znotelink>|<\/znotelink>$)/g, "");
            },
            zimage: (node) => {
              return node.value.replace(/(^<zimage>|<\/zimage>$)/g, "");
            },
          },
        })
        .stringify(remark)
    );
  }

  md2remark(str) {
    // Parse Obsidian-style image ![[xxx.png]]
    // Encode spaces in link, otherwise it cannot be parsed to image node
    str = str
      .replace(/!\[\[(.*)\]\]/g, (s: string) => `![](${s.slice(3, -2)})`)
      .replace(
        /!\[.*\]\((.*)\)/g,
        (s: string) =>
          `![](${encodeURIComponent(s.match(/\(.*\)/g)[0].slice(1, -1))})`
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

  async remark2rehype(remark) {
    return await unified()
      .use(remarkRehype, {
        allowDangerousHtml: true,
      })
      .run(remark);
  }

  rehype2note(rehype) {
    // Del node
    visit(
      rehype,
      (node) => node.type === "element" && (node as any).tagName === "del",
      (node) => {
        node.tagName = "span";
        node.properties.style = "text-decoration: line-through";
      }
    );

    // Code node
    visitParents(
      rehype,
      (node) => node.type === "element" && (node as any).tagName === "code",
      (node, ancestors) => {
        const parent = ancestors.length
          ? ancestors[ancestors.length - 1]
          : undefined;
        if (parent?.type == "element" && parent?.tagName === "pre") {
          node.value = toText(node);
          node.type = "text";
        }
      }
    );

    // Table node with style
    visit(
      rehype,
      (node) => node.type === "element" && (node as any).tagName === "table",
      (node) => {
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
          }
        );
        if (hasStyle) {
          node.value = toHtml(node).replace(/[\r\n]/g, "");
          node.children = [];
          node.type = "raw";
        }
      }
    );

    // Convert thead to tbody
    visit(
      rehype,
      (node) => node.type === "element" && (node as any).tagName === "thead",
      (node) => {
        node.value = toHtml(node).slice(7, -8);
        node.children = [];
        node.type = "raw";
      }
    );

    // Wrap lines in list with <p> (for diff)
    visitParents(rehype, "text", (node, ancestors) => {
      const parent = ancestors.length
        ? ancestors[ancestors.length - 1]
        : undefined;
      if (
        node.value.replace(/[\r\n]/g, "") &&
        parent?.type == "element" &&
        ["li", "td"].includes(parent?.tagName)
      ) {
        node.type = "element";
        node.tagName = "p";
        node.children = [
          { type: "text", value: node.value.replace(/[\r\n]/g, "") },
        ];
        node.value = undefined;
      }
    });

    // No empty breakline text node in list (for diff)
    visit(
      rehype,
      (node) =>
        node.type === "element" &&
        ((node as any).tagName === "li" || (node as any).tagName === "td"),
      (node) => {
        node.children = node.children.filter(
          (_n) =>
            _n.type === "element" ||
            (_n.type === "text" && _n.value.replace(/[\r\n]/g, ""))
        );
      }
    );

    // Math node
    visit(
      rehype,
      (node) =>
        node.type === "element" &&
        ((node as any).properties?.className?.includes("math-inline") ||
          (node as any).properties?.className?.includes("math-display")),
      (node) => {
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
      }
    );

    // Ignore link rel attribute, which exists in note
    visit(
      rehype,
      (node) => node.type === "element" && (node as any).tagName === "a",
      (node) => {
        node.properties.rel = undefined;
      }
    );

    // Ignore empty lines, as they are not parsed to md
    const tempChildren = [];
    const isEmptyNode = (_n) =>
      (_n.type === "text" && !_n.value.trim()) ||
      (_n.type === "element" &&
        _n.tagName === "p" &&
        !_n.children.length &&
        !toText(_n).trim());
    for (const child of rehype.children) {
      if (
        tempChildren.length &&
        isEmptyNode(tempChildren[tempChildren.length - 1]) &&
        isEmptyNode(child)
      ) {
        continue;
      }
      tempChildren.push(child);
    }

    rehype.children = tempChildren;

    console.log("before n2r", rehype);

    return unified()
      .use(rehypeStringify, {
        allowDangerousCharacters: true,
        allowDangerousHtml: true,
      })
      .stringify(rehype);
  }

  async rehype2rehype(rehype) {
    return await unified().use(rehypeFormat).run(rehype);
  }

  async note2md(str) {
    const rehype = this.note2rehype(str);
    const remark = await this.rehype2remark(rehype);
    const md = this.remark2md(remark);
    return md;
  }

  async md2note(str) {
    const remark = this.md2remark(str);
    console.log(remark);
    let rehype = await this.remark2rehype(remark);
    console.log(rehype);
    const html = this.rehype2note(rehype);
    console.log(html);
    return html;
  }

  async note2note(str) {
    let rehype = this.note2rehype(str);
    const html = this.rehype2note(rehype);
    return html;
  }

  replace(targetNode, sourceNode) {
    targetNode.type = sourceNode.type;
    targetNode.tagName = sourceNode.tagName;
    targetNode.properties = sourceNode.properties;
    targetNode.value = sourceNode.value;
    targetNode.children = sourceNode.children;
  }

  getN2MRehypeHighlightNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" &&
        node.properties?.className?.includes("highlight"),
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  getN2MRehypeCitationNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" &&
        node.properties?.className?.includes("citation"),
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  getN2MRehypeNoteLinkNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" &&
        node.tagName === "a" &&
        node.properties?.href &&
        /zotero:\/\/note\/\w+\/\w+\//.test(node.properties?.href),
      (node) => nodes.push(node)
    );
    Zotero.debug("BN:N2M link");
    Zotero.debug(JSON.stringify(nodes));
    return new Array(...new Set(nodes));
  }

  getN2MRehypeImageNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" &&
        node.tagName === "img" &&
        node.properties?.dataAttachmentKey,
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  processN2MRehypeHighlightNodes(nodes, mode: NodeMode = NodeMode.default) {
    if (!nodes.length) {
      return;
    }
    for (const node of nodes) {
      let annotation;
      try {
        annotation = JSON.parse(
          decodeURIComponent(node.properties.dataAnnotation)
        );
      } catch (e) {
        continue;
      }
      if (!annotation) {
        continue;
      }
      // annotation.uri was used before note-editor v4
      let uri = annotation.attachmentURI || annotation.uri;
      let position = annotation.position;
      Zotero.debug("----Debug Link----");
      Zotero.debug(annotation);
      console.log("convertAnnotations", node);

      if (typeof uri === "string" && typeof position === "object") {
        Zotero.debug(uri);
        let openURI;
        let uriParts = uri.split("/");
        let libraryType = uriParts[3];
        let key = uriParts[uriParts.length - 1];
        Zotero.debug(key);
        if (libraryType === "users") {
          openURI = "zotero://open-pdf/library/items/" + key;
        }
        // groups
        else {
          let groupID = uriParts[4];
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
          this.randomString(
            8,
            Zotero.Utilities.allowedKeyChars,
            Zotero.Utilities.Internal.md5(node.properties.dataAnnotation)
          );

        if (mode === NodeMode.wrap) {
          newNode.children.splice(0, 0, h("wrapperleft", `annot:${annotKey}`));
          newNode.children.push(h("wrapperright", `annot:${annotKey}`));
        } else if (mode === NodeMode.replace) {
          newNode = h("placeholder", `annot:${annotKey}`);
        } else if (mode === NodeMode.direct) {
          const newChild = h("span");
          this.replace(newChild, node);
          newChild.children = [h("a", { href: openURI }, node.children)];
          newChild.properties.ztype = "zhighlight";
          newNode = h("zhighlight", [newChild]);
        }
        console.log(newNode, node);
        this.replace(node, newNode);
        console.log("converted", newNode, node);
      }
    }
  }

  processN2MRehypeCitationNodes(nodes, mode: NodeMode = NodeMode.default) {
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

      let uris = [];
      for (let citationItem of citation.citationItems) {
        let uri = citationItem.uris[0];
        if (typeof uri === "string") {
          let uriParts = uri.split("/");
          let libraryType = uriParts[3];
          let key = uriParts[uriParts.length - 1];
          Zotero.debug(key);
          if (libraryType === "users") {
            uris.push("zotero://select/library/items/" + key);
          }
          // groups
          else {
            let groupID = uriParts[4];
            uris.push("zotero://select/groups/" + groupID + "/items/" + key);
          }
        }
      }

      let childNodes = [];

      visit(
        node,
        (_n: any) => _n.properties?.className.includes("citation-item"),
        (_n) => {
          return childNodes.push(_n);
        }
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
          const newNode = h("span");
          this.replace(newNode, child);
          console.log("cite child", child, newNode);
          newNode.children = [h("a", { href: uris[i] }, child.children)];
          return newNode;
        }),
        { type: "text", value: ")" },
      ]);
      console.log("cite", newNode);
      const citationKey = this.randomString(
        8,
        Zotero.Utilities.allowedKeyChars,
        Zotero.Utilities.Internal.md5(node.properties.dataCitation)
      );
      if (mode === NodeMode.wrap) {
        newNode.children.splice(0, 0, h("wrapperleft", `cite:${citationKey}`));
        newNode.children.push(h("wrapperright", `cite:${citationKey}`));
      } else if (mode === NodeMode.replace) {
        newNode = h("placeholder", `cite:${citationKey}`);
      } else if (mode === NodeMode.direct) {
        const newChild = h("span");
        this.replace(newChild, newNode);
        newChild.properties.ztype = "zcitation";
        newNode = h("zcitation", [newChild]);
      }
      this.replace(node, newNode);
    }
  }

  processN2MRehypeNoteLinkNodes(
    nodes,
    infoList: Array<{
      link: string;
      id: number;
      note: Zotero.Item;
      filename: string;
    }>,
    mode: NodeMode = NodeMode.default
  ) {
    if (!nodes.length) {
      return;
    }
    for (const node of nodes) {
      console.log("note link", node);
      const noteInfo = infoList.find((i) =>
        node.properties.href.includes(i.link)
      );
      if (!noteInfo) {
        continue;
      }
      const link = `./${noteInfo.filename}`;
      const linkKey = this.randomString(
        8,
        Zotero.Utilities.allowedKeyChars,
        Zotero.Utilities.Internal.md5(node.properties.href)
      );
      if (mode === NodeMode.wrap) {
        const newNode = h("span", [
          h("wrapperleft", `note:${linkKey}`),
          h(
            node.tagName,
            Object.assign(node.properties, { href: link }),
            node.children
          ),
          h("wrapperright", `note:${linkKey}`),
        ]);
        this.replace(node, newNode);
      } else if (mode === NodeMode.replace) {
        const newNode = h("placeholder", `note:${linkKey}`);
        this.replace(node, newNode);
      } else if (mode === NodeMode.direct) {
        const newChild = h("a", node.properties, node.children);
        newChild.properties.zhref = node.properties.href;
        newChild.properties.href = link;
        newChild.properties.ztype = "znotelink";
        newChild.properties.class = "internal-link"; // required for obsidian compatibility
        const newNode = h("znotelink", [newChild]);
        this.replace(node, newNode);
        console.log("direct link", node, newNode, newChild);
      }
      console.log("note link parsed", node);
    }
  }

  async processN2MRehypeImageNodes(
    nodes,
    libraryID: number,
    Path: string,
    skipSavingImages: boolean = false,
    absolutePath: boolean = false,
    mode: NodeMode = NodeMode.default
  ) {
    if (!nodes.length) {
      return;
    }
    for (const node of nodes) {
      let imgKey = node.properties.dataAttachmentKey;

      const attachmentItem = await Zotero.Items.getByLibraryAndKeyAsync(
        libraryID,
        imgKey
      );
      Zotero.debug(attachmentItem);
      console.log("image", libraryID, imgKey, attachmentItem, node);
      if (!attachmentItem) {
        continue;
      }

      let oldFile = String(await attachmentItem.getFilePathAsync());
      Zotero.debug(oldFile);
      let ext = oldFile.split(".").pop();
      let newAbsPath = Zotero.Knowledge4Zotero.NoteUtils.formatPath(
        `${Path}/${imgKey}.${ext}`
      );
      Zotero.debug(newAbsPath);
      let newFile = oldFile;
      try {
        // Don't overwrite
        if (skipSavingImages || (await OS.File.exists(newAbsPath))) {
          newFile = newAbsPath.replace(/\\/g, "/");
        } else {
          newFile = (await Zotero.File.copyToUnique(oldFile, newAbsPath)).path;
          newFile = newFile.replace(/\\/g, "/");
        }
        newFile = Zotero.File.normalizeToUnix(
          absolutePath ? newFile : `attachments/${newFile.split(/\//).pop()}`
        );
      } catch (e) {
        Zotero.debug(e);
      }
      Zotero.debug(newFile);

      node.properties.src = newFile ? newFile : oldFile;

      if (mode === NodeMode.direct) {
        const newChild = h("span");
        this.replace(newChild, node);
        newChild.properties.ztype = "zimage";
        // const newNode = h("zimage", [newChild]);
        // this.replace(node, newNode);
        node.properties.alt = toHtml(newChild);
      }
      console.log("zimage", node);
    }
  }

  getM2NRehypeAnnotationNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) => node.type === "element" && node.properties?.dataAnnotation,
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  getM2NRehypeHighlightNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" && node.properties?.ztype === "zhighlight",
      (node) => nodes.push(node)
    );
    console.log("N2M:highlight", nodes);
    return new Array(...new Set(nodes));
  }

  getM2NRehypeCitationNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" &&
        (node.properties?.ztype === "zcitation" ||
          node.properties?.dataCitation),
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  getM2NRehypeNoteLinkNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) =>
        node.type === "element" && node.properties?.ztype === "znotelink",
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  getM2NRehypeImageNodes(rehype) {
    const nodes = [];
    visit(
      rehype,
      (node: any) => node.type === "element" && node.tagName === "img",
      (node) => nodes.push(node)
    );
    return new Array(...new Set(nodes));
  }

  processM2NRehypeMetaImageNodes(nodes) {
    if (!nodes.length) {
      return;
    }

    console.log("processing M2N meta images", nodes);
    for (const node of nodes) {
      if (/zimage/.test(node.properties.alt)) {
        const newNode: any = unified()
          .use(remarkGfm)
          .use(remarkMath)
          .use(rehypeParse, { fragment: true })
          .parse(node.properties.alt);
        console.log(newNode);
        newNode.properties.src = node.properties.src;
        this.replace(node, newNode);
      }
    }
  }

  processM2NRehypeHighlightNodes(nodes) {
    if (!nodes.length) {
      return;
    }
    for (const node of nodes) {
      // node.children[0] is <a>, its children is the real children
      node.children = node.children[0].children;
      delete node.properties.ztype;
    }
  }

  async processM2NRehypeCitationNodes(nodes, isImport: boolean = false) {
    if (!nodes.length) {
      return;
    }
    for (const node of nodes) {
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
            decodeURIComponent(node.properties.dataCitation)
          );
          const ids = dataCitation.citationItems.map((c) =>
            Zotero.URI.getURIItemID(c.uris[0])
          );
          const html = await this._Addon.NoteParse.parseCitationHTML(ids);
          const newNode = this.note2rehype(html);
          // root -> p -> span(cite, this is what we actually want)
          this.replace(node, (newNode.children[0] as any).children[0]);
        } catch (e) {
          Zotero.debug(e);
          console.log(e);
          continue;
        }
      } else {
        visit(
          node,
          (_n: any) => _n.properties?.className.includes("citation-item"),
          (_n) => {
            _n.children = [{ type: "text", value: toText(_n) }];
          }
        );
        delete node.properties?.ztype;
      }
    }
  }

  processM2NRehypeNoteLinkNodes(nodes) {
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

  async processM2NRehypeImageNodes(
    nodes: any[],
    noteItem: Zotero.Item,
    fileDir: string,
    isImport: boolean = false
  ) {
    if (!nodes.length || (isImport && !noteItem)) {
      return;
    }

    console.log("processing M2N images", nodes);
    for (const node of nodes) {
      if (isImport) {
        // We encode the src in md2remark and decode it here.
        let src = Zotero.File.normalizeToUnix(
          decodeURIComponent(node.properties.src)
        );
        const srcType = (src as string).startsWith("data:")
          ? "b64"
          : (src as string).startsWith("http")
          ? "url"
          : "file";
        if (srcType === "file") {
          if (!(await OS.File.exists(src))) {
            src = OS.Path.join(fileDir, src);
            if (!(await OS.File.exists(src))) {
              Zotero.debug("BN:parse image, path invalid");
              continue;
            }
          }
        }
        const key = await (
          Zotero.Knowledge4Zotero as Knowledge4Zotero
        ).NoteUtils._importImage(noteItem, src, srcType);
        node.properties.dataAttachmentKey = key;
      }
      delete node.properties.src;
      node.properties.ztype && delete node.properties.ztype;
    }
  }
}

export { SyncUtils, NodeMode };
