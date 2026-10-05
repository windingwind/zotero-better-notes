/** LaTeX math boundaries accepted in addition to Markdown's dollar delimiters. */
export interface LatexMath {
  from: number;
  to: number;
  tex: string;
  display: boolean;
}

function escaped(text: string, at: number) {
  let slashes = 0;
  while (at > 0 && text[--at] === "\\") slashes++;
  return slashes % 2 === 1;
}

/** Keep code, existing dollar math and HTML tags literal. Unclosed math stays text. */
export function findLatexMath(text: string): LatexMath[] {
  const matches: LatexMath[] = [];
  // In a pasted TeX document, indentation and ``quotes'' are prose, not
  // Markdown code. Keep Markdown's protections for ordinary note snippets.
  const texDocument =
    /^\s*\\(?:documentclass(?:\[[^\]]*\])?\{|begin\{document\})/.test(text);
  let i = 0;
  while (i < text.length) {
    if (escaped(text, i)) {
      i++;
      continue;
    }
    // Fenced code (including an unfinished fence) and inline code spans.
    if (!texDocument && (text[i] === "`" || text[i] === "~")) {
      const run = text.slice(i).match(/^(`+|~+)/)![0];
      const lineStart = text.lastIndexOf("\n", i - 1) + 1;
      const isFence =
        run.length >= 3 && /^ {0,3}$/.test(text.slice(lineStart, i));
      if (isFence) {
        const rest = text.indexOf("\n", i + run.length);
        const closing = new RegExp(
          "^ {0,3}" + run[0] + "{" + run.length + ",}[ \\t]*$",
          "m",
        );
        const end = rest < 0 ? null : closing.exec(text.slice(rest + 1));
        i = end ? rest + 1 + end.index + end[0].length : text.length;
        continue;
      }
      if (run[0] === "`") {
        let end = i + run.length;
        while ((end = text.indexOf(run, end)) !== -1) {
          if (text[end - 1] !== "`" && text[end + run.length] !== "`") break;
          end += run.length;
        }
        if (end !== -1) {
          i = end + run.length;
          continue;
        }
      }
      i += run.length;
      continue;
    }
    // Indented Markdown code.
    if (
      !texDocument &&
      (i === 0 || text[i - 1] === "\n") &&
      /^( {4}|\t)/.test(text.slice(i))
    ) {
      const end = text.indexOf("\n", i);
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    if (text[i] === "<") {
      const tag = text.slice(i).match(/^<!--[\s\S]*?-->|^<\/?[A-Za-z][^>]*>/);
      if (tag) {
        const literal = tag[0].match(/^<(pre|code|script|style|textarea)\b/i);
        if (literal) {
          const close = new RegExp(`</${literal[1]}\\s*>`, "i").exec(
            text.slice(i + tag[0].length),
          );
          i = close
            ? i + tag[0].length + close.index + close[0].length
            : text.length;
          continue;
        }
        i += tag[0].length;
        continue;
      }
    }
    // Do not interpret LaTeX boundaries within an existing dollar formula.
    if (text[i] === "$") {
      const boundary = text[i + 1] === "$" ? "$$" : "$";
      let end = i + boundary.length;
      while ((end = text.indexOf(boundary, end)) !== -1 && escaped(text, end))
        end++;
      if (end !== -1) {
        i = end + boundary.length;
        continue;
      }
    }
    // Markdown link destinations are not prose.
    if (text.startsWith("](", i)) {
      let depth = 1,
        end = i + 2;
      for (; end < text.length && depth; end++) {
        if (escaped(text, end)) continue;
        if (text[end] === "(") depth++;
        if (text[end] === ")") depth--;
      }
      if (!depth) {
        i = end;
        continue;
      }
    }
    const opener = text.slice(i, i + 2);
    const environment = text
      .slice(i)
      .match(/^\\begin\{(equation\*?|align\*?|gather\*?|displaymath)\}/);
    if (opener !== "\\(" && opener !== "\\[" && !environment) {
      i++;
      continue;
    }
    const display = opener === "\\[" || !!environment;
    const openingLength = environment ? environment[0].length : 2;
    const closer = environment
      ? `\\end{${environment[1]}}`
      : display
        ? "\\]"
        : "\\)";
    let end = i + openingLength;
    while ((end = text.indexOf(closer, end)) !== -1 && escaped(text, end))
      end += 2;
    if (end < 0) {
      i += openingLength;
      continue;
    }
    let tex = text.slice(i + openingLength, end).trim();
    if (environment && tex) {
      // KaTeX has no document-wide label/number registry. Preserve the math,
      // using its nested alignment environments instead of LaTeX display ones.
      tex = tex
        .replace(/\\label\{[^{}]*\}/g, "")
        .replace(/\\(?:nonumber|notag)\b/g, "")
        .trim();
      const name = environment[1].replace(/\*$/, "");
      if (name === "align" || name === "gather") {
        const inner = name === "align" ? "aligned" : "gathered";
        tex = `\\begin{${inner}}\n${tex}\n\\end{${inner}}`;
      }
    }
    if (tex && !tex.includes("\ufffc"))
      matches.push({ from: i, to: end + closer.length, tex, display });
    i = end + closer.length;
  }
  return matches;
}

/** Run before remark consumes backslash escapes. Display boundaries need newlines. */
export function normalizeLatexMath(text: string): string {
  const matches = findLatexMath(text);
  for (const math of matches.reverse()) {
    const value = math.display
      ? `\n\n$$\n${math.tex}\n$$\n\n`
      : `$${math.tex}$`;
    text = text.slice(0, math.from) + value + text.slice(math.to);
  }
  return text;
}

/** Rich clipboard content must be changed as DOM text, never by replacing HTML. */
export function convertLatexHTML(html: string, parser: DOMParser): string {
  const doc = parser.parseFromString(html, "text/html");
  const walk = (parent: Node) => {
    for (const node of Array.from(parent.childNodes)) {
      if (!node) continue;
      if (node.nodeType === 1) {
        const el = node as Element;
        if (
          el.matches(
            "pre, code, kbd, samp, script, style, a, .math, .katex, [data-annotation], [data-citation]",
          )
        )
          continue;
        walk(node);
      } else if (node.nodeType === 3) {
        const text = node.textContent || "";
        const matches = findLatexMath(text);
        if (!matches.length) continue;
        const fragment = doc.createDocumentFragment();
        let from = 0;
        for (const math of matches) {
          fragment.appendChild(doc.createTextNode(text.slice(from, math.from)));
          const formula = doc.createElement(math.display ? "pre" : "span");
          formula.className = "math";
          const delimiter = math.display ? "$$" : "$";
          formula.textContent = delimiter + math.tex + delimiter;
          fragment.appendChild(formula);
          from = math.to;
        }
        fragment.appendChild(doc.createTextNode(text.slice(from)));
        parent.replaceChild(fragment, node);
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
