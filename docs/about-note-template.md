# Use Note Template

You can search and find note templates from the community [here](https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates).

## Import Note Template

One-click to import.

1. Copy the template below (just an example).
<details style="text-indent: 2em">
<summary>Click to show the example template</summary>

```yaml
name: "[Text] Current Time"
content: |-
  // @use-markdown
  // @author windingwind
  // @link https://github.com/windingwind/zotero-better-notes/blob/master/docs/about-note-template.md

  # Template Example: Current Time

  > Author: windingwind
  >
  > from: [GitHub-Zotero Better Notes: Write Note Template](https://github.com/windingwind/zotero-better-notes/blob/master/docs/about-note-template.md)

  **Current Time**: ${new Date().toLocaleString()}
```

</details>

2. Goto Zotero menubar, click `Edit`->`New Template from Clipboard`.
3. Click OK.

Now you can open a note/the workspace and in editor toolbar, click `Insert Template to cursor line`. Select the template, it is inserted to the note.

# Write Note Template

## What is this?

This section aims to help you writing a note template of Better Notes. See [here](../README.md#note-template) for the introduction of the note template.

Use [Markdown](https://www.markdownguide.org/cheat-sheet/)/[HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) to write a note template. If you want to execute scripts in the template, you may want to use [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript).

> 💡It's OK if you don't know them. Creating your own template is very easy!

## Overview

- [Note Template Structure](#note-template-structure)
- [Pragma](#pragma)
- [Script in Note Template](#script-in-note-template)
- [Template Type](#template-type)
- [Style Syntax](#style-syntax)
- [Script Syntax](#script-syntax)
- [Share Your Template](#share-your-template)

## Note Template Structure

A template consists of two parts:

**Name**: The name of template. starts with `[TYPE]`, where the `TYPE` should be the actual type of the template, e.g. `Item`, `Text`, etc.

**Content**: The template code.

## Pragma

Pragmas are lines start with `// @`. They have special effect and will not be rendered.

### `// @use-markdown`

Let the compiler know you are using markdown. Otherwise the template will be processed as HTML.

### `// @author`

Mark the code belongs to you. Your GitHub account or your email.

### `// @link`

Link to the page where the template is published so that users can contact you and give feedback.

### `// @${stage}-begin` and `// @${stage}-end`

The `Item` template supports three stages and others only support `default` stage.

If not specified, the whole template will be recognized as `default`.

Code wrapped by `// @${stage}-begin` and `// @${stage}-end` will be processed during the corresponding stage. Here the `${stage}` should be replaced by the actual stage name, like `beforeloop`.

## Script in Note Template

Note template supports JavaScript.

### One-Line Code

Wrap one-line code with `${code here}`. The example in [Import Note Template](#import-note-template) uses `${new Date().toLocaleString()}` to render the current time.

### Multi-Line Code (Function)

Wrap lines with `${{code here}}$`. The example below will be rendered as `3` (the return value of the function).

```js
${{
  const a = 1;
  const b = 2;
  return a + b;
}}$
```

### Global Variables

Each template has its own global variables. See [Template Type](#template-type) for more information.

All templates share a global variable `_env = {dryRun: boolean}`. In preview mode (in template editor), the `_env.dryRun` is `true` and in that case you must not modify the library.

## Template Type

### Item

Process one or more item(s). The input items are from the item picker window or the selected items.

There are three stages (`beforeloop`, `default`, `afterloop`) in this template. Use pragmas to wrap the template code to indicate on which stage it should be processed.

If no stage pragma is given, the whole template will be processed on the default stage.

<details>
<summary>Click to show the example template</summary>

```yaml
name: "[Item] Example Item Template"
content: |-
  // @beforeloop-begin
  // @use-markdown
  # Hi! This only renders once
  // @beforeloop-end
  // @default-begin
  <p>Title: <span style="color: #ffcb00">${topItem.getField("title")}</span></p>
  // @default-end
  // @afterloop-begin
  > Done! But Markdown is not rendered correctly. Try to add 
  \`// @use-markdown\` pragma before this line.
  // @afterloop-end
```

</details>

**Stages and Global Variables**

`beforeloop` stage:
Processed before loop.

- items: an array of Zotero item, the input
- targetNoteItem: The note item that accepts the rendered template. Undefined in preview mode (`_env.dryRun` is `true`)
- copyNoteImage: a function that accepts a Zotero item. If the rendered result contains contents from another note, you should call `copyNoteImage(anotherNote)` to copy images from `anotherNote`.
- sharedObj: for temporary variables, shared between all stages

`default` stage:
Processed in a loop of input items. Run once for each item.

- topItem: Current item
- targetNoteItem
- itemNotes: The child notes of current item (Deprecated)
- copyNoteImage
- sharedObj

`afterloop` stage:
Processed after loop.

- items
- targetNoteItem
- copyNoteImage
- sharedObj

### Text

Basic user template.

**Global Variables**

- targetNoteItem
- sharedObj

### Builtin Templates

| Name               | Description                                              | Variables                             |
| ------------------ | -------------------------------------------------------- | ------------------------------------- |
| QuickInsert        | For forward link.                                        | link, linkText, subNoteItem, noteItem |
| QuickBackLink      | For back link.                                           | link, linkText, subNoteItem, noteItem |
| QuickImport        | For importing note link content.                         | link, noteItem                        |
| QuickNote          | For generating note from annotation.                     | annotationItem, topItem, noteItem     |
| ExportMDFileName   | For generating Markdown file name when exporting.        | noteItem                              |
| ExportMDFileHeader | For generating Markdown file yaml header when exporting. | noteItem                              |

## Style Syntax

We recommend using Markdown for styles.

| Element                                                                         | Markdown Syntax                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Heading](https://www.markdownguide.org/basic-syntax/#headings)                 | `# H1`<br/>`## H2`<br/>`### H3`                               |
| [Bold](https://www.markdownguide.org/basic-syntax/#bold)                        | `**bold text**`                                               |
| [Italic](https://www.markdownguide.org/basic-syntax/#italic)                    | `*italicized text*`                                           |
| Underline                                                                       | `<u>Underline Text</u>`                                       |
| Strike Trough                                                                   | `~~Deleted Text~~`                                            |
| Superscript                                                                     | `N/m<sup>2</sup>`                                             |
| Subscript                                                                       | `x<sub>i</sub>`                                               |
| [Blockquote](https://www.markdownguide.org/basic-syntax/#blockquotes-1)         | `> blockquote`                                                |
| [Ordered List](https://www.markdownguide.org/basic-syntax/#ordered-lists)       | `1. First item`<br/>`2. Second item`<br/>`3. Third item`      |
| [Unordered List](https://www.markdownguide.org/basic-syntax/#unordered-lists)   | `- First item`<br/>`- Second item`<br/>`- Third item`         |
| [Code](https://www.markdownguide.org/basic-syntax/#code)                        | `` `code` ``                                                  |
| Code Block (Monospaced)                                                         | ` ``` `<br/>`function add(x)`<br/>`{return x+1}`<br/>` ``` `  |
| [Horizontal Rule](https://www.markdownguide.org/basic-syntax/#horizontal-rules) | `---`                                                         |
| [Link](https://www.markdownguide.org/basic-syntax/#links)                       | `[title](https://www.example.com)`                            |
| Highlight Text                                                                  | `<span style="background-color: #5fb23680">highlighted<span>` |
| Text Color                                                                      | `<span style="color: #ffcb00">colored<span>`                  |
| Math Inline                                                                     | `$y=x^2$`                                                     |
| Math Block                                                                      | `$$y=x^2$$`                                                   |

## Script Syntax

JS scripts are supported. Here are some helpful script snippets.

<table>
<th>
<td>Script</td>
<td>Scope</td>
</th>
<tr>
<td>Get array of tags from current item</td>
<td>

```js
${topItem.getTags().map(tagObj=>tagObj.tag)}`
```

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get title of current item</td>
<td>

```js
${topItem.getField("title")}
```

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get authors of current item</td>
<td>

```js
${topItem.getCreators().map((au) => au.firstName + " " + au.lastName).join("; ")}
```

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get PDF link of current item</td>
<td>

<details>
<summary>Click to show</summary>

```js
${{
  async function getPDFLink(item) {
    const att = await item.getBestAttachment();
    if (!att || !att.isPDFAttachment()) {
      return "";
    }
    key = att.key;
    if (att.libraryID === 1) {
      return `zotero://open-pdf/library/items/${key}`;
    } else {
      groupID = Zotero.Libraries.get(att.libraryID).id;
      return `zotero://open-pdf/groups/${groupID}/items/${key}`;
    }
  }
  sharedObj.getPDFLink = getPDFLink;
  return await getPDFLink(topItem);
}}$
```

</details>

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get (author, year) with PDF link of current item</td>
<td>

<details>
<summary>Click to show</summary>

```js
${{
  const creators = topItem.getCreators();
  let content = "";
  const year = topItem.getField("year");
  if (creators.length === 0) {
    content = "no author";
  } else if (creators.length === 1) {
    content = `${creators[0].lastName}, ${year}`;
  } else {
    content = `${creators[0].lastName} etal., ${year}`;
  }
  // The getPDFLink is from above
  const link = await sharedObj.getPDFLink(topItem);
  let str = `<a href="${link}">${content}</a>`;
  return str;
}}$
```

</details>

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get pub date of current item</td>
<td>

```js
${topItem.getField("date")}
```

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get DOI of current item</td>
<td>

```js
[${topItem.getField("DOI")}]("https://doi.org/${topItem.getField('DOI')}")
```

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get other fields of current item</td>
<td>

```js
${topItem.getField("FIELD_KEY")}
```

`FIELD_KEY` can be found here: https://aurimasv.github.io/z2csl/typeMap.xml

</td>
<td>Item:default</td>
</tr>
<tr>
<td>Get CitationKey of current item</td>
<td>

```js
${topItem.citationKey ? topItem.citationKey : ""}
```

</td>
<td>Item:default</td>
</tr>
</table>

## Share Your Template

Users can use [Import Note Template](#import-note-template) to copy and import the published templates.

A template snippet should be in YAML format (YAML has better support for multi-line content):

```yaml
name: "[TYPE] TEMPLATE NAME"
content: |-
  // @author YOUR NAME
  // @link PUBLISH PAGE URL
  TEMPLATE CONTENT HERE
```

or JSON format:

```json
{
  "name": "[TYPE] TEMPLATE NAME",
  "content": "// @author YOUR NAME\n// @link PUBLISH PAGE URL\nTEMPLATE CONTENT HERE"
}
```

All templates should be posted [here](https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates)
