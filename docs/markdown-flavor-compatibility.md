# Markdown Flavor Compatibility (Obsidian & friends)

Better Notes syncs your Zotero note with a standard **Markdown** file. If you
edit that file in another app (Obsidian, Logseq, Typora, …), you may use
_extended_ Markdown syntax that is not part of standard Markdown — wiki links
`[[...]]`, embeds `![[...]]`, callouts `> [!note]`, highlights `==...==`, image
resize `| 500`, task lists `- [ ]`, tags `#tag`, and so on.

This page explains **why some of those get changed on sync**, exactly **which
ones survive**, and gives you **copy‑paste templates** to keep the flavors you
care about.

> Related reports: [#1597](https://github.com/windingwind/zotero-better-notes/issues/1597),
> [#1574](https://github.com/windingwind/zotero-better-notes/issues/1574),
> [#1563](https://github.com/windingwind/zotero-better-notes/issues/1563),
> [#1406](https://github.com/windingwind/zotero-better-notes/issues/1406),
> [#1345](https://github.com/windingwind/zotero-better-notes/issues/1345),
> [#1337](https://github.com/windingwind/zotero-better-notes/issues/1337),
> [#1336](https://github.com/windingwind/zotero-better-notes/issues/1336),
> [#497](https://github.com/windingwind/zotero-better-notes/issues/497).

## Why does my syntax get a `\` in front of it?

Zotero stores every note as **HTML**, not Markdown. When Better Notes writes the
`.md` file it converts that HTML to Markdown with a standard, spec‑compliant
Markdown processor ([`remark`](https://github.com/remarkjs/remark)).

A spec‑compliant processor is required to **escape** any text that would
otherwise be mistaken for Markdown syntax, so that the file round‑trips without
changing meaning. Extended syntaxes are not part of the spec, so from the
processor's point of view `[[Page]]` is "a literal `[` followed by `[Page]`",
and it protects it by writing `\[\[Page]]`.

The key consequences:

- **Better Notes' own formatting is always safe.** Bold, italics, links you
  create in the editor, citations, images, math, tables, highlights, colors —
  all of these are real elements in the note and convert cleanly, both ways.
- **Only extended syntax that you type as plain text** in the external file is
  affected, because Zotero has no matching element for it — it is stored as
  literal characters and therefore escaped on the way out.

This is by design and will not change globally (see
[#1337](https://github.com/windingwind/zotero-better-notes/issues/1337)).
Instead, Better Notes gives you a hook to post‑process the exported Markdown:
the **`[ExportMDFileContent]`** template. The rest of this page shows how to use
it.

## What survives and what doesn't

Tested against the current converter. "Survives" means the exact characters are
written to the `.md` file unchanged.

| Flavor                   | Example                     | Sync out (note → md)          | Fix needed                                                         |
| ------------------------ | --------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| Highlight                | `==text==`                  | ✅ survives                   | none                                                               |
| Tag                      | `#tag`, `#a/b`              | ✅ survives                   | none                                                               |
| Obsidian comment         | `%%text%%`                  | ✅ survives                   | none                                                               |
| Image resize suffix      | `... \| 500`                | ✅ survives                   | none                                                               |
| Inline / block math      | `$x$`, `$$x$$`              | ✅ survives                   | none                                                               |
| **Wiki link**            | `[[Page]]`                  | ❌ becomes `\[\[Page]]`       | template below                                                     |
| **Embed**                | `![[image.png]]`            | ❌ becomes `!\[\[image.png]]` | template below                                                     |
| **Callout marker**       | `> [!note]`                 | ❌ becomes `> \[!note]`       | template below                                                     |
| **Literal link syntax**  | `[text](url)` typed as text | ❌ becomes `\[text]\(url)`    | template below                                                     |
| **Task list / checkbox** | `- [ ] todo`                | ⚠️ becomes plain `- todo`     | not fixable by template — see [Task lists](#task-lists-checkboxes) |

> ⚠️ Note on highlights: Better Notes' _own_ highlights (made with the editor
> highlighter) are exported as `<span style="background-color:…">…</span>`
> HTML, which Obsidian renders correctly but is **not** the `==...==` syntax. If
> you specifically want `==...==`, see the [optional recipe](#optional-convert-better-notes-highlights-to-).
> Highlights you type as `==...==` in the external file are preserved as‑is.

## Fix: edit the `[ExportMDFileContent]` template

Every time Better Notes writes a `.md` file, it runs your `[ExportMDFileContent]`
template over the result. You get two variables:

- `mdContent` — the exported Markdown (a string)
- `noteItem` — the Zotero note item

Whatever you `return` is written to disk. By default it just returns the content
unchanged:

```js
${{
  return mdContent;
}}$
```

To edit it: **Zotero menu → `Tools` → `Note Template Editor`**, select
`[ExportMDFileContent]` in the list, and replace its body.

### Ready‑to‑use: keep Obsidian flavors

Paste this into `[ExportMDFileContent]`. It un‑escapes wiki links, embeds,
callout markers and typed highlights, while **skipping code blocks / inline
code** so your code samples are never touched. It is **idempotent** — safe to
run every sync, including two‑way sync.

````js
${{
  // Split off fenced code blocks and inline code so we never rewrite code.
  const parts = mdContent.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg; // a code segment — leave untouched
      return seg
        // ![[embed]] must be handled before [[wikilink]]
        .replace(/!\\\[\\\[/g, "![[")
        .replace(/\\\[\\\[/g, "[[")
        // == highlight ==  (only if it was escaped)
        .replace(/\\==/g, "==")
        // callout marker inside a blockquote:  > \[!note]  ->  > [!note]
        .replace(/(^|\n)(\s*>\s*)\\\[!/g, "$1$2[!");
    })
    .join("");
}}$
````

### Pick only what you need

If you only use some flavors, keep only the matching `.replace(...)` lines.

| Want to keep…            | Add this line                                                          |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------- |
| Wiki links `[[Page]]`    | `.replace(/\\\[\\\[/g, "[[")`                                          |
| Embeds `![[file]]`       | `.replace(/!\\\[\\\[/g, "![[")` (put it **before** the wiki‑link line) |
| Typed highlights `==x==` | `.replace(/\\==/g, "==")`                                              |
| Callout markers `> [!x]` | `.replace(/(^                                                          | \n)(\s*>\s*)\\\[!/g, "$1$2[!")` |

### Optional: convert Better Notes highlights to `==...==`

If you highlight text with the Better Notes editor and want it exported as
Obsidian `==...==` instead of an HTML `<span>`, add this (it only matches the
highlight spans, leaving colored text and other spans alone):

```js
        .replace(
          /<span style="background-color:[^"]*">([\s\S]*?)<\/span>/g,
          "==$1==",
        )
```

> This is one‑directional (note → md). When the file syncs back in, `==...==`
> stays as literal text unless you also highlight it again in Zotero.

## Two‑way sync caveats

- **Wiki links, callouts, highlights, tags, comments** typed in your external
  editor round‑trip fine with the template above: they are stored as literal
  text in the note and rewritten correctly on the next export.
- **Embeds `![[file]]` are converted to standard images.** On import,
  `![[image.png]]` becomes a normal `![](image.png)` image inside the note, so a
  later export produces `![](image.png)`, not `![[image.png]]`. The template can
  turn `\[\[` back into `[[`, but it cannot recover an embed that has already
  been converted to an image. If you rely on `![[...]]`, prefer editing those
  lines in the external file only.
- **The template runs only on export (note → md).** There is no import‑side
  content template, so anything the external editor writes is taken as‑is on the
  way in.

## Task lists / checkboxes

`- [ ] todo` is a GitHub‑Flavored‑Markdown feature the converter _can_ parse, but
the **Zotero note editor has no checkbox element**, so an imported task list
collapses to an ordinary bullet list and exports as `- todo`
([#1406](https://github.com/windingwind/zotero-better-notes/issues/1406)). This
cannot be fixed with an export template because the checkbox information is
already gone before export runs.

Workarounds:

- Keep task lists in the **external file only** and don't rely on Zotero
  re‑rendering them.
- Or represent state with text/emoji that survives round‑trips, e.g. `- ⬜ todo`
  / `- ✅ done`.

## Still stuck?

If you use a flavor not covered here, open a
[discussion](https://github.com/windingwind/zotero-better-notes/discussions) and
include a minimal before/after example (what you typed vs. what ended up in the
`.md`). Because the export goes through a standard Markdown processor, most
flavors follow the same "escaped punctuation" pattern shown above and can be
recovered with one more `.replace(...)` line in `[ExportMDFileContent]`.

See also: [Use Note Template](about-note-template.md).
