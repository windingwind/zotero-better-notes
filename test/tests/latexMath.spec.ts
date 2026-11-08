import { wait } from "zotero-plugin-toolkit";
import {
  findLatexMath,
  normalizeLatexMath,
  convertLatexHTML,
} from "../../src/extras/shared/latexMath";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";

const raw = String.raw;

describe("LaTeX math conversion", function () {
  const addon = getAddon();

  it("converts slash delimiters before Markdown consumes their escapes", async function () {
    const html = await addon.api.convert.md2html(
      raw`前文 \(x^2\) 中间 \[\boxed{\frac{a}{b}}\] 后文`,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    assert.equal(doc.querySelector("span.math")?.textContent, "$x^2$");
    assert.equal(
      doc.querySelector("pre.math")?.textContent,
      raw`$$\boxed{\frac{a}{b}}$$`,
    );
    assert.include(doc.body.textContent!, "前文");
    assert.include(doc.body.textContent!, "后文");
  });

  it("normalizes display environments, labels and alignment", async function () {
    for (const name of [
      "equation",
      "equation*",
      "align",
      "align*",
      "gather",
      "gather*",
      "displaymath",
    ]) {
      const source = `\\begin{${name}}a=b\\label{eq:test}\\nonumber\\end{${name}}`;
      const [math] = findLatexMath(source);
      assert.isTrue(math.display);
      assert.notInclude(math.tex, "label");
      assert.notInclude(math.tex, "nonumber");
      if (name.startsWith("align"))
        assert.include(math.tex, raw`\begin{aligned}`);
      if (name.startsWith("gather"))
        assert.include(math.tex, raw`\begin{gathered}`);
      const html = await addon.api.convert.md2html(source);
      assert.include(html, 'class="math"', name);
    }
  });

  it("leaves code, existing dollar math, URLs and incomplete input unchanged", function () {
    for (const source of [
      raw`\(unfinished`,
      raw`\\[escaped\\]`,
      "`" + raw`\(code\)` + "`",
      "```latex\n" + raw`\[code\]` + "\n```",
      "~~~tex\n" + raw`\[code\]` + "\n~~~",
      "```\n" + raw`\[code\]`,
      "    " + raw`\(code\)`,
      "<pre>" + raw`\[code\]` + "</pre>",
      raw`$\text{\(literal\)}$`,
      raw`[link](https://example.org/\(path\))`,
    ])
      assert.equal(normalizeLatexMath(source), source);
  });

  it("recognizes indented formulas and TeX quotes in pasted document source", async function () {
    const source =
      "\\documentclass{article}\n\\begin{document}\n``first''\n\n\\[a\\]\n\n``second''\n\n    \\[b\\]\n\n\\end{document}";
    assert.lengthOf(findLatexMath(source), 2);
    const html = await addon.api.convert.md2html(source);
    const doc = new DOMParser().parseFromString(html, "text/html");
    assert.lengthOf(doc.querySelectorAll("pre.math"), 2);
  });

  it("changes only prose text in rich HTML", function () {
    const source = raw`<p><b>Title</b> \(x&lt;y\)</p><pre>\[code\]</pre><a href="https://example.org/">\(link\)</a><span data-citation="{}">\(citation\)</span>`;
    const html = convertLatexHTML(source, new DOMParser());
    const doc = new DOMParser().parseFromString(html, "text/html");
    assert.lengthOf(doc.querySelectorAll(".math"), 1);
    assert.equal(doc.querySelector(".math")?.textContent, "$x<y$");
    assert.equal(doc.querySelector("b")?.textContent, "Title");
    assert.equal(doc.querySelector("pre")?.textContent, raw`\[code\]`);
    assert.equal(doc.querySelector("a")?.textContent, raw`\(link\)`);
    assert.equal(
      doc.querySelector("[data-citation]")?.textContent,
      raw`\(citation\)`,
    );
  });
});

describe("LaTeX math editor input", function () {
  this.timeout(30000);
  const addon = getAddon();
  let note: Zotero.Item;
  let editor: Zotero.EditorInstance;
  let win: any;
  let view: any;

  this.beforeEach(async function () {
    await resetAll();
    note = new Zotero.Item("note");
    note.setNote("<p>LaTeX input test</p>");
    await note.saveTx();
    await Zotero.getActiveZoteroPane().selectItem(note.id);
    await wait.waitUtilAsync(
      () => !!addon.api.editor.getEditorInstance(note.id),
    );
    editor = addon.api.editor.getEditorInstance(note.id)!;
    await editor._initPromise;
    win = (editor._iframeWindow as any).wrappedJSObject;
    view = win._currentEditorInstance._editorCore.view;
    await wait.waitUtilAsync(() =>
      view.state.plugins.some((p: any) => p.spec.betterNotes === "latexInput"),
    );
  });

  this.afterEach(async function () {
    await resetAll();
  });

  function setContent(html: string) {
    const node = win.BetterNotesEditorAPI.getNodeFromHTML(view.state, html);
    const tr = view.state.tr.replaceWith(
      0,
      view.state.doc.content.size,
      node.content,
    );
    tr.setSelection(
      view.state.selection.constructor.near(
        tr.doc.resolve(tr.doc.content.size - 1),
      ),
    );
    view.dispatch(tr);
  }

  function mathCount() {
    let count = 0;
    view.state.doc.descendants((n: any) => {
      if (n.type.name === "math_inline" || n.type.name === "math_display")
        count++;
    });
    return count;
  }

  async function paste(text: string, html = "") {
    setContent("<p></p>");
    const event = Components.utils.cloneInto(
      {
        clipboardData: {
          types: html ? ["text/plain", "text/html"] : ["text/plain"],
          files: [],
          getData: (type: string) =>
            type === "text/plain" ? text : type === "text/html" ? html : "",
        },
        preventDefault() {},
        shiftKey: false,
      },
      win,
      { cloneFunctions: true },
    );
    const slice = win.BetterNotesEditorAPI.getSliceFromHTML(
      view.state,
      "<p></p>",
    );
    // Exercise the actual plugin order, including Zotero's Markdown handler.
    assert.isTrue(
      !!view.someProp("handlePaste", (fn: any) => fn(view, event, slice)),
    );
    await wait.waitUtilAsync(() => mathCount() > 0);
    view.dispatch(
      view.state.tr.setSelection(
        view.state.selection.constructor.near(view.state.doc.resolve(0)),
      ),
    );
    await wait.waitUtilAsync(
      () => win.document.querySelectorAll(".katex").length === mathCount(),
    );
    assert.notExists(win.document.querySelector(".katex-error"));
  }

  it("pastes a standalone display as a rendered math node, not plain text", async function () {
    await paste(raw`\[\boxed{\frac{a}{b}}\]`);
    assert.equal(mathCount(), 1);
    editor.saveSync();
    await wait.waitUtilAsync(() => note.getNote().includes('class="math"'));
    assert.include(note.getNote(), raw`\boxed{\frac{a}{b}}`);
  });

  it("pastes mixed prose and multiple formulas through the full handler chain", async function () {
    await paste(
      raw`Before \(x^2\) between \[y=1\] after \begin{align}a&=b\\c&=d\end{align}`,
    );
    assert.equal(mathCount(), 3);
    assert.include(view.state.doc.textContent, "Before");
    assert.include(view.state.doc.textContent, "after");
  });

  it("pastes HTML math without losing surrounding rich text", async function () {
    await paste("", raw`<p><b>Title</b> \[x^2\] after</p>`);
    assert.equal(mathCount(), 1);
    assert.include(view.state.doc.textContent, "Title");
    assert.include(view.state.doc.textContent, "after");
    assert.exists(win.document.querySelector("strong,b"));
  });

  it("converts typed inline, display and multiline environment closing keys", async function () {
    for (const [html, closing] of [
      [raw`<p>Before \(x^2\</p>`, ")"],
      [raw`<p>\[x^2\</p>`, "]"],
      [
        raw`<p>\begin{align}</p><p>a &amp;= b \\</p><p>c &amp;= d</p><p>\end{align</p>`,
        "}",
      ],
      [raw`<ul><li><p>\[x^2\</p></li></ul>`, "]"],
    ]) {
      setContent(html);
      const pos = view.state.selection.from;
      assert.isTrue(
        !!view.someProp("handleTextInput", (fn: any) =>
          fn(view, pos, pos, closing),
        ),
      );
      assert.equal(mathCount(), 1);
      assert.equal(view.state.selection.$from.parent.type.name, "paragraph");
      await wait.waitUtilAsync(() => !!win.document.querySelector(".katex"));
      assert.notExists(win.document.querySelector(".katex-error"));
    }
  });

  it("does not convert typing in code or incomplete and escaped formulas", function () {
    for (const html of [
      raw`<pre>\[x^2\</pre>`,
      raw`<p><code>\[x^2\</code></p>`,
      raw`<p>\[unfinished</p>`,
      raw`<p>\\[escaped\\</p>`,
    ]) {
      setContent(html);
      const pos = view.state.selection.from;
      view.someProp("handleTextInput", (fn: any) => fn(view, pos, pos, "]"));
      assert.equal(mathCount(), 0);
    }
  });
});
