# Template

v0.3.0 supports a new feature called _Template_

You can find it under the Workspace Window->Edit:
![image](https://user-images.githubusercontent.com/33902321/169189492-ab27b5ef-d6b2-4e4b-9035-2c11a91d53a1.png)

## Add a template

Click the _Edit Templates_ to open the editor.
![image](https://user-images.githubusercontent.com/33902321/169189605-e450702c-2336-463f-b157-600a198d987c.png)

Create a blank template, or from a note. Here are example templates for the test:

Copy The Name & template text to a new template and save it!

**Template Name must include one of these keywords:**

- Text: indicate it's a normal template
- Note: indicate it's a note template. Must select notes before inserting
- Item: indicate it's an item template. Must select items before inserting
- QuickInsert: The template used when insert a note link to main note. Only the template with name `[QuickInsert]` is used.
- QuickImport: The template used when import a sub-note to main note. Only the template with name `[QuickImport]` is used.

## Templates

Welcome to share & contribute your template!

### [Note] with meta-data

```js
<p><span style="background-color: #ffd40080">Note: ${link}</span></p>
${topItem?`<p>Title: ${topItem.getField('title')}</p>
<p>Author: ${topItem.getField('firstCreator')}</p>
<p>Date: ${topItem.getField('date')}</p>`:''}
```

### [Item] meta-data

```js
<h2>Item Meta Data:</h2>
<p>Title: ${topItem.getField('title')}</p>
<p>Author: ${topItem.getField('firstCreator')}</p>
<p>Date: ${topItem.getField('date')}</p>
```

### [Item] item-notes with metadata:

shared by @zyx335588
![image](https://user-images.githubusercontent.com/33902321/169704517-14faa474-0273-4357-99af-982f48576533.png)

```js
<h1>${topItem.getField('title')}</h1>
<h2 style="color:red; background-color: #efe3da;">💡 Meta Data</h2>
<table>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">Title </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getField('title')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">Journal </p>
        </th>
        <td style="background-color:#f3faf4;">
            ${topItem.getField('publicationTitle')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">1<sup>st</sup> Author </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getField('firstCreator')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">Authors </p>
        </th>
        <td style="background-color:#f3faf4;">
            ${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">Pub. date </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getField('date')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">DOI </p>
        </th>
        <td style="background-color:#f3faf4;">
            <a href="https://doi.org/${topItem.getField('DOI')}">${topItem.getField('DOI')}</a>
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">Archive </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getField('archive')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">Archive Location </p>
        </th>
        <td style="background-color:#f3faf4;">
            ${topItem.getField('archiveLocation')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">Call No. </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getField('callNumber')}
        </td>
    </tr>
</table>
${itemNotes.map((noteItem)=>{
const noteLine = `<h2  style="color:red; background-color: #efe3da;">📜 Note:  <a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(noteItem)
}" rel="noopener noreferrer nofollow">${noteItem.key}</a></h2>
<blockquote>
    ${noteItem.getNote()}
    <p style="background-color: pink;"><strong>Merge Date: </strong> ${new Date().toISOString().substr(0,10)+" "+ new Date().toTimeString()}</p>
</blockquote>
<p style="color:red; background-color: #efe3da;"><strong>📝 Comments</strong></p>
<blockquote>
    <p>Make your comments</p>
    <p></p>
</blockquote>`;
copyNoteImage(noteItem);
return noteLine;
}).join("\n")}
```

### [Item] metadata for CS
Modified on the previous template. Auto-ajust metadata according to item type.  
![image](https://user-images.githubusercontent.com/33902321/171443309-1cb54d09-8e8a-40ae-8465-96f2f808c96d.png)

```js
<h2>${topItem.getField('title')}</h2>
<table>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">Title </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getField('title')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">${(()=>{
              if(topItem.itemType === "conferencePaper") return "Conference";
              if(topItem.itemType === "journalArticle") return "Journal";
              if(topItem.itemType === "report") return "Publisher";
              return "Publisher";})()}</p>
        </th>
        <td style="background-color:#f3faf4;">${(()=>{
              if(topItem.itemType === "conferencePaper") {
                const res =  topItem.getField("conferenceName");
                return res?res:topItem.getField("proceedingsTitle");
              };
              if(topItem.itemType === "journalArticle") return topItem.getField("publicationTitle");
              if(topItem.itemType === "report") return topItem.getField("institution");
              return topItem.getField("publicationTitle");})()}
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">Authors </p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">Pub. date </p>
        </th>
        <td style="background-color:#f3faf4;">
            ${topItem.getField('date')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">DOI </p>
        </th>
        <td style="background-color:#dbeedd;">
            <a href="https://doi.org/${topItem.getField('DOI')}">${topItem.getField('DOI')}</a>
        </td>
    </tr>
    <tr>
        <th style="background-color:#f3faf4;">
            <p style="text-align: right">URL</p>
        </th>
        <td style="background-color:#f3faf4;">
            ${topItem.getField('url')}
        </td>
    </tr>
    <tr>
        <th style="background-color:#dbeedd;">
            <p style="text-align: right">CitationKey</p>
        </th>
        <td style="background-color:#dbeedd;">
            ${topItem.citationKey?topItem.citationKey:''}
        </td>
    </tr>
</table>
```


### [Text] today

```js
<h1>TODO: ${new Date().toLocaleDateString()}</h1>
<h2>Tasks</h2>
<ul>
<li>
Read Paper 1
</li>
<li>
Do some experiments
</li>
</ul>
<blockquote>
<p>Insert more items with meta-data in workspace window-&gt;Edit</p>
</blockquote>
<p></p>
<h2>Done Tasks</h2>
<p></p>
<h2>Todo Tomorrow</h2>
<p></p>
</div>
```

## Use a template

You can insert templates in 3 ways: `Text`, `Note`, and `Item`.

Templates with these keywords will show in the corresponding menu popup.

## Create a template

### Text

> variables: no special variables
> A pure text template.

### Item

> variables: topItem
> Select items and use `topItem`(a Zotero Item Object) to access its metadata. For example:

```js
<p>${topItem.getField("title")}</p>
```

Will be compiled to:

> YOLO-LITE: A Real-Time Object Detection Algorithm Optimized for Non-GPU Computers

### Note

> variables: topItem, noteItem, link
> Select notes and use `topItem`(a Zotero Item Object) to access its metadata, `noteItem` to access the note. For example:

```js
<h1>Note: ${noteItem.getNoteTitle()}</h1>
${link}
<p>${topItem.getField('title')}</p>
```

Will be compiled to:

> # Note: Sensors in Papers
>
> [Sensors in Papers](http://:zotero://note/u/GCY9G2PZ/)
> YOLO-LITE: A Real-Time Object Detection Algorithm Optimized for Non-GPU Computers

### QuickInsert

> variables: link: string, subNoteItem, noteItem

### QuickImport

> variables: subNoteLines: string[], subNoteItem, noteItem

## API and Variables

This section is for developers who want to create a new template. Basic coding knowledge is required.
To test & run scripts quickly, open Tools->Developer->Run Javascript.

### Item Fields

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

### Note Fields

```ts
// Get Note Text in HTML
getNote: (void)=>string;

// Get Note Title
getNoteTitle: (void)=>string;
```
