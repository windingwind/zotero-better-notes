/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-useless-escape */
import { ClipboardHelper } from "zotero-plugin-toolkit";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import { getNoteContent, parseTemplateString } from "../utils/note";
import { getTempDirectory } from "../utils/io";

describe("Export", function () {
  const addon = getAddon();
  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {});

  it("api.$export.saveMD", async function () {
    const note = new Zotero.Item("note");
    note.setNote(getNoteContent());
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.md");

    await getAddon().api.$export.saveMD(filePath, note.id, {
      keepNoteLink: true,
      withYAMLHeader: false,
    });

    debug("Note saved to", filePath);

    const content = await Zotero.File.getContentsAsync(filePath);

    const expected = `# Markdown Test Document

## Headers

# H1 Header

## H2 Header

### H3 Header

#### H4 Header

##### H5 Header

###### H6 Header

## Emphasis

*This text is italicized.* *This text is also italicized.*

**This text is bold.** **This text is also bold.**

***This text is bold and italicized.*** ***This text is also bold and italicized.***

## Links

[Link with title](https://example.com "Title") [Link without title](https://example.com)

## Images

## Blockquotes

> This is a blockquote.
>
> > Nested blockquote.
>
> Back to the outer blockquote.

## Lists

### Unordered List

*   Item 1

    *   Subitem 1.1

        *   Subitem 1.1.1

*   Item 2

### Ordered List

1.  First item

    1.  Subitem 1.1

        1.  Subitem 1.1.1

2.  Second item

## Code

### Inline Code

Here is some \`inline code\`.

### Code Block

\`\`\`
def hello_world():
    print("Hello, world!")

\`\`\`

## Horizontal Rules

***

This is text between horizontal rules

***

## Tables

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Row 1    | Data 1.2 | Data 1.3 |
| Row 2    | Data 2.2 | Data 2.3 |

## Math

### Inline Math

This is an inline math equation: \$E = mc^2\$.

### Block Math

Below is a block math equation:

\$\$
\\\\int_a^b f(x) \\\\, dx = F(b) - F(a)
\$\$

### Complex Math

Solve the quadratic equation:

\$\$
x = \\\\frac\{-b \\\\pm \\\\sqrt\{b^2 - 4ac\}\}\{2a\}
\$\$

## Nested Elements

### Nested Code and Lists

1.  Ordered list item

    *   Unordered subitem

        \`\`\`
        console.log("Nested code block");

        \`\`\`

2.  This is a nested math

    \$\$
    y=x^2
    \$\$

3.  This is a inline math\$123\$

4.  This is a line table

    |   |   |   |
    | - | - | - |
    | 1 | 2 | 3 |
    | 4 | 5 | 6 |
    | 7 | 8 | 9 |

## Special Characters

Escape sequences for special characters: \\* \\_ \\\\\\\` \\[ ] ( ) # + - .

## HTML in Markdown

This is a HTML block inside Markdown.

## Highlight Text

Highlight <span style="background-color: rgba(255, 102, 102, 0.5)">text</span> is here

## Colored Text

Colored <span style="color: rgb(255, 32, 32)">text</span> is here

## Task Lists

*   Completed item
*   Incomplete item

## Strikethrough

~~This text is strikethrough.~~

## Recursive Elements

### Recursive Links and Emphasis

**[Bold link](https://example.com)**

### Recursive Emphasis

***Bold and nested italic within bold.***

## Image

IMAGE\\_PLACEHOLDER

## Citation

CITATION\\_PLACEHOLDER

## Edge Cases

### Empty Link

[Link](https://)

### Zotero Link

[Zotero Link](zotero://note/u/123456)

### Lone Asterisk

*   This should not be italic.

### Broken Lists

*   Item 1

    *   Item 2Continuation of item 2 without proper indentation.

### Long Text Wrapping

This is a very long paragraph that does not have any line breaks and is intended to test how the Markdown engine handles text wrapping when there are no explicit line breaks within the text.

***

## Conclusion

This document contains a wide range of Markdown elements, including headers, lists, blockquotes, inline and block code, tables, images, links, math, and special characters. It also tests recursive and edge cases to ensure the Markdown engine is robust.
`;

    // new ClipboardHelper()
    //   .addText(parseTemplateString(content as string))
    //   .copy();

    assert.equal(content, expected);
  });
});
