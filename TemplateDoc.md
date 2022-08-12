# Template Documentation

This documentation is like a dictionary. For beginners, see [template usage](./TemplateUsage.md).

Use `Ctrl+F` to look up what you need and make your own template!

## Stages

Some type of templates(Item, Note) support stages.

Code wrapped inside the stage will be called at a specific time.

For example, the `beforeloop` stage code:

```js
// @beforeloop-begin
code;
// @beforeloop-end
```

| stage      | calling time                      |
| ---------- | --------------------------------- |
| beforeloop | before entering the loop of items |
| default    | loop of items                     |
| beforeloop | after leaving the loop of items   |

In other type of templates, the default stage is called.

## Variables

### QuickInsert

> variables: link: string, subNoteItem, noteItem

### QuickBackLink

> variables: subNoteItem, noteItem

### QuickImport

> variables: subNoteLines: string[], subNoteItem, noteItem

### QuickNote

> variables: annotationItem, topItem

### ExportMDFileName

> variables: noteItem

### Text

> variables: -

### Item

> beforeloop stage: items, copyNoteImage, editor, sharedObj
> default stage: topItem, itemNotes, copyNoteImage, editor, sharedObj
> afterloop stage: items, copyNoteImage, editor, sharedObj

### Note

> beforeloop stage: notes, copyNoteImage, editor, sharedObj
> default stage: noteItem, topItem, link, copyNoteImage, editor, sharedObj
> afterloop stage: notes, copyNoteImage, editor, sharedObj

## Formats

### Line

Description: Normal line.  
Template Type: None.  
Required Variable: None.

```html
<p>Your Line Here</p>
```

### Heading

Description: From h1 to h6.  
Template Type: None.  
Required Variable: None.

```html
<h1>Your Heding 1 Here</h1>
<h2>Your Heding 2 Here</h2>
```

### Highlight

Description: Highlight.  
Template Type: None.  
Required Variable: None.

```html
<p style="background-color:#dbeedd;">Text</p>
```

### Strong

Description: **Strong text**. Put it in a `p`.  
Template Type: None.  
Required Variable: None.

```html
<strong>Your Text</strong>
```

### Underline

Description: Underline text. Put it in a `p`.  
Template Type: None.  
Required Variable: None.

```html
<u>Your Text</u>
```

### Deleteline

Description: Deleteline text. Put it in a `p`.  
Template Type: None.  
Required Variable: None.

```html
<span style="text-decoration: line-through">Your Text</span>
```

### Link

Description: Link. Put it in a `p`.  
Template Type: None.  
Required Variable: None.

```html
<a href="zotero://replace/this/link">Link Text</a>
```

### Number List

Description: Number List.  
Template Type: None.  
Required Variable: None.

```html
<ol>
  <li>First</li>
  <li>Second</li>
  <li>...</li>
</ol>
```

### Bullet List

Description: Bullet List.  
Template Type: None.  
Required Variable: None.

```html
<ul>
  <li>First</li>
  <li>Second</li>
  <li>...</li>
</ul>
```

### Sup & Sub Text

Description: $\text{The}^{sup} \ and \ \text{the}_{sub}$ text.  
Template Type: None.  
Required Variable: None.

```html
<p>The<sup>sup</sup>and the<sub>sub</sub> text</p>
```

### Block Quote

Description:

> Block Quote

Template Type: None.  
Required Variable: None.

```html
<blockquote>
  <p>Text</p>
</blockquote>
```

### Monospaced

Description: `Monospaced`  
Template Type: None.  
Required Variable: None.

```html
<pre>Text</pre>
```

### Table

Description:
| Table | Column1 | Column2 |
| ---- | ---- | ---- |
| 00 | 01 | 02 |
| 10 | 11 | 12 |

Template Type: None.  
Required Variable: None.

```html
<table>
  <tr>
    <th style="background-color:#dbeedd;">
      <p style="text-align: right">Table</p>
    </th>
    <th style="background-color:#dbeedd;">Column1</th>
    <th style="background-color:#dbeedd;">Column2</th>
  </tr>
  <tr>
    <td>00</td>
    <td>01</td>
    <td>02</td>
  </tr>
  <tr>
    <td>10</td>
    <td>11</td>
    <td>12</td>
  </tr>
</table>
```

## General Fields

### Current Date

Description: Current Date.  
Required Variable: None.

```js
<p>${new Date().toLocaleDateString()}</p>
```

### Tags

