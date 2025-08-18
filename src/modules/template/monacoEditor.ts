import { config } from "../../../package.json";

/**
 * Monaco Editor integration for template editing
 * Handles custom language registration, syntax highlighting, and auto-completion
 */

export async function loadTemplateTypings(monaco: any) {
  try {
    // Load template-specific TypeScript definitions
    const response = await Zotero.HTTP.request(
      "GET",
      `chrome://${config.addonRef}/content/lib/js/ztypes.d.ts`,
    );

    if (response.status === 200) {
      const tsLibPath = "ts:filename/index.d.ts";
      // Add TypeScript definitions to Monaco's JavaScript defaults
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        response.responseText,
        tsLibPath,
      );

      // Configure TypeScript compiler options for templates
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2015,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: true,
        strict: false,
        noImplicitAny: false,
        noImplicitReturns: false,
        noEmitOnError: false,
        module: monaco.languages.typescript.ModuleKind.None,
      });

      ztoolkit.log("Template TypeScript definitions loaded successfully");
    }
  } catch (error) {
    ztoolkit.log("Failed to load template TypeScript definitions:", error);
  }
}

export function registerTemplateLanguage(monaco: any) {
  try {
    // Load TypeScript definitions for template globals
    loadTemplateTypings(monaco);

    // Register the custom template-markdown language
    monaco.languages.register({ id: "template-markdown" });

    // Function to tokenize JavaScript code using Monaco's built-in tokenizer
    const tokenizeJavaScript = (code: string) => {
      try {
        // Use TypeScript tokenization for better template global support
        return monaco.editor.tokenize(code, "javascript");
      } catch (e) {
        ztoolkit.log(
          "JavaScript tokenization failed, using fallback highlighting",
        );
        return null;
      }
    };

    // Define tokenization rules using the correct Monaco API
    monaco.languages.setTokensProvider("template-markdown", {
      getInitialState: () => ({
        stack: [],
        inJsBlock: false, // Track if we're inside a JavaScript block ${{...}}$
        inJsExpr: false, // Track if we're inside a JavaScript expression ${...}
        jsExprDepth: 0, // Track nesting depth for JavaScript expressions
        jsBlockDepth: 0, // Track nesting depth for JavaScript expressions
        clone: function () {
          return {
            stack: [...this.stack],
            inJsBlock: this.inJsBlock,
            inJsExpr: this.inJsExpr,
            jsExprDepth: this.jsExprDepth,
            jsBlockDepth: this.jsBlockDepth,
            clone: this.clone,
            equals: this.equals,
          };
        },
        equals: function (other: any) {
          return (
            this.stack.length === other.stack.length &&
            this.stack.every(
              (item: any, index: number) => item === other.stack[index],
            ) &&
            this.inJsBlock === other.inJsBlock &&
            this.inJsExpr === other.inJsExpr &&
            this.jsExprDepth === other.jsExprDepth &&
            this.jsBlockDepth === other.jsBlockDepth
          );
        },
      }),
      tokenize: (line: string, state: any) => {
        const tokens: any[] = [];
        let pos = 0;

        // If we're already inside a JavaScript expression from previous lines
        if (state.inJsExpr) {
          let depth = state.jsExprDepth;
          let i = 0;
          let foundEnd = false;

          // Parse character by character to find the end of the expression
          while (i < line.length) {
            if (line[i] === "{") {
              depth++;
            } else if (line[i] === "}") {
              depth--;
              if (depth === 0) {
                // Found the end of the expression
                if (i > 0) {
                  // Tokenize the JavaScript content before the closing }
                  const jsCode = line.substring(0, i);
                  const jsLines = tokenizeJavaScript(jsCode);
                  if (jsLines && jsLines.length > 0) {
                    const jsTokens = jsLines[0];
                    for (const jsToken of jsTokens) {
                      tokens.push({
                        startIndex: jsToken.offset,
                        scopes: `${jsToken.type}.embedded.template`,
                      });
                    }
                  } else {
                    // Fallback highlighting
                    tokens.push({
                      startIndex: 0,
                      scopes: "source.js.embedded.template",
                    });
                  }
                }
                // Add the closing delimiter
                tokens.push({
                  startIndex: i,
                  scopes: "delimiter.js-expression.template",
                });
                state.inJsExpr = false;
                state.jsExprDepth = 0;
                pos = i + 1;
                foundEnd = true;
                break;
              }
            }
            i++;
          }

          if (!foundEnd) {
            // Entire line is still inside the JavaScript expression
            state.jsExprDepth = depth;
            const jsLines = tokenizeJavaScript(line);
            if (jsLines && jsLines.length > 0) {
              const jsTokens = jsLines[0];
              for (const jsToken of jsTokens) {
                tokens.push({
                  startIndex: jsToken.offset,
                  scopes: `${jsToken.type}.embedded.template`,
                });
              }
            } else {
              // Fallback highlighting
              tokens.push({
                startIndex: 0,
                scopes: "source.js.embedded.template",
              });
            }
            return { tokens, endState: state.clone() };
          }
        }

        // If we're already inside a JavaScript block from previous lines
        if (state.inJsBlock) {
          const endBlockPos = line.indexOf("}}$");
          if (endBlockPos !== -1) {
            // We found the end of the block
            if (endBlockPos > 0) {
              // Tokenize the JavaScript content before the closing }}$
              const jsCode = line.substring(0, endBlockPos);
              const jsLines = tokenizeJavaScript(jsCode);
              if (jsLines && jsLines.length > 0) {
                const jsTokens = jsLines[0];
                for (const jsToken of jsTokens) {
                  tokens.push({
                    startIndex: jsToken.offset,
                    scopes: `${jsToken.type}.embedded.template`,
                  });
                }
              } else {
                // Fallback highlighting
                tokens.push({
                  startIndex: 0,
                  scopes: "source.js.embedded.template",
                });
              }
            }
            // Add the closing delimiter
            tokens.push({
              startIndex: endBlockPos,
              scopes: "delimiter.js-block.template",
            });
            state.inJsBlock = false;
            pos = endBlockPos + 3;
          } else {
            // Entire line is JavaScript code
            const jsLines = tokenizeJavaScript(line);
            if (jsLines && jsLines.length > 0) {
              const jsTokens = jsLines[0];
              for (const jsToken of jsTokens) {
                tokens.push({
                  startIndex: jsToken.offset,
                  scopes: `${jsToken.type}.embedded.template`,
                });
              }
            } else {
              // Fallback highlighting
              tokens.push({
                startIndex: 0,
                scopes: "source.js.embedded.template",
              });
            }
            return { tokens, endState: state.clone() };
          }
        }

        // Check for template directives
        const directiveMatch = line.match(
          /^\/\/\s*@(use-markdown|use-refresh|beforeloop-begin|beforeloop-end|default-begin|default-end|afterloop-begin|afterloop-end)\s*$/,
        );
        if (directiveMatch) {
          tokens.push({ startIndex: 0, scopes: "comment.directive.template" });
          return { tokens, endState: state.clone() };
        }

        // Check for regular comments
        if (line.trim().startsWith("//")) {
          tokens.push({ startIndex: 0, scopes: "comment.line.template" });
          return { tokens, endState: state.clone() };
        }

        // Check for markdown headers
        const headerMatch = line.match(/^(#{1,6})\s/);
        if (headerMatch) {
          tokens.push({ startIndex: 0, scopes: "markup.heading.template" });
          return { tokens, endState: state.clone() };
        }

        // Process the line character by character for JavaScript expressions
        while (pos < line.length) {
          // Check for JavaScript expressions ${...}
          if (line.substr(pos, 2) === "${" && line.substr(pos, 3) !== "${{") {
            tokens.push({
              startIndex: pos,
              scopes: "delimiter.js-expression.template",
            });
            pos += 2;

            // Find the closing }
            let depth = 1;
            const jsStart = pos;
            let jsEnd = pos;
            let foundEnd = false;

            while (jsEnd < line.length && depth > 0) {
              if (line[jsEnd] === "{") depth++;
              else if (line[jsEnd] === "}") depth--;
              if (depth === 0) {
                foundEnd = true;
              }
              jsEnd++;
            }

            if (foundEnd) {
              // Single-line JavaScript expression
              if (jsStart < jsEnd - 1) {
                // Extract JavaScript code and tokenize it
                const jsCode = line.substring(jsStart, jsEnd - 1);
                if (jsCode.trim()) {
                  const jsLines = tokenizeJavaScript(jsCode);
                  if (jsLines && jsLines.length > 0) {
                    // Monaco tokenize returns an array of lines, we only have one line
                    const jsTokens = jsLines[0];
                    for (const jsToken of jsTokens) {
                      tokens.push({
                        startIndex: jsStart + jsToken.offset,
                        scopes: `${jsToken.type}.embedded.template`,
                      });
                    }
                  } else {
                    // Fallback highlighting for JavaScript expressions
                    const jsCodeForHighlight = jsCode;
                    const jsKeywords =
                      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|typeof|instanceof|in|of|true|false|null|undefined)\b/g;
                    const jsStrings =
                      /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g;
                    const jsNumbers = /\b\d+(\.\d+)?\b/g;

                    let lastIndex = jsStart;
                    let match;

                    // Highlight keywords
                    while (
                      (match = jsKeywords.exec(jsCodeForHighlight)) !== null
                    ) {
                      if (lastIndex < jsStart + match.index) {
                        tokens.push({
                          startIndex: lastIndex,
                          scopes: "source.js.embedded.template",
                        });
                      }
                      tokens.push({
                        startIndex: jsStart + match.index,
                        scopes: "keyword.embedded.template",
                      });
                      lastIndex = jsStart + match.index + match[0].length;
                    }

                    // Reset regex and highlight strings
                    jsKeywords.lastIndex = 0;
                    while (
                      (match = jsStrings.exec(jsCodeForHighlight)) !== null
                    ) {
                      tokens.push({
                        startIndex: jsStart + match.index,
                        scopes: "string.embedded.template",
                      });
                    }

                    // Reset regex and highlight numbers
                    jsStrings.lastIndex = 0;
                    while (
                      (match = jsNumbers.exec(jsCodeForHighlight)) !== null
                    ) {
                      tokens.push({
                        startIndex: jsStart + match.index,
                        scopes: "number.embedded.template",
                      });
                    }

                    // Fill remaining with default JS highlighting
                    if (lastIndex < jsEnd - 1) {
                      tokens.push({
                        startIndex: lastIndex,
                        scopes: "source.js.embedded.template",
                      });
                    }
                  }
                } else {
                  tokens.push({
                    startIndex: jsStart,
                    scopes: "source.js.embedded.template",
                  });
                }
              }
              tokens.push({
                startIndex: jsEnd - 1,
                scopes: "delimiter.js-expression.template",
              });
              pos = jsEnd;
              continue;
            } else {
              // Multi-line JavaScript expression - mark state and tokenize the rest of the line as JS
              state.inJsExpr = true;
              state.jsExprDepth = depth;
              if (jsStart < line.length) {
                const jsCode = line.substring(jsStart);
                const jsLines = tokenizeJavaScript(jsCode);
                if (jsLines && jsLines.length > 0) {
                  const jsTokens = jsLines[0];
                  for (const jsToken of jsTokens) {
                    tokens.push({
                      startIndex: jsStart + jsToken.offset,
                      scopes: `${jsToken.type}.embedded.template`,
                    });
                  }
                } else {
                  tokens.push({
                    startIndex: jsStart,
                    scopes: "source.js.embedded.template",
                  });
                }
              }
              return { tokens, endState: state.clone() };
            }
          }

          // Check for JavaScript blocks ${{...}}$
          if (line.substr(pos, 3) === "${{") {
            tokens.push({
              startIndex: pos,
              scopes: "delimiter.js-block.template",
            });
            pos += 3;

            // Find the closing }}$
            const jsStart = pos;
            const endPos = line.indexOf("}}$", pos);
            if (endPos !== -1) {
              // Single-line JavaScript block
              if (jsStart < endPos) {
                // Extract JavaScript code and tokenize it
                const jsCode = line.substring(jsStart, endPos);
                if (jsCode.trim()) {
                  const jsLines = tokenizeJavaScript(jsCode);
                  if (jsLines && jsLines.length > 0) {
                    // Monaco tokenize returns an array of lines, we only have one line
                    const jsTokens = jsLines[0];
                    for (const jsToken of jsTokens) {
                      tokens.push({
                        startIndex: jsStart + jsToken.offset,
                        scopes: `${jsToken.type}.embedded.template`,
                      });
                    }
                  } else {
                    // Fallback highlighting for JavaScript blocks
                    const jsCodeForHighlight = jsCode;
                    const jsKeywords =
                      /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|typeof|instanceof|in|of|true|false|null|undefined)\b/g;
                    const jsStrings =
                      /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g;
                    const jsNumbers = /\b\d+(\.\d+)?\b/g;

                    let lastIndex = jsStart;
                    let match;

                    // Highlight keywords
                    while (
                      (match = jsKeywords.exec(jsCodeForHighlight)) !== null
                    ) {
                      if (lastIndex < jsStart + match.index) {
                        tokens.push({
                          startIndex: lastIndex,
                          scopes: "source.js.embedded.template",
                        });
                      }
                      tokens.push({
                        startIndex: jsStart + match.index,
                        scopes: "keyword.embedded.template",
                      });
                      lastIndex = jsStart + match.index + match[0].length;
                    }

                    // Reset regex and highlight strings
                    jsKeywords.lastIndex = 0;
                    while (
                      (match = jsStrings.exec(jsCodeForHighlight)) !== null
                    ) {
                      tokens.push({
                        startIndex: jsStart + match.index,
                        scopes: "string.embedded.template",
                      });
                    }

                    // Reset regex and highlight numbers
                    jsStrings.lastIndex = 0;
                    while (
                      (match = jsNumbers.exec(jsCodeForHighlight)) !== null
                    ) {
                      tokens.push({
                        startIndex: jsStart + match.index,
                        scopes: "number.embedded.template",
                      });
                    }

                    // Fill remaining with default JS highlighting
                    if (lastIndex < endPos) {
                      tokens.push({
                        startIndex: lastIndex,
                        scopes: "source.js.embedded.template",
                      });
                    }
                  }
                } else {
                  tokens.push({
                    startIndex: jsStart,
                    scopes: "source.js.embedded.template",
                  });
                }
              }
              tokens.push({
                startIndex: endPos,
                scopes: "delimiter.js-block.template",
              });
              pos = endPos + 3;
              continue;
            } else {
              // Multi-line JavaScript block - mark state and tokenize the rest of the line as JS
              state.inJsBlock = true;
              if (jsStart < line.length) {
                const jsCode = line.substring(jsStart);
                const jsLines = tokenizeJavaScript(jsCode);
                if (jsLines && jsLines.length > 0) {
                  const jsTokens = jsLines[0];
                  for (const jsToken of jsTokens) {
                    tokens.push({
                      startIndex: jsStart + jsToken.offset,
                      scopes: `${jsToken.type}.embedded.template`,
                    });
                  }
                } else {
                  tokens.push({
                    startIndex: jsStart,
                    scopes: "source.js.embedded.template",
                  });
                }
              }
              return { tokens, endState: state.clone() };
            }
          }

          // Check for markdown bold **text**
          if (line.substr(pos, 2) === "**") {
            const endPos = line.indexOf("**", pos + 2);
            if (endPos !== -1) {
              tokens.push({ startIndex: pos, scopes: "markup.bold.template" });
              pos = endPos + 2;
              continue;
            }
          }

          // Check for markdown italic *text* or _text_
          if (line[pos] === "*" || line[pos] === "_") {
            const char = line[pos];
            const endPos = line.indexOf(char, pos + 1);
            if (endPos !== -1 && endPos > pos + 1) {
              tokens.push({
                startIndex: pos,
                scopes: "markup.italic.template",
              });
              pos = endPos + 1;
              continue;
            }
          }

          // Check for markdown inline code `code`
          if (line[pos] === "`") {
            const endPos = line.indexOf("`", pos + 1);
            if (endPos !== -1) {
              tokens.push({
                startIndex: pos,
                scopes: "markup.inline.raw.template",
              });
              pos = endPos + 1;
              continue;
            }
          }

          // Check for markdown links [text](url)
          if (line[pos] === "[") {
            const closePos = line.indexOf("]", pos + 1);
            if (closePos !== -1 && line.substr(closePos + 1, 1) === "(") {
              const urlEndPos = line.indexOf(")", closePos + 2);
              if (urlEndPos !== -1) {
                tokens.push({
                  startIndex: pos,
                  scopes: "markup.underline.link.template",
                });
                pos = urlEndPos + 1;
                continue;
              }
            }
          }

          // Check for HTML tags
          if (line[pos] === "<") {
            const endPos = line.indexOf(">", pos + 1);
            if (endPos !== -1) {
              tokens.push({ startIndex: pos, scopes: "tag.template" });
              pos = endPos + 1;
              continue;
            }
          }

          pos++;
        }

        // If no specific tokens were found, mark as text
        if (tokens.length === 0) {
          tokens.push({ startIndex: 0, scopes: "text.template" });
        }

        return { tokens, endState: state.clone() };
      },
    });
  } catch (error) {
    ztoolkit.log("Failed to set tokens provider:", error);
  }

  // Configure language settings
  monaco.languages.setLanguageConfiguration("template-markdown", {
    comments: {
      lineComment: "//",
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
      ["${", "}"],
      ["${{", "}}$"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
      { open: "${", close: "}" },
      { open: "${{", close: "}}$" },
      { open: "**", close: "**" },
      { open: "*", close: "*" },
      { open: "_", close: "_" },
      { open: "~~", close: "~~" },
      { open: "<", close: ">" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
      { open: "**", close: "**" },
      { open: "*", close: "*" },
      { open: "_", close: "_" },
      { open: "~~", close: "~~" },
    ],
    indentationRules: {
      increaseIndentPattern: /^(\s*)([-*+]|\d+\.)\s+/,
      decreaseIndentPattern: /^(\s*)([-*+]|\d+\.)\s+/,
    },
    folding: {
      markers: {
        start: /^\s*\/\/\s*@\w+-begin\s*$/,
        end: /^\s*\/\/\s*@\w+-end\s*$/,
      },
    },
  });

  // Define completion provider for template-specific snippets
  // Note: TypeScript definitions in templates.d.ts provide additional auto-completion
  monaco.languages.registerCompletionItemProvider("template-markdown", {
    triggerCharacters: ["@", "$", "{", "/", " "],
    provideCompletionItems: async (model: any, position: any) => {
      // Check if we're inside a JavaScript expression or block by analyzing the context
      const isInsideJavaScript = () => {
        const lineNumber = position.lineNumber;
        const column = position.column;

        // Get all lines up to current position to determine context
        const lines = model.getLinesContent();
        let isInJsBlock = false;
        let isInJsExpr = false;
        let jsExprDepth = 0;

        // Analyze each line up to current position
        for (let i = 0; i < lineNumber; i++) {
          const line = lines[i];
          let pos = 0;

          // If we're on the current line, only process up to the cursor position
          const lineEndPos = i === lineNumber - 1 ? column - 1 : line.length;

          while (pos < lineEndPos) {
            // Check for JavaScript blocks ${{...}}$
            if (line.substr(pos, 3) === "${{" && !isInJsExpr) {
              const endPos = line.indexOf("}}$", pos + 3);
              if (endPos !== -1 && endPos < lineEndPos) {
                // Single-line block, skip it
                pos = endPos + 3;
              } else {
                // Multi-line block starts
                isInJsBlock = true;
                pos += 3;
              }
              continue;
            }

            // Check for end of JavaScript block
            if (isInJsBlock && line.substr(pos, 3) === "}}$") {
              isInJsBlock = false;
              pos += 3;
              continue;
            }

            // Check for JavaScript expressions ${...}
            if (
              line.substr(pos, 2) === "${" &&
              line.substr(pos, 3) !== "${{" &&
              !isInJsBlock
            ) {
              let depth = 1;
              let exprPos = pos + 2;
              let foundEnd = false;

              while (exprPos < lineEndPos && depth > 0) {
                if (line[exprPos] === "{") depth++;
                else if (line[exprPos] === "}") depth--;
                exprPos++;
                if (depth === 0) {
                  foundEnd = true;
                  break;
                }
              }

              if (foundEnd) {
                // Single-line expression, skip it
                pos = exprPos;
              } else {
                // Multi-line expression starts
                isInJsExpr = true;
                jsExprDepth = depth;
                pos = exprPos;
              }
              continue;
            }

            // If in multi-line expression, track brace depth
            if (isInJsExpr) {
              if (line[pos] === "{") jsExprDepth++;
              else if (line[pos] === "}") {
                jsExprDepth--;
                if (jsExprDepth === 0) {
                  isInJsExpr = false;
                }
              }
            }

            pos++;
          }
        }

        return isInJsBlock || isInJsExpr;
      };

      if (isInsideJavaScript()) {
        // We're inside JavaScript/TypeScript code, delegate to built-in JS completion
        try {
          // Get JavaScript/TypeScript completions using the language service
          const jsCompletions = await monaco.languages.typescript
            .getJavaScriptWorker()
            .then((worker: any) => worker(model.uri))
            .then((client: any) => {
              return client.getCompletionsAtPosition(
                model.uri.toString(),
                model.getOffsetAt(position),
              );
            });

          if (jsCompletions && jsCompletions.entries) {
            const suggestions = jsCompletions.entries.map((entry: any) => ({
              label: entry.name,
              kind:
                monaco.languages.CompletionItemKind[entry.kind] ||
                monaco.languages.CompletionItemKind.Text,
              insertText: entry.name,
              documentation: entry.documentation
                ? entry.documentation.displayParts
                    ?.map((p: any) => p.text)
                    .join("")
                : "",
              detail: entry.kindModifiers || "JavaScript",
            }));

            return { suggestions };
          }

          // Fallback to empty suggestions if no completions found
          return { suggestions: [] };
        } catch (error) {
          ztoolkit.log("Error getting JavaScript completions:", error);
          // Fallback to empty suggestions if JS completion fails
          return { suggestions: [] };
        }
      } else {
        // We're in template/markdown context
        // Template-specific suggestions that can be triggered by typing
        const templateSuggestions = [
          // Template directives
          {
            label: "@use-markdown",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @use-markdown",
            documentation: "Enable markdown processing for this template",
            detail: "Template Directive",
          },
          {
            label: "@use-refresh",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @use-refresh",
            documentation: "Enable auto-refresh for this template",
            detail: "Template Directive",
          },
          {
            label: "@beforeloop-begin",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @beforeloop-begin",
            documentation:
              "Marks the beginning of code that executes before processing items",
            detail: "Template Directive",
          },
          {
            label: "@beforeloop-end",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @beforeloop-end",
            documentation:
              "Marks the end of code that executes before processing items",
            detail: "Template Directive",
          },
          {
            label: "@default-begin",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @default-begin",
            documentation:
              "Marks the beginning of the default template content for each item",
            detail: "Template Directive",
          },
          {
            label: "@default-end",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @default-end",
            documentation:
              "Marks the end of the default template content for each item",
            detail: "Template Directive",
          },
          {
            label: "@afterloop-begin",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @afterloop-begin",
            documentation:
              "Marks the beginning of code that executes after processing all items",
            detail: "Template Directive",
          },
          {
            label: "@afterloop-end",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @afterloop-end",
            documentation:
              "Marks the end of code that executes after processing all items",
            detail: "Template Directive",
          },

          // Common field expressions
          {
            label: "title",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '${topItem.getField("title")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get the title field from the top item",
            detail: "Template Field",
          },
          {
            label: "authors",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              '${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get authors from the top item",
            detail: "Template Field",
          },
          {
            label: "doi",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '${topItem.getField("DOI")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get the DOI field from the top item",
            detail: "Template Field",
          },
          {
            label: "url",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '${topItem.getField("url")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get the URL field from the top item",
            detail: "Template Field",
          },
          {
            label: "date",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '${topItem.getField("date")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get the date field from the top item",
            detail: "Template Field",
          },
          {
            label: "abstract",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '${topItem.getField("abstractNote")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get the abstract from the top item",
            detail: "Template Field",
          },
          {
            label: "tags",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '${topItem.getTags().map(t => t.tag).join(", ")}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Get tags from the top item",
            detail: "Template Field",
          },

          // Template expressions
          {
            label: "expression",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "${$0}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "JavaScript expression",
            detail: "Template Expression",
          },
          {
            label: "block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "${{\n\t$0\n}}$",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "JavaScript block",
            detail: "Template Block",
          },

          // Template sections
          {
            label: "beforeloop",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @beforeloop-begin\n$0\n// @beforeloop-end",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Code to execute before the item loop",
            detail: "Template Section",
          },
          {
            label: "defaultloop",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @default-begin\n$0\n// @default-end",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Default template content for each item",
            detail: "Template Section",
          },
          {
            label: "afterloop",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "// @afterloop-begin\n$0\n// @afterloop-end",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Code to execute after the item loop",
            detail: "Template Section",
          },
        ];

        // Filter suggestions based on current input
        const line = model.getLineContent(position.lineNumber);
        const lineUpToPosition = line.substring(0, position.column - 1);

        // Debug logging
        ztoolkit.log("Completion triggered at:", {
          line,
          lineUpToPosition,
          position,
        });

        // Simple approach - always return all suggestions and let Monaco filter them
        ztoolkit.log("Returning", templateSuggestions.length, "suggestions");
        return { suggestions: templateSuggestions };
      }

      return { suggestions: [] };
    },
  });

  // Add hover provider for template variables
  monaco.languages.registerHoverProvider("template-markdown", {
    provideHover: (model: any, position: any) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const hoverInfo: { [key: string]: string } = {
        topItem: "The main Zotero item being processed in the template",
        item: "Current item in the loop iteration",
        items: "Array of all items being processed",
        noteItem: "The current note item",
        targetNoteItem: "The target note item for the operation",
        sharedObj: "Shared object for passing data between template sections",
        link: "Link information for quick operations",
        linkText: "Text content of the link",
        copyNoteImage: "Function to copy images from notes",
        _env: "Template environment object containing execution context",
        dryRun: "Boolean flag indicating if this is a dry run execution",
      };

      // Check for template directives
      const line = model.getLineContent(position.lineNumber);
      const directiveMatch = line.match(/\/\/\s*@([\w-]+)/);
      if (directiveMatch) {
        const directive = directiveMatch[1];
        const directiveInfo: { [key: string]: string } = {
          "use-markdown":
            "Enables markdown processing for this template. Required for markdown syntax highlighting and rendering.",
          "use-refresh":
            "Enables automatic template refresh when data changes.",
          "beforeloop-begin":
            "Marks the beginning of code that executes before processing items.",
          "beforeloop-end":
            "Marks the end of code that executes before processing items.",
          "default-begin":
            "Marks the beginning of the default template content for each item.",
          "default-end":
            "Marks the end of the default template content for each item.",
          "afterloop-begin":
            "Marks the beginning of code that executes after processing all items.",
          "afterloop-end":
            "Marks the end of code that executes after processing all items.",
        };

        if (directiveInfo[directive]) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              1,
              position.lineNumber,
              line.length + 1,
            ),
            contents: [
              { value: `**@${directive}**` },
              { value: directiveInfo[directive] },
            ],
          };
        }
      }

      if (hoverInfo[word.word]) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [
            { value: `**${word.word}**` },
            { value: hoverInfo[word.word] },
          ],
        };
      }

      return null;
    },
  });

  // Define custom theme colors for better syntax highlighting
  monaco.editor.defineTheme("template-light", {
    base: "vs",
    inherit: true,
    rules: [
      {
        token: "delimiter.js-expression.template",
        foreground: "0066cc",
        fontStyle: "bold",
      },
      {
        token: "delimiter.js-block.template",
        foreground: "0066cc",
        fontStyle: "bold",
      },
      {
        token: "source.js.embedded.template",
        foreground: "7f0055",
        fontStyle: "bold",
      },
      {
        token: "comment.directive.template",
        foreground: "008000",
        fontStyle: "bold",
      },
      { token: "comment.line.template", foreground: "008000" },
      {
        token: "markup.heading.template",
        foreground: "800000",
        fontStyle: "bold",
      },
      { token: "markup.bold.template", fontStyle: "bold" },
      { token: "markup.italic.template", fontStyle: "italic" },
      {
        token: "markup.inline.raw.template",
        background: "f8f8f8",
        foreground: "333333",
      },
      {
        token: "markup.underline.link.template",
        foreground: "0066cc",
        fontStyle: "underline",
      },
      { token: "tag.template", foreground: "800080" },
      { token: "text.template", foreground: "000000" },
      // JavaScript tokens embedded in template
      {
        token: "keyword.embedded.template",
        foreground: "0000ff",
        fontStyle: "bold",
      },
      { token: "string.embedded.template", foreground: "a31515" },
      { token: "number.embedded.template", foreground: "098658" },
      { token: "comment.embedded.template", foreground: "008000" },
      { token: "identifier.embedded.template", foreground: "001080" },
      { token: "operator.embedded.template", foreground: "000000" },
      { token: "delimiter.bracket.embedded.template", foreground: "000000" },
    ],
    colors: {},
  });

  monaco.editor.defineTheme("template-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: "delimiter.js-expression.template",
        foreground: "4fc3f7",
        fontStyle: "bold",
      },
      {
        token: "delimiter.js-block.template",
        foreground: "4fc3f7",
        fontStyle: "bold",
      },
      {
        token: "source.js.embedded.template",
        foreground: "dcdcaa",
        fontStyle: "bold",
      },
      {
        token: "comment.directive.template",
        foreground: "66bb6a",
        fontStyle: "bold",
      },
      { token: "comment.line.template", foreground: "6a9955" },
      {
        token: "markup.heading.template",
        foreground: "ff8a65",
        fontStyle: "bold",
      },
      { token: "markup.bold.template", fontStyle: "bold" },
      { token: "markup.italic.template", fontStyle: "italic" },
      {
        token: "markup.inline.raw.template",
        background: "2d2d2d",
        foreground: "e0e0e0",
      },
      {
        token: "markup.underline.link.template",
        foreground: "4fc3f7",
        fontStyle: "underline",
      },
      { token: "tag.template", foreground: "ce93d8" },
      { token: "text.template", foreground: "cccccc" },
      // JavaScript tokens embedded in template
      {
        token: "keyword.embedded.template",
        foreground: "569cd6",
        fontStyle: "bold",
      },
      { token: "string.embedded.template", foreground: "ce9178" },
      { token: "number.embedded.template", foreground: "b5cea8" },
      { token: "comment.embedded.template", foreground: "6a9955" },
      { token: "identifier.embedded.template", foreground: "9cdcfe" },
      { token: "operator.embedded.template", foreground: "d4d4d4" },
      { token: "delimiter.bracket.embedded.template", foreground: "ffd700" },
    ],
    colors: {},
  });
}

/**
 * Initialize Monaco editor with template language support
 * @param monaco Monaco editor instance
 * @param editor Editor instance
 * @param isDark Whether to use dark theme
 */
export function initializeTemplateEditor(
  monaco: any,
  editor: any,
  isDark: boolean,
) {
  try {
    registerTemplateLanguage(monaco);

    // Set the model language to our custom template language
    monaco.editor.setModelLanguage(editor.getModel(), "template-markdown");

    // Apply the custom theme
    const customTheme = isDark ? "template-dark" : "template-light";
    monaco.editor.setTheme(customTheme);

    ztoolkit.log("Template language registered successfully");
    return true;
  } catch (error) {
    ztoolkit.log(
      "Failed to register template language, falling back to default:",
      error,
    );
    return false;
  }
}
