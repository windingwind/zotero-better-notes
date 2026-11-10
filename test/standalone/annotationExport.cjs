// Run: node test/standalone/annotationExport.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { DOMParser } = require("linkedom");
const source = fs.readFileSync(
  path.join(__dirname, "../../src/modules/annotationExport.ts"),
  "utf8",
);
let handler,
  includeComment = false,
  clipboard,
  errorMessage,
  libraryType = "user";
const parent = { key: "S2RV4J9W" };
const attachment = {
  key: "P7NKRSPH",
  parentItem: parent,
  libraryID: 1,
  attachmentContentType: "application/pdf",
};
const annotation = {
  key: "ST4X26PR",
  parentItem: attachment,
  annotationType: "highlight",
  annotationText: "Generative Electrolyte Solvent and Formulation Discovery",
  annotationPosition: '{"pageIndex":0}',
  annotationPageLabel: "2288",
  annotationComment: "测试注释 [文本]\n第二行 <b>重点</b>",
  isAnnotation: () => true,
};
const strings = { "annotationExport-comment": "注释：" };
const deps = {
  "../../package.json": { config: { addonID: "test" } },
  "../utils/locale": { getString: (key) => strings[key] || key },
  "../utils/prefs": {
    getPref: () => includeComment,
    setPref: (_, v) => {
      includeComment = v;
    },
  },
};
const context = {
  exports: {},
  DOMParser,
  require: (name) => {
    assert.ok(deps[name], name);
    return deps[name];
  },
  Zotero: {
    Reader: {
      registerEventListener: (type, fn) => {
        assert.equal(type, "createAnnotationContextMenu");
        handler = fn;
      },
      unregisterEventListener: (type, fn) => {
        assert.equal(fn, handler);
        handler = null;
      },
    },
    Items: {
      getByLibraryAndKey: (_, key) =>
        key === annotation.key ? annotation : false,
    },
    Libraries: { get: () => ({ libraryType }) },
    Groups: { getGroupIDFromLibraryID: () => 42 },
    URI: { getItemURI: () => "http://zotero.org/users/1/items/S2RV4J9W" },
    Utilities: {
      Item: {
        itemToCSLJSON: (item) => {
          assert.equal(item, parent);
          return { title: "Paper" };
        },
      },
    },
    EditorInstanceUtilities: {
      formatCitation: (value) => {
        assert.equal(value.citationItems[0].locator, "2288");
        return '(<span class="citation-item">Kim 等, 2026, p. 2288</span>)';
      },
      _transformTextToHTML: (text) =>
        text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/&lt;(\/?(?:b|i|sub|sup))&gt;/g, "<$1>")
          .replace(/\n/g, "<br>"),
    },
    logError: () => {},
  },
  ztoolkit: {
    Clipboard: class {
      data = {};
      addText(text, type) {
        this.data[type] = text;
        return this;
      }
      copy() {
        clipboard = this.data;
      }
    },
  },
};
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  context,
);
const {
  formatAnnotationExport: format,
  registerAnnotationExportMenu: register,
  unregisterAnnotationExportMenu: unregister,
} = context.exports;
const expected =
  "“Generative Electrolyte Solvent and Formulation Discovery” ([Kim 等, 2026, p. 2288](zotero://select/library/items/S2RV4J9W)) ([pdf](zotero://open-pdf/library/items/P7NKRSPH?page=1&annotation=ST4X26PR))";
assert.equal(format(annotation, false).text, expected);
assert.equal(
  format(annotation, true).text,
  expected + "\n\n注释：测试注释 \\[文本\\]\n第二行 重点",
);
const doc = new DOMParser().parseFromString(
  format(annotation, true).html,
  "text/html",
);
assert.equal(doc.querySelectorAll("a").length, 2);
assert.equal(
  doc.querySelectorAll("p")[1].textContent,
  "注释：测试注释 [文本]\n第二行 重点",
);
assert.equal(
  doc.querySelector("a").getAttribute("href"),
  "zotero://select/library/items/S2RV4J9W",
);
assert.equal(
  format({ ...annotation, annotationComment: "  " }, true).text,
  expected,
);
const escaped = format(
  { ...annotation, annotationText: "[a]*b* <script>x</script> & <b>bold</b>" },
  false,
);
assert.ok(escaped.text.includes("\\[a\\]\\*b\\* \\<script\\>"));
assert.ok(!escaped.html.includes("<script>"));
libraryType = "group";
assert.ok(
  format(annotation, false).text.includes("zotero://open-pdf/groups/42/items/"),
);
assert.ok(
  format(annotation, false).text.includes("zotero://select/groups/42/items/"),
);
libraryType = "user";
assert.ok(
  !format(
    { ...annotation, parentItem: { ...attachment, parentItem: null } },
    false,
  ).text.includes("select/"),
);
for (const position of ["{}", '{"pageIndex":-1}', '{"pageIndex":1.5}', "bad"]) {
  assert.throws(() =>
    format({ ...annotation, annotationPosition: position }, false),
  );
}
register();
function menu(ids = [annotation.key]) {
  const items = [];
  handler({
    reader: {
      _item: attachment,
      _internalReader: {
        setErrorMessage: (value) => {
          errorMessage = value;
        },
      },
    },
    params: { ids },
    append: (...group) => items.push(...group),
  });
  return items;
}
assert.equal(menu().length, 2);
assert.equal(menu()[1].checked, false);
menu()[0].onCommand();
assert.equal(clipboard["text/plain"], expected);
menu()[1].onCommand();
assert.equal(menu()[1].checked, true);
menu()[0].onCommand();
assert.ok(clipboard["text/plain"].includes("注释："));
assert.ok(clipboard["text/html"].includes("注释："));
annotation.annotationType = "underline";
assert.equal(menu().length, 2);
annotation.annotationType = "image";
assert.equal(menu().length, 0);
annotation.annotationType = "highlight";
assert.equal(menu([]).length, 0);
assert.equal(menu(["missing"]).length, 0);
assert.equal(menu([annotation.key, "missing"]).length, 0);
menu([annotation.key, annotation.key])[0].onCommand();
assert.equal(clipboard["text/plain"].split("zotero://open-pdf").length, 3);
attachment.attachmentContentType = "application/epub+zip";
assert.equal(menu().length, 0);
attachment.attachmentContentType = "application/pdf";
const previous = clipboard;
annotation.annotationPosition = "{}";
menu()[0].onCommand();
assert.equal(clipboard, previous);
assert.equal(errorMessage, "annotationExport-failed");
unregister();
assert.equal(handler, null);
console.log(
  "PASS: annotation export text/HTML, comments, page links, groups, escaping, menu, preferences, errors and cleanup",
);

// Reader-owned arrays must not receive privileged Zotero.Item objects via map.
register();
annotation.annotationPosition = '{"pageIndex":0}';
const readerIDs = [annotation.key];
readerIDs.map = () => {
  throw new Error("Permission denied to pass object to privileged code");
};
assert.equal(menu(readerIDs).length, 2);
unregister();
console.log(
  "PASS: reader-owned ID array is copied before accessing Zotero items",
);