Description: `item.getTags()` returns tags in list. Usually use `tags.includes("YourTag") ? do sth : do sth else`.  
Required Variable: any item/note/annotation.

```js
<p>${topItem.getTags()}</p>
```

## Note Fields

### Note Title

Description: Note Title. First line of note.  
Template Type: Note.  
Required Variable: noteItem/subNoteItem.

```js
<p>${noteItem.getNoteTitle()}</p>
```

### Note Content

Description: Note Content.  
Template Type: Note.  
Required Variable: noteItem/subNoteItem.

```js
<p>${noteItem.getNote()}</p>
```

### Note Link

Description: Note Link.  
Template Type: Note.  
Required Variable: noteItem/subNoteItem.

```js
<p>
  <a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(noteItem)}">
    ${noteItem.key}
  </a>
</p>
```

## Item Fields

### Title

Description: Item title.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>${topItem.getField("title")}</p>
```

### Publisher/Journal

Description: Publisher/Journal.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>
  $
  {(() => {
    if (topItem.itemType === "conferencePaper") {
      return;
      topItem.getField("conferenceName") ||
        topItem.getField("proceedingsTitle");
    }
    if (topItem.itemType === "journalArticle")
      return topItem.getField("publicationTitle");
    if (topItem.itemType === "report") return topItem.getField("institution");
    return topItem.getField("publicationTitle");
  })()}
</p>
```

### Authors

Description: Authors.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>
  $
  {topItem
    .getCreators()
    .map((v) => v.firstName + " " + v.lastName)
    .join("; ")}
</p>
```

### Pub. date

Description: Pub. date.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>${topItem.getField("date")}</p>
```

### Pub. date

Description: Publication date/time.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>${topItem.getField("date")}</p>
```

### DOI

Description: DOI.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>
  <a href="https://doi.org/${topItem.getField('DOI')}">
    ${topItem.getField("DOI")}
  </a>
</p>
```

### URL

Description: URL.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>
  <a href="${topItem.getField('url')}">${topItem.getField("url")}</a>
</p>
```

### CitationKey

Description: CitationKey.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>${topItem.citationKey ? topItem.citationKey : ""}</p>
```

### PDF Link

Description: URL.  
Template Type: Item.  
Required Variable: topItem.

```js
<p>
  $
  {((topItem) => {
    const getPDFLink = (_item) => {
      let libraryID = _item.libraryID;
      let library = Zotero.Libraries.get(libraryID);
      let itemKey = _item.key;
      let itemLink = "";
      if (library.libraryType === "user") {
        itemLink = `zotero://open-pdf/library/items/${itemKey}`;
      } else if (library.libraryType === "group") {
        itemLink = `zotero://open-pdf/groups/${library.id}/items/${itemKey}`;
      }
      return `<a href="${itemLink}">${_item.getFilename()}</a>`;
    };
    return Zotero.Items.get(topItem.getAttachments())
      .filter((i) => i.isPDFAttachment())
      .map((i) => getPDFLink(i))
      .join("\n");
  })(topItem)}
</p>
```

### Item Notes

Description: Walk all sub notes under an item. You can add your code inside the loop.  
Template Type: Item.  
Required Variable: topItem.

```js
${itemNotes.map((noteItem)=>{
    // process each item note
    const noteLine = `<blockquote>
    ${noteItem.getNote()}
    </blockquote>`;
    copyNoteImage(noteItem);
    return noteLine;
}).join("\n")}
```

### About Item Fields

The `noteItem` and `topItem` is a Zotero Item object. The general data can be accessed using the `getField()` method.

For example: `topItem.getField('title')` will return the title of the `topItem`.

```ts
// Get Item Fields
getField: (void)=>string;

// Get Authors
getCreators: (void)=>{
        fieldMode: number,
        firstName: string, // may be empty
        lastName: string,
        creatorTypeID: number,
    }[];
```

Find available fields of the selected item with the code below:

```js
const item = ZoteroPane.getSelectedItems().shift();
const usedFields = item.getUsedFields();
Zotero.ItemFields.getAll()
  .filter((e) => usedFields.indexOf(e.id) >= 0)
  .map((e) => e.name);
```

The result is like this (depending on the item you select):

```JSON
[
    "0": "title"
    "1": "date"
    "2": "language"
    "3": "shortTitle"
    "4": "libraryCatalog"
    "5": "url"
    "6": "accessDate"
    "7": "pages"
    "8": "conferenceName"
]
```

or see https://aurimasv.github.io/z2csl/typeMap.xml for the detailed Zotero fields documentation.
