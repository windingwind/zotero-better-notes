/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2021 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
                     http://digitalscholar.org/
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

let bundle;
(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = "function" == typeof require && require;
          if (!f && c) return c(i, !0);
          if (u) return u(i, !0);
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = "MODULE_NOT_FOUND"), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function (r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (
      var u = "function" == typeof require && require, i = 0;
      i < t.length;
      i++
    )
      o(t[i]);
    return o;
  }
  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        // shim for using process in browser
        var process = (module.exports = {});

        // cached from whatever global is present so that test runners that stub it
        // don't break things.  But we need to wrap it in a try catch in case it is
        // wrapped in strict mode code which doesn't define any globals.  It's inside a
        // function because try/catches deoptimize in certain engines.

        var cachedSetTimeout;
        var cachedClearTimeout;

        function defaultSetTimout() {
          throw new Error("setTimeout has not been defined");
        }
        function defaultClearTimeout() {
          throw new Error("clearTimeout has not been defined");
        }
        (function () {
          try {
            if (typeof setTimeout === "function") {
              cachedSetTimeout = setTimeout;
            } else {
              cachedSetTimeout = defaultSetTimout;
            }
          } catch (e) {
            cachedSetTimeout = defaultSetTimout;
          }
          try {
            if (typeof clearTimeout === "function") {
              cachedClearTimeout = clearTimeout;
            } else {
              cachedClearTimeout = defaultClearTimeout;
            }
          } catch (e) {
            cachedClearTimeout = defaultClearTimeout;
          }
        })();
        function runTimeout(fun) {
          if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
          }
          // if setTimeout wasn't available but was latter defined
          if (
            (cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) &&
            setTimeout
          ) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
          }
          try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
          } catch (e) {
            try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
              return cachedSetTimeout.call(null, fun, 0);
            } catch (e) {
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
              return cachedSetTimeout.call(this, fun, 0);
            }
          }
        }
        function runClearTimeout(marker) {
          if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
          }
          // if clearTimeout wasn't available but was latter defined
          if (
            (cachedClearTimeout === defaultClearTimeout ||
              !cachedClearTimeout) &&
            clearTimeout
          ) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
          }
          try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
          } catch (e) {
            try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
              return cachedClearTimeout.call(null, marker);
            } catch (e) {
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
              // Some versions of I.E. have different rules for clearTimeout vs setTimeout
              return cachedClearTimeout.call(this, marker);
            }
          }
        }
        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;

        function cleanUpNextTick() {
          if (!draining || !currentQueue) {
            return;
          }
          draining = false;
          if (currentQueue.length) {
            queue = currentQueue.concat(queue);
          } else {
            queueIndex = -1;
          }
          if (queue.length) {
            drainQueue();
          }
        }

        function drainQueue() {
          if (draining) {
            return;
          }
          var timeout = runTimeout(cleanUpNextTick);
          draining = true;

          var len = queue.length;
          while (len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
              if (currentQueue) {
                currentQueue[queueIndex].run();
              }
            }
            queueIndex = -1;
            len = queue.length;
          }
          currentQueue = null;
          draining = false;
          runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
          var args = new Array(arguments.length - 1);
          if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
            }
          }
          queue.push(new Item(fun, args));
          if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
          }
        };

        // v8 likes predictible objects
        function Item(fun, array) {
          this.fun = fun;
          this.array = array;
        }
        Item.prototype.run = function () {
          this.fun.apply(null, this.array);
        };
        process.title = "browser";
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ""; // empty string to avoid regexp issues
        process.versions = {};

        function noop() {}

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) {
          return [];
        };

        process.binding = function (name) {
          throw new Error("process.binding is not supported");
        };

        process.cwd = function () {
          return "/";
        };
        process.chdir = function (dir) {
          throw new Error("process.chdir is not supported");
        };
        process.umask = function () {
          return 0;
        };
      },
      {},
    ],
    2: [
      function (require, module, exports) {
        "use strict";

        Object.defineProperty(exports, "__esModule", { value: true });

        var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;

        function highlightedCodeBlock(turndownService) {
          turndownService.addRule("highlightedCodeBlock", {
            filter: function (node) {
              var firstChild = node.firstChild;
              return (
                node.nodeName === "DIV" &&
                highlightRegExp.test(node.className) &&
                firstChild &&
                firstChild.nodeName === "PRE"
              );
            },
            replacement: function (content, node, options) {
              var className = node.className || "";
              var language = (className.match(highlightRegExp) || [
                null,
                "",
              ])[1];

              return (
                "\n\n" +
                options.fence +
                language +
                "\n" +
                node.firstChild.textContent +
                "\n" +
                options.fence +
                "\n\n"
              );
            },
          });
        }

        function strikethrough(turndownService) {
          turndownService.addRule("strikethrough", {
            filter: ["del", "s", "strike"],
            replacement: function (content) {
              return "~" + content + "~";
            },
          });
        }

        var indexOf = Array.prototype.indexOf;
        var every = Array.prototype.every;
        var rules = {};

        rules.tableCell = {
          filter: ["th", "td"],
          replacement: function (content, node) {
            return cell(content, node);
          },
        };

        rules.tableRow = {
          filter: "tr",
          replacement: function (content, node) {
            var borderCells = "";
            var alignMap = { left: ":--", right: "--:", center: ":-:" };

            if (isHeadingRow(node)) {
              for (var i = 0; i < node.childNodes.length; i++) {
                var border = "---";
                var align = (
                  node.childNodes[i].getAttribute("align") || ""
                ).toLowerCase();

                if (align) border = alignMap[align] || border;

                borderCells += cell(border, node.childNodes[i]);
              }
            }
            return "\n" + content + (borderCells ? "\n" + borderCells : "");
          },
        };

        rules.table = {
          // Only convert tables with a heading row.
          // Tables with no heading row are kept using `keep` (see below).
          filter: function (node) {
            return node.nodeName === "TABLE" && isHeadingRow(node.rows[0]);
          },

          replacement: function (content) {
            // Ensure there are no blank lines
            content = content.replace("\n\n", "\n");
            return "\n\n" + content + "\n\n";
          },
        };

        rules.tableSection = {
          filter: ["thead", "tbody", "tfoot"],
          replacement: function (content) {
            return content;
          },
        };

        // A tr is a heading row if:
        // - the parent is a THEAD
        // - or if its the first child of the TABLE or the first TBODY (possibly
        //   following a blank THEAD)
        // - and every cell is a TH
        function isHeadingRow(tr) {
          var parentNode = tr.parentNode;
          return (
            parentNode.nodeName === "THEAD" ||
            (parentNode.firstChild === tr &&
              (parentNode.nodeName === "TABLE" || isFirstTbody(parentNode)) &&
              every.call(tr.childNodes, function (n) {
                return n.nodeName === "TH";
              }))
          );
        }

        function isFirstTbody(element) {
          var previousSibling = element.previousSibling;
          return (
            element.nodeName === "TBODY" &&
            (!previousSibling ||
              (previousSibling.nodeName === "THEAD" &&
                /^\s*$/i.test(previousSibling.textContent)))
          );
        }

        function cell(content, node) {
          var index = indexOf.call(node.parentNode.childNodes, node);
          var prefix = " ";
          if (index === 0) prefix = "| ";
          return prefix + content + " |";
        }

        function tables(turndownService) {
          turndownService.keep(function (node) {
            return node.nodeName === "TABLE" && !isHeadingRow(node.rows[0]);
          });
          for (var key in rules) turndownService.addRule(key, rules[key]);
        }

        function taskListItems(turndownService) {
          turndownService.addRule("taskListItems", {
            filter: function (node) {
              return (
                node.type === "checkbox" && node.parentNode.nodeName === "LI"
              );
            },
            replacement: function (content, node) {
              return (node.checked ? "[x]" : "[ ]") + " ";
            },
          });
        }

        function gfm(turndownService) {
          turndownService.use([
            highlightedCodeBlock,
            strikethrough,
            tables,
            taskListItems,
          ]);
        }

        exports.gfm = gfm;
        exports.highlightedCodeBlock = highlightedCodeBlock;
        exports.strikethrough = strikethrough;
        exports.tables = tables;
        exports.taskListItems = taskListItems;
      },
      {},
    ],
    3: [
      function (require, module, exports) {
        (function (process) {
          (function () {
            (function (global, factory) {
              typeof exports === "object" && typeof module !== "undefined"
                ? (module.exports = factory())
                : typeof define === "function" && define.amd
                ? define(factory)
                : ((global =
                    typeof globalThis !== "undefined"
                      ? globalThis
                      : global || self),
                  (global.TurndownService = factory()));
            })(this, function () {
              "use strict";

              function extend(destination) {
                for (var i = 1; i < arguments.length; i++) {
                  var source = arguments[i];
                  for (var key in source) {
                    if (source.hasOwnProperty(key))
                      destination[key] = source[key];
                  }
                }
                return destination;
              }

              function repeat(character, count) {
                return Array(count + 1).join(character);
              }

              function trimLeadingNewlines(string) {
                return string.replace(/^\n*/, "");
              }

              function trimTrailingNewlines(string) {
                // avoid match-at-end regexp bottleneck, see #370
                var indexEnd = string.length;
                while (indexEnd > 0 && string[indexEnd - 1] === "\n")
                  indexEnd--;
                return string.substring(0, indexEnd);
              }

              var blockElements = [
                "ADDRESS",
                "ARTICLE",
                "ASIDE",
                "AUDIO",
                "BLOCKQUOTE",
                "BODY",
                "CANVAS",
                "CENTER",
                "DD",
                "DIR",
                "DIV",
                "DL",
                "DT",
                "FIELDSET",
                "FIGCAPTION",
                "FIGURE",
                "FOOTER",
                "FORM",
                "FRAMESET",
                "H1",
                "H2",
                "H3",
                "H4",
                "H5",
                "H6",
                "HEADER",
                "HGROUP",
                "HR",
                "HTML",
                "ISINDEX",
                "LI",
                "MAIN",
                "MENU",
                "NAV",
                "NOFRAMES",
                "NOSCRIPT",
                "OL",
                "OUTPUT",
                "P",
                "PRE",
                "SECTION",
                "TABLE",
                "TBODY",
                "TD",
                "TFOOT",
                "TH",
                "THEAD",
                "TR",
                "UL",
              ];

              function isBlock(node) {
                return is(node, blockElements);
              }

              var voidElements = [
                "AREA",
                "BASE",
                "BR",
                "COL",
                "COMMAND",
                "EMBED",
                "HR",
                "IMG",
                "INPUT",
                "KEYGEN",
                "LINK",
                "META",
                "PARAM",
                "SOURCE",
                "TRACK",
                "WBR",
              ];

              function isVoid(node) {
                return is(node, voidElements);
              }

              function hasVoid(node) {
                return has(node, voidElements);
              }

              var meaningfulWhenBlankElements = [
                "A",
                "TABLE",
                "THEAD",
                "TBODY",
                "TFOOT",
                "TH",
                "TD",
                "IFRAME",
                "SCRIPT",
                "AUDIO",
                "VIDEO",
              ];

              function isMeaningfulWhenBlank(node) {
                return is(node, meaningfulWhenBlankElements);
              }

              function hasMeaningfulWhenBlank(node) {
                return has(node, meaningfulWhenBlankElements);
              }

              function is(node, tagNames) {
                return tagNames.indexOf(node.nodeName) >= 0;
              }

              function has(node, tagNames) {
                return (
                  node.getElementsByTagName &&
                  tagNames.some(function (tagName) {
                    return node.getElementsByTagName(tagName).length;
                  })
                );
              }

              var rules = {};

              rules.paragraph = {
                filter: "p",

                replacement: function (content) {
                  return "\n\n" + content + "\n\n";
                },
              };

              rules.lineBreak = {
                filter: "br",

                replacement: function (content, node, options) {
                  return options.br + "\n";
                },
              };

              rules.heading = {
                filter: ["h1", "h2", "h3", "h4", "h5", "h6"],

                replacement: function (content, node, options) {
                  var hLevel = Number(node.nodeName.charAt(1));

                  if (options.headingStyle === "setext" && hLevel < 3) {
                    var underline = repeat(
                      hLevel === 1 ? "=" : "-",
                      content.length
                    );
                    return "\n\n" + content + "\n" + underline + "\n\n";
                  } else {
                    return (
                      "\n\n" + repeat("#", hLevel) + " " + content + "\n\n"
                    );
                  }
                },
              };

              rules.blockquote = {
                filter: "blockquote",

                replacement: function (content) {
                  content = content.replace(/^\n+|\n+$/g, "");
                  content = content.replace(/^/gm, "> ");
                  return "\n\n" + content + "\n\n";
                },
              };

              rules.list = {
                filter: ["ul", "ol"],

                replacement: function (content, node) {
                  var parent = node.parentNode;
                  if (
                    parent.nodeName === "LI" &&
                    parent.lastElementChild === node
                  ) {
                    return "\n" + content;
                  } else {
                    return "\n\n" + content + "\n\n";
                  }
                },
              };

              rules.listItem = {
                filter: "li",

                replacement: function (content, node, options) {
                  content = content
                    .replace(/^\n+/, "") // remove leading newlines
                    .replace(/\n+$/, "\n") // replace trailing newlines with just a single one
                    .replace(/\n/gm, "\n    "); // indent
                  var prefix = options.bulletListMarker + "   ";
                  var parent = node.parentNode;
                  if (parent.nodeName === "OL") {
                    var start = parent.getAttribute("start");
                    var index = Array.prototype.indexOf.call(
                      parent.children,
                      node
                    );
                    prefix =
                      (start ? Number(start) + index : index + 1) + ".  ";
                  }
                  return (
                    prefix +
                    content +
                    (node.nextSibling && !/\n$/.test(content) ? "\n" : "")
                  );
                },
              };

              rules.indentedCodeBlock = {
                filter: function (node, options) {
                  return (
                    options.codeBlockStyle === "indented" &&
                    node.nodeName === "PRE" &&
                    node.firstChild &&
                    node.firstChild.nodeName === "CODE"
                  );
                },

                replacement: function (content, node, options) {
                  return (
                    "\n\n    " +
                    node.firstChild.textContent.replace(/\n/g, "\n    ") +
                    "\n\n"
                  );
                },
              };

              rules.fencedCodeBlock = {
                filter: function (node, options) {
                  return (
                    options.codeBlockStyle === "fenced" &&
                    node.nodeName === "PRE" &&
                    node.firstChild &&
                    node.firstChild.nodeName === "CODE"
                  );
                },

                replacement: function (content, node, options) {
                  var className = node.firstChild.getAttribute("class") || "";
                  var language = (className.match(/language-(\S+)/) || [
                    null,
                    "",
                  ])[1];
                  var code = node.firstChild.textContent;

                  var fenceChar = options.fence.charAt(0);
                  var fenceSize = 3;
                  var fenceInCodeRegex = new RegExp(
                    "^" + fenceChar + "{3,}",
                    "gm"
                  );

                  var match;
                  while ((match = fenceInCodeRegex.exec(code))) {
                    if (match[0].length >= fenceSize) {
                      fenceSize = match[0].length + 1;
                    }
                  }

                  var fence = repeat(fenceChar, fenceSize);

                  return (
                    "\n\n" +
                    fence +
                    language +
                    "\n" +
                    code.replace(/\n$/, "") +
                    "\n" +
                    fence +
                    "\n\n"
                  );
                },
              };

              rules.horizontalRule = {
                filter: "hr",

                replacement: function (content, node, options) {
                  return "\n\n" + options.hr + "\n\n";
                },
              };

              rules.inlineLink = {
                filter: function (node, options) {
                  return (
                    options.linkStyle === "inlined" &&
                    node.nodeName === "A" &&
                    node.getAttribute("href")
                  );
                },

                replacement: function (content, node) {
                  var href = node.getAttribute("href");
                  var title = cleanAttribute(node.getAttribute("title"));
                  if (title) title = ' "' + title + '"';
                  return "[" + content + "](" + href + title + ")";
                },
              };

              rules.referenceLink = {
                filter: function (node, options) {
                  return (
                    options.linkStyle === "referenced" &&
                    node.nodeName === "A" &&
                    node.getAttribute("href")
                  );
                },

                replacement: function (content, node, options) {
                  var href = node.getAttribute("href");
                  var title = cleanAttribute(node.getAttribute("title"));
                  if (title) title = ' "' + title + '"';
                  var replacement;
                  var reference;

                  switch (options.linkReferenceStyle) {
                    case "collapsed":
                      replacement = "[" + content + "][]";
                      reference = "[" + content + "]: " + href + title;
                      break;
                    case "shortcut":
                      replacement = "[" + content + "]";
                      reference = "[" + content + "]: " + href + title;
                      break;
                    default:
                      var id = this.references.length + 1;
                      replacement = "[" + content + "][" + id + "]";
                      reference = "[" + id + "]: " + href + title;
                  }

                  this.references.push(reference);
                  return replacement;
                },

                references: [],

                append: function (options) {
                  var references = "";
                  if (this.references.length) {
                    references = "\n\n" + this.references.join("\n") + "\n\n";
                    this.references = []; // Reset references
                  }
                  return references;
                },
              };

              rules.emphasis = {
                filter: ["em", "i"],

                replacement: function (content, node, options) {
                  if (!content.trim()) return "";
                  return options.emDelimiter + content + options.emDelimiter;
                },
              };

              rules.strong = {
                filter: ["strong", "b"],

                replacement: function (content, node, options) {
                  if (!content.trim()) return "";
                  return (
                    options.strongDelimiter + content + options.strongDelimiter
                  );
                },
              };

              rules.code = {
                filter: function (node) {
                  var hasSiblings = node.previousSibling || node.nextSibling;
                  var isCodeBlock =
                    node.parentNode.nodeName === "PRE" && !hasSiblings;

                  return node.nodeName === "CODE" && !isCodeBlock;
                },

                replacement: function (content) {
                  if (!content) return "";
                  content = content.replace(/\r?\n|\r/g, " ");

                  var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content)
                    ? " "
                    : "";
                  var delimiter = "`";
                  var matches = content.match(/`+/gm) || [];
                  while (matches.indexOf(delimiter) !== -1)
                    delimiter = delimiter + "`";

                  return (
                    delimiter + extraSpace + content + extraSpace + delimiter
                  );
                },
              };

              rules.image = {
                filter: "img",

                replacement: function (content, node) {
                  var alt = cleanAttribute(node.getAttribute("alt"));
                  var src = node.getAttribute("src") || "";
                  var title = cleanAttribute(node.getAttribute("title"));
                  var titlePart = title ? ' "' + title + '"' : "";
                  return src
                    ? "![" + alt + "]" + "(" + src + titlePart + ")"
                    : "";
                },
              };

              function cleanAttribute(attribute) {
                return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
              }

              /**
               * Manages a collection of rules used to convert HTML to Markdown
               */

              function Rules(options) {
                this.options = options;
                this._keep = [];
                this._remove = [];

                this.blankRule = {
                  replacement: options.blankReplacement,
                };

                this.keepReplacement = options.keepReplacement;

                this.defaultRule = {
                  replacement: options.defaultReplacement,
                };

                this.array = [];
                for (var key in options.rules)
                  this.array.push(options.rules[key]);
              }

              Rules.prototype = {
                add: function (key, rule) {
                  this.array.unshift(rule);
                },

                keep: function (filter) {
                  this._keep.unshift({
                    filter: filter,
                    replacement: this.keepReplacement,
                  });
                },

                remove: function (filter) {
                  this._remove.unshift({
                    filter: filter,
                    replacement: function () {
                      return "";
                    },
                  });
                },

                forNode: function (node) {
                  if (node.isBlank) return this.blankRule;
                  var rule;

                  if ((rule = findRule(this.array, node, this.options)))
                    return rule;
                  if ((rule = findRule(this._keep, node, this.options)))
                    return rule;
                  if ((rule = findRule(this._remove, node, this.options)))
                    return rule;

                  return this.defaultRule;
                },

                forEach: function (fn) {
                  for (var i = 0; i < this.array.length; i++)
                    fn(this.array[i], i);
                },
              };

              function findRule(rules, node, options) {
                for (var i = 0; i < rules.length; i++) {
                  var rule = rules[i];
                  if (filterValue(rule, node, options)) return rule;
                }
                return void 0;
              }

              function filterValue(rule, node, options) {
                var filter = rule.filter;
                if (typeof filter === "string") {
                  if (filter === node.nodeName.toLowerCase()) return true;
                } else if (Array.isArray(filter)) {
                  if (filter.indexOf(node.nodeName.toLowerCase()) > -1)
                    return true;
                } else if (typeof filter === "function") {
                  if (filter.call(rule, node, options)) return true;
                } else {
                  throw new TypeError(
                    "`filter` needs to be a string, array, or function"
                  );
                }
              }

              /**
               * The collapseWhitespace function is adapted from collapse-whitespace
               * by Luc Thevenard.
               *
               * The MIT License (MIT)
               *
               * Copyright (c) 2014 Luc Thevenard <lucthevenard@gmail.com>
               *
               * Permission is hereby granted, free of charge, to any person obtaining a copy
               * of this software and associated documentation files (the "Software"), to deal
               * in the Software without restriction, including without limitation the rights
               * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
               * copies of the Software, and to permit persons to whom the Software is
               * furnished to do so, subject to the following conditions:
               *
               * The above copyright notice and this permission notice shall be included in
               * all copies or substantial portions of the Software.
               *
               * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
               * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
               * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
               * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
               * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
               * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
               * THE SOFTWARE.
               */

              /**
               * collapseWhitespace(options) removes extraneous whitespace from an the given element.
               *
               * @param {Object} options
               */
              function collapseWhitespace(options) {
                var element = options.element;
                var isBlock = options.isBlock;
                var isVoid = options.isVoid;
                var isPre =
                  options.isPre ||
                  function (node) {
                    return node.nodeName === "PRE";
                  };

                if (!element.firstChild || isPre(element)) return;

                var prevText = null;
                var keepLeadingWs = false;

                var prev = null;
                var node = next(prev, element, isPre);

                while (node !== element) {
                  if (node.nodeType === 3 || node.nodeType === 4) {
                    // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
                    var text = node.data.replace(/[ \r\n\t]+/g, " ");

                    if (
                      (!prevText || / $/.test(prevText.data)) &&
                      !keepLeadingWs &&
                      text[0] === " "
                    ) {
                      text = text.substr(1);
                    }

                    // `text` might be empty at this point.
                    if (!text) {
                      node = remove(node);
                      continue;
                    }

                    node.data = text;

                    prevText = node;
                  } else if (node.nodeType === 1) {
                    // Node.ELEMENT_NODE
                    if (isBlock(node) || node.nodeName === "BR") {
                      if (prevText) {
                        prevText.data = prevText.data.replace(/ $/, "");
                      }

                      prevText = null;
                      keepLeadingWs = false;
                    } else if (isVoid(node) || isPre(node)) {
                      // Avoid trimming space around non-block, non-BR void elements and inline PRE.
                      prevText = null;
                      keepLeadingWs = true;
                    } else if (prevText) {
                      // Drop protection if set previously.
                      keepLeadingWs = false;
                    }
                  } else {
                    node = remove(node);
                    continue;
                  }

                  var nextNode = next(prev, node, isPre);
                  prev = node;
                  node = nextNode;
                }

                if (prevText) {
                  prevText.data = prevText.data.replace(/ $/, "");
                  if (!prevText.data) {
                    remove(prevText);
                  }
                }
              }

              /**
               * remove(node) removes the given node from the DOM and returns the
               * next node in the sequence.
               *
               * @param {Node} node
               * @return {Node} node
               */
              function remove(node) {
                var next = node.nextSibling || node.parentNode;

                node.parentNode.removeChild(node);

                return next;
              }

              /**
               * next(prev, current, isPre) returns the next node in the sequence, given the
               * current and previous nodes.
               *
               * @param {Node} prev
               * @param {Node} current
               * @param {Function} isPre
               * @return {Node}
               */
              function next(prev, current, isPre) {
                if ((prev && prev.parentNode === current) || isPre(current)) {
                  return current.nextSibling || current.parentNode;
                }

                return (
                  current.firstChild ||
                  current.nextSibling ||
                  current.parentNode
                );
              }

              /*
               * Set up window for Node.js
               */

              var root = typeof window !== "undefined" ? window : {};

              /*
               * Parsing HTML strings
               */

              function canParseHTMLNatively() {
                var Parser = root.DOMParser;
                var canParse = false;

                // Adapted from https://gist.github.com/1129031
                // Firefox/Opera/IE throw errors on unsupported types
                try {
                  // WebKit returns null on unsupported types
                  if (new Parser().parseFromString("", "text/html")) {
                    canParse = true;
                  }
                } catch (e) {}

                return canParse;
              }

              function createHTMLParser() {
                var Parser = function () {};

                {
                  if (shouldUseActiveX()) {
                    Parser.prototype.parseFromString = function (string) {
                      var doc = new window.ActiveXObject("htmlfile");
                      doc.designMode = "on"; // disable on-page scripts
                      doc.open();
                      doc.write(string);
                      doc.close();
                      return doc;
                    };
                  } else {
                    Parser.prototype.parseFromString = function (string) {
                      var doc = document.implementation.createHTMLDocument("");
                      doc.open();
                      doc.write(string);
                      doc.close();
                      return doc;
                    };
                  }
                }
                return Parser;
              }

              function shouldUseActiveX() {
                var useActiveX = false;
                try {
                  document.implementation.createHTMLDocument("").open();
                } catch (e) {
                  if (window.ActiveXObject) useActiveX = true;
                }
                return useActiveX;
              }

              function RootNode(input, options) {
                var root;
                if (typeof input === "string") {
                  var doc = htmlParser().parseFromString(
                    // DOM parsers arrange elements in the <head> and <body>.
                    // Wrapping in a custom element ensures elements are reliably arranged in
                    // a single element.
                    '<x-turndown id="turndown-root">' + input + "</x-turndown>",
                    "text/html"
                  );
                  root = doc.getElementById("turndown-root");
                } else {
                  root = input.cloneNode(true);
                }
                collapseWhitespace({
                  element: root,
                  isBlock: isBlock,
                  isVoid: isVoid,
                  isPre: options.preformattedCode ? isPreOrCode : null,
                });

                return root;
              }

              var _htmlParser;
              function htmlParser() {
                _htmlParser = _htmlParser || new HTMLParser();
                return _htmlParser;
              }

              function isPreOrCode(node) {
                return node.nodeName === "PRE" || node.nodeName === "CODE";
              }

              function Node(node, options) {
                node.isBlock = isBlock(node);
                node.isCode =
                  node.nodeName === "CODE" || node.parentNode.isCode;
                node.isBlank = isBlank(node);
                node.flankingWhitespace = flankingWhitespace(node, options);
                return node;
              }

              function isBlank(node) {
                return (
                  !isVoid(node) &&
                  !isMeaningfulWhenBlank(node) &&
                  /^\s*$/i.test(node.textContent) &&
                  !hasVoid(node) &&
                  !hasMeaningfulWhenBlank(node)
                );
              }

              function flankingWhitespace(node, options) {
                if (node.isBlock || (options.preformattedCode && node.isCode)) {
                  return { leading: "", trailing: "" };
                }

                var edges = edgeWhitespace(node.textContent);

                // abandon leading ASCII WS if left-flanked by ASCII WS
                if (
                  edges.leadingAscii &&
                  isFlankedByWhitespace("left", node, options)
                ) {
                  edges.leading = edges.leadingNonAscii;
                }

                // abandon trailing ASCII WS if right-flanked by ASCII WS
                if (
                  edges.trailingAscii &&
                  isFlankedByWhitespace("right", node, options)
                ) {
                  edges.trailing = edges.trailingNonAscii;
                }

                return { leading: edges.leading, trailing: edges.trailing };
              }

              function edgeWhitespace(string) {
                var m = string.match(
                  /^(([ \t\r\n]*)(\s*))[\s\S]*?((\s*?)([ \t\r\n]*))$/
                );
                return {
                  leading: m[1], // whole string for whitespace-only strings
                  leadingAscii: m[2],
                  leadingNonAscii: m[3],
                  trailing: m[4], // empty for whitespace-only strings
                  trailingNonAscii: m[5],
                  trailingAscii: m[6],
                };
              }

              function isFlankedByWhitespace(side, node, options) {
                var sibling;
                var regExp;
                var isFlanked;

                if (side === "left") {
                  sibling = node.previousSibling;
                  regExp = / $/;
                } else {
                  sibling = node.nextSibling;
                  regExp = /^ /;
                }

                if (sibling) {
                  if (sibling.nodeType === 3) {
                    isFlanked = regExp.test(sibling.nodeValue);
                  } else if (
                    options.preformattedCode &&
                    sibling.nodeName === "CODE"
                  ) {
                    isFlanked = false;
                  } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
                    isFlanked = regExp.test(sibling.textContent);
                  }
                }
                return isFlanked;
              }

              var reduce = Array.prototype.reduce;
              var escapes = [
                // [/\\/g, '\\\\'],
                // [/\*/g, '\\*'],
                [/^-/g, "\\-"],
                [/^\+ /g, "\\+ "],
                [/^(=+)/g, "\\$1"],
                [/^(#{1,6}) /g, "\\$1 "],
                [/`/g, "\\`"],
                [/^~~~/g, "\\~~~"],
                [/\[/g, "\\["],
                [/\]/g, "\\]"],
                [/^>/g, "\\>"],
                [/_/g, "\\_"],
                [/^(\d+)\. /g, "$1\\. "],
              ];

              function TurndownService(options) {
                if (!(this instanceof TurndownService))
                  return new TurndownService(options);

                var defaults = {
                  rules: rules,
                  headingStyle: "setext",
                  hr: "* * *",
                  bulletListMarker: "*",
                  codeBlockStyle: "indented",
                  fence: "```",
                  emDelimiter: "_",
                  strongDelimiter: "**",
                  linkStyle: "inlined",
                  linkReferenceStyle: "full",
                  br: "  ",
                  preformattedCode: false,
                  blankReplacement: function (content, node) {
                    return node.isBlock ? "\n\n" : "";
                  },
                  keepReplacement: function (content, node) {
                    return node.isBlock
                      ? "\n\n" + node.outerHTML + "\n\n"
                      : node.outerHTML;
                  },
                  defaultReplacement: function (content, node) {
                    return node.isBlock ? "\n\n" + content + "\n\n" : content;
                  },
                };
                this.options = extend({}, defaults, options);
                this.rules = new Rules(this.options);
              }

              TurndownService.prototype = {
                /**
                 * The entry point for converting a string or DOM node to Markdown
                 * @public
                 * @param {String|HTMLElement} input The string or DOM node to convert
                 * @returns A Markdown representation of the input
                 * @type String
                 */

                turndown: function (input) {
                  if (!canConvert(input)) {
                    throw new TypeError(
                      input +
                        " is not a string, or an element/document/fragment node."
                    );
                  }

                  if (input === "") return "";

                  var output = process.call(
                    this,
                    new RootNode(input, this.options)
                  );
                  return postProcess.call(this, output);
                },

                /**
                 * Add one or more plugins
                 * @public
                 * @param {Function|Array} plugin The plugin or array of plugins to add
                 * @returns The Turndown instance for chaining
                 * @type Object
                 */

                use: function (plugin) {
                  if (Array.isArray(plugin)) {
                    for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
                  } else if (typeof plugin === "function") {
                    plugin(this);
                  } else {
                    throw new TypeError(
                      "plugin must be a Function or an Array of Functions"
                    );
                  }
                  return this;
                },

                /**
                 * Adds a rule
                 * @public
                 * @param {String} key The unique key of the rule
                 * @param {Object} rule The rule
                 * @returns The Turndown instance for chaining
                 * @type Object
                 */

                addRule: function (key, rule) {
                  this.rules.add(key, rule);
                  return this;
                },

                /**
                 * Keep a node (as HTML) that matches the filter
                 * @public
                 * @param {String|Array|Function} filter The unique key of the rule
                 * @returns The Turndown instance for chaining
                 * @type Object
                 */

                keep: function (filter) {
                  this.rules.keep(filter);
                  return this;
                },

                /**
                 * Remove a node that matches the filter
                 * @public
                 * @param {String|Array|Function} filter The unique key of the rule
                 * @returns The Turndown instance for chaining
                 * @type Object
                 */

                remove: function (filter) {
                  this.rules.remove(filter);
                  return this;
                },

                /**
                 * Escapes Markdown syntax
                 * @public
                 * @param {String} string The string to escape
                 * @returns A string with Markdown syntax escaped
                 * @type String
                 */

                escape: function (string) {
                  return escapes.reduce(function (accumulator, escape) {
                    return accumulator.replace(escape[0], escape[1]);
                  }, string);
                },
              };

              /**
               * Reduces a DOM node down to its Markdown string equivalent
               * @private
               * @param {HTMLElement} parentNode The node to convert
               * @returns A Markdown representation of the node
               * @type String
               */

              function process(parentNode) {
                var self = this;
                return reduce.call(
                  parentNode.childNodes,
                  function (output, node) {
                    node = new Node(node, self.options);

                    var replacement = "";
                    if (node.nodeType === 3) {
                      replacement = node.isCode
                        ? node.nodeValue
                        : self.escape(node.nodeValue);
                    } else if (node.nodeType === 1) {
                      replacement = replacementForNode.call(self, node);
                    }

                    return join(output, replacement);
                  },
                  ""
                );
              }

              /**
               * Appends strings as each rule requires and trims the output
               * @private
               * @param {String} output The conversion output
               * @returns A trimmed version of the ouput
               * @type String
               */

              function postProcess(output) {
                var self = this;
                this.rules.forEach(function (rule) {
                  if (typeof rule.append === "function") {
                    output = join(output, rule.append(self.options));
                  }
                });

                return output
                  .replace(/^[\t\r\n]+/, "")
                  .replace(/[\t\r\n\s]+$/, "");
              }

              /**
               * Converts an element node to its Markdown equivalent
               * @private
               * @param {HTMLElement} node The node to convert
               * @returns A Markdown representation of the node
               * @type String
               */

              function replacementForNode(node) {
                var rule = this.rules.forNode(node);
                var content = process.call(this, node);
                var whitespace = node.flankingWhitespace;
                if (whitespace.leading || whitespace.trailing)
                  content = content.trim();
                return (
                  whitespace.leading +
                  rule.replacement(content, node, this.options) +
                  whitespace.trailing
                );
              }

              /**
               * Joins replacement to the current output with appropriate number of new lines
               * @private
               * @param {String} output The current conversion output
               * @param {String} replacement The string to append to the output
               * @returns Joined output
               * @type String
               */

              function join(output, replacement) {
                var s1 = trimTrailingNewlines(output);
                var s2 = trimLeadingNewlines(replacement);
                var nls = Math.max(
                  output.length - s1.length,
                  replacement.length - s2.length
                );
                var separator = "\n\n".substring(0, nls);

                return s1 + separator + s2;
              }

              /**
               * Determines whether an input can be converted
               * @private
               * @param {String|HTMLElement} input Describe this parameter
               * @returns Describe what it returns
               * @type String|Object|Array|Boolean|Number
               */

              function canConvert(input) {
                return (
                  input != null &&
                  (typeof input === "string" ||
                    (input.nodeType &&
                      (input.nodeType === 1 ||
                        input.nodeType === 9 ||
                        input.nodeType === 11)))
                );
              }

              return TurndownService;
            });
          }.call(this));
        }.call(this, require("_process")));
      },
      { _process: 1 },
    ],
    4: [
      function (require, module, exports) {
        /*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2021 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
                     http://digitalscholar.org/
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

        let TurndownService = require("turndown/lib/turndown.browser.umd");
        let turndownPluginGfm = require("turndown-plugin-gfm");

        let turndownService = new TurndownService({
          headingStyle: "atx",
          bulletListMarker: "-",
          emDelimiter: "*",
          codeBlockStyle: "fenced",
        });

        turndownService.use(turndownPluginGfm.gfm);

        async function convert(_Zotero, doc) {
          Components.utils.import("resource://gre/modules/osfile.jsm");
          // Transform `style="text-decoration: line-through"` nodes to <s> (TinyMCE doesn't support <s>)
          doc.querySelectorAll("span").forEach(function (span) {
            if (span.style.textDecoration === "line-through") {
              let s = doc.createElement("s");
              s.append(...span.childNodes);
              span.replaceWith(s);
            }
          });

          // Turndown wants pre content inside additional code block
          doc.querySelectorAll("pre").forEach(function (pre) {
            let code = doc.createElement("code");
            code.append(...pre.childNodes);
            pre.append(code);
          });

          // Insert a PDF link for highlight and image annotation nodes
          doc
            .querySelectorAll('span[class="highlight"], img[data-annotation]')
            .forEach(function (node) {
              try {
                var annotation = JSON.parse(
                  decodeURIComponent(node.getAttribute("data-annotation"))
                );
              } catch (e) {}

              if (annotation) {
                // annotation.uri was used before note-editor v4
                let uri = annotation.attachmentURI || annotation.uri;
                let position = annotation.position;
                if (
                  Zotero.getOption("includeAppLinks") &&
                  typeof uri === "string" &&
                  typeof position === "object"
                ) {
                  let openURI;
                  let uriParts = uri.split("/");
                  let libraryType = uriParts[3];
                  let key = uriParts[6];
                  if (libraryType === "users") {
                    openURI = "zotero://open-pdf/library/items/" + key;
                  }
                  // groups
                  else {
                    let groupID = uriParts[4];
                    openURI =
                      "zotero://open-pdf/groups/" + groupID + "/items/" + key;
                  }

                  openURI +=
                    "?page=" +
                    (position.pageIndex + 1) +
                    (annotation.annotationKey
                      ? "&annotation=" + annotation.annotationKey
                      : "");

                  let a = doc.createElement("a");
                  a.href = openURI;
                  a.append("pdf");
                  let fragment = doc.createDocumentFragment();
                  fragment.append(" (", a, ") ");

                  let nextNode = node.nextElementSibling;
                  if (nextNode && nextNode.classList.contains("citation")) {
                    nextNode.parentNode.insertBefore(
                      fragment,
                      nextNode.nextSibling
                    );
                  } else {
                    node.parentNode.insertBefore(fragment, node.nextSibling);
                  }
                }
              }
            });

          for (img of doc.querySelectorAll("img[data-attachment-key]")) {
            let imgKey = img.getAttribute("data-attachment-key");
            const attachmentItem = await _Zotero.Items.getByLibraryAndKeyAsync(
              _Zotero.Knowledge4Zotero.knowledge._exportNote.libraryID,
              imgKey
            );
            Zotero.debug(attachmentItem);

            let oldFile = String(await attachmentItem.getFilePathAsync());
            Zotero.debug(oldFile);
            let ext = oldFile.split(".").pop();
            let newAbsPath = OS.Path.join(
              ...`${_Zotero.Knowledge4Zotero.knowledge._exportPath}/${imgKey}.${ext}`.split(
                /\//
              )
            );
            Zotero.debug(newAbsPath);
            if (!Zotero.isWin && newAbsPath.charAt(0) !== "/") {
              newAbsPath = "/" + newAbsPath;
            }
            let newFile = oldFile;
            try {
              newFile = _Zotero.File.copyToUnique(oldFile, newAbsPath).path;
              newFile = newFile.replace(/\\/g, "/");
              newFile = `attachments/${newFile.split(/\//).pop()}`;
            } catch (e) {
              Zotero.debug(e);
            }
            Zotero.debug(newFile);

            img.setAttribute("src", newFile ? newFile : oldFile);
            img.setAttribute("alt", "image");
          }

          // Transform citations to links
          doc
            .querySelectorAll('span[class="citation"]')
            .forEach(function (span) {
              try {
                var citation = JSON.parse(
                  decodeURIComponent(span.getAttribute("data-citation"))
                );
              } catch (e) {}

              if (
                citation &&
                citation.citationItems &&
                citation.citationItems.length
              ) {
                let uris = [];
                for (let citationItem of citation.citationItems) {
                  let uri = citationItem.uris[0];
                  if (typeof uri === "string") {
                    let uriParts = uri.split("/");
                    let libraryType = uriParts[3];
                    let key = uriParts[6];
                    if (libraryType === "users") {
                      uris.push("zotero://select/library/items/" + key);
                    }
                    // groups
                    else {
                      let groupID = uriParts[4];
                      uris.push(
                        "zotero://select/groups/" + groupID + "/items/" + key
                      );
                    }
                  }
                }

                let items = Array.from(
                  span.querySelectorAll(".citation-item")
                ).map((x) => x.textContent);
                // Fallback to pre v5 note-editor schema that was serializing citations as plain text i.e.:
                // <span class="citation" data-citation="...">(Jang et al., 2005, p. 14; Kongsgaard et al., 2009, p. 790)</span>
                if (!items.length) {
                  items = span.textContent.slice(1, -1).split("; ");
                }

                span.innerHTML =
                  "(" +
                  items
                    .map((item, i) => {
                      return Zotero.getOption("includeAppLinks")
                        ? `<a href="${uris[i]}">${item}</a>`
                        : item;
                    })
                    .join("; ") +
                  ")";
              }
            });

          return turndownService.turndown(doc.body);
        }

        bundle = { convert };
      },
      { "turndown-plugin-gfm": 2, "turndown/lib/turndown.browser.umd": 3 },
    ],
  },
  {},
  [4]
);

async function doExport() {
  const _Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
    Components.interfaces.nsISupports
  ).wrappedJSObject;
  Zotero.setCharacterSet("utf-8");
  var item;
  let first = true;
  while ((item = Zotero.nextItem())) {
    if (item.itemType === "note" || item.itemType === "attachment") {
      let doc = new DOMParser().parseFromString(item.note || "", "text/html");
      // Skip empty notes
      // TODO: Take into account image-only notes
      if (!doc.body.textContent.trim()) {
        continue;
      }
      if (!first) {
        Zotero.write("\n\n---\n\n");
      }
      first = false;
      Zotero.write(await bundle.convert(_Zotero, doc));
    }
  }
}
