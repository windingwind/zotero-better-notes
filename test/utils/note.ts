/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-useless-escape */

export function getNoteContent() {
  return `<div data-schema-version="9"><h1>Markdown Test Document</h1>
<h2>Headers</h2>
<h1>H1 Header</h1>
<h2>H2 Header</h2>
<h3>H3 Header</h3>
<h4>H4 Header</h4>
<h5>H5 Header</h5>
<h6>H6 Header</h6>
<h2>Emphasis</h2>
<p><em>This text is italicized.</em> <em>This text is also italicized.</em></p>
<p><strong>This text is bold.</strong> <strong>This text is also bold.</strong></p>
<p><strong><em>This text is bold and italicized.</em></strong> <strong><em>This text is also bold and italicized.</em></strong></p>
<h2>Links</h2>
<p><a href="https://example.com" title="Title" rel="noopener noreferrer nofollow">Link with title</a> <a href="https://example.com" rel="noopener noreferrer nofollow">Link without title</a></p>
<h2>Images</h2>
<h2>Blockquotes</h2>
<blockquote>
<p>This is a blockquote.</p>
<blockquote>
<p>Nested blockquote.</p>
</blockquote>
<p>Back to the outer blockquote.</p>
</blockquote>
<h2>Lists</h2>
<h3>Unordered List</h3>
<ul>
<li>
<p>Item 1</p>
<ul>
<li>
<p>Subitem 1.1</p>
<ul>
<li>
Subitem 1.1.1
</li>
</ul>
</li>
</ul>
</li>
<li>
Item 2
</li>
</ul>
<h3>Ordered List</h3>
<ol>
<li>
<p>First item</p>
<ol>
<li>
<p>Subitem 1.1</p>
<ol>
<li>
Subitem 1.1.1
</li>
</ol>
</li>
</ol>
</li>
<li>
Second item
</li>
</ol>
<h2>Code</h2>
<h3>Inline Code</h3>
<p>Here is some <code>inline code</code>.</p>
<h3>Code Block</h3>
<pre>def hello_world():
 &nbsp; &nbsp;print("Hello, world!")</pre>
<h2>Horizontal Rules</h2>
<hr>
<p>This is text between horizontal rules</p>
<hr>
<h2>Tables</h2>
<table>
<tbody>
<tr>
<th>
<p>Header 1</p>
</th>
<th>
<p>Header 2</p>
</th>
<th>
<p>Header 3</p>
</th>
</tr>
<tr>
<td>
<p>Row 1</p>
</td>
<td>
<p>Data 1.2</p>
</td>
<td>
<p>Data 1.3</p>
</td>
</tr>
<tr>
<td>
<p>Row 2</p>
</td>
<td>
<p>Data 2.2</p>
</td>
<td>
<p>Data 2.3</p>
</td>
</tr>
</tbody>
</table>
<h2>Math</h2>
<h3>Inline Math</h3>
<p>This is an inline math equation: <span class="math">$E = mc^2$</span>.</p>
<h3>Block Math</h3>
<p>Below is a block math equation:</p>
<pre class="math">$$\\\\int_a^b f(x) \\\\, dx = F(b) - F(a)$$</pre>
<h3>Complex Math</h3>
<p>Solve the quadratic equation:</p>
<pre class="math">$$x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}$$</pre>
<h2>Nested Elements</h2>
<h3>Nested Code and Lists</h3>
<ol>
<li>
<p>Ordered list item</p>
<ul>
<li>
<p>Unordered subitem</p>
<pre>console.log("Nested code block");</pre>
</li>
</ul>
</li>
<li>
<p>This is a nested math</p>
<pre class="math">$$y=x^2$$</pre>
</li>
<li>
This is a inline math<span class="math">$123$</span> with space in list item test
</li>
<li>
<p>This is a line table</p>
<table>
<tbody>
<tr>
<td>
<p>1</p>
</td>
<td>
<p>2</p>
</td>
<td>
<p>3</p>
</td>
</tr>
<tr>
<td>
<p>4</p>
</td>
<td>
<p>5</p>
</td>
<td>
<p>6</p>
</td>
</tr>
<tr>
<td>
<p>7</p>
</td>
<td>
<p>8</p>
</td>
<td>
<p>9</p>
</td>
</tr>
</tbody>
</table>
</li>
</ol>
<h2>Special Characters</h2>
<p>Escape sequences for special characters: * _ \\\` [ ] ( ) # + - .</p>
<h2>HTML in Markdown</h2>
<p>This is a HTML block inside Markdown.</p>
<h2>Highlight Text</h2>
<p>Highlight <span style="background-color: rgba(255, 102, 102, 0.5);">text</span> is here</p>
<h2>Colored Text</h2>
<p>Colored <span style="color: rgb(255, 32, 32);">text</span> is here</p>
<h2>Task Lists</h2>
<ul>
<li>
Completed item
</li>
<li>
Incomplete item
</li>
</ul>
<h2>Strikethrough</h2>
<p><span style="text-decoration: line-through;">This text is strikethrough.</span></p>
<h2>Recursive Elements</h2>
<h3>Recursive Links and Emphasis</h3>
<p><strong><a href="https://example.com" rel="noopener noreferrer nofollow">Bold link</a></strong></p>
<h3>Recursive Emphasis</h3>
<p><strong><em>Bold and nested italic within bold.</em></strong></p>
<h2>Image</h2>
<p>IMAGE_PLACEHOLDER</p>
<h2>Citation</h2>
<p>CITATION_PLACEHOLDER</p>
<h2>Edge Cases</h2>
<h3>Empty Link</h3>
<p><a href="https://" rel="noopener noreferrer nofollow">Link</a></p>
<h3>Zotero Link</h3>
<p><a href="zotero://note/u/123456" rel="noopener noreferrer nofollow">Zotero Link</a></p>
<h3>Lone Asterisk</h3>
<ul>
<li>
This should not be italic.
</li>
</ul>
<h3>Broken Lists</h3>
<ul>
<li>
<p>Item 1</p>
<ul>
<li>
<p>Item 2</p>
<p>Continuation of item 2 without proper indentation.</p>
</li>
</ul>
</li>
</ul>
<h3>Long Text Wrapping</h3>
<p>This is a very long paragraph that does not have any line breaks and is intended to test how the Markdown engine handles text wrapping when there are no explicit line breaks within the text.</p>
<hr>
<h2>Conclusion</h2>
<p>This document contains a wide range of Markdown elements, including headers, lists, blockquotes, inline and block code, tables, images, links, math, and special characters. It also tests recursive and edge cases to ensure the Markdown engine is robust.</p>
</div>`;
}

export function getNoteMarkdown() {
  return `# Markdown Test Document

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

3.  This is a inline math \$123\$  with space in list item test

4.  This is a line table

    | <!-- --> | <!-- --> | <!-- --> |
    | - | - | - |
    | 1 | 2 | 3 |
    | 4 | 5 | 6 |
    | 7 | 8 | 9 |


## Special Characters

Escape sequences for special characters: \\* \\_ \\\\\\\` \\[ ] ( ) # + - .

## HTML in Markdown

This is a HTML block inside Markdown.

## Highlight Text

Highlight <span style="background-color: rgba(255, 102, 102, 0.5);">text</span> is here

## Colored Text

Colored <span style="color: rgb(255, 32, 32);">text</span> is here

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
}

export function getNoteLatexContent() {
  return `<div data-schema-version="9"><h1>LaTeX Test Document</h1>
  <h2>Headers</h2>
  <h1>H1 Header</h1>
  <h2>H2 Header</h2>
  <h3>H3 Header</h3>
  <h4>H4 Header</h4>
  <h5>H5 Header</h5>
  <h6>H6 Header</h6>
  <h2>Emphasis</h2>
  <p><em>This text is italicized.</em> <em>This text is also italicized.</em></p>
  <p><strong>This text is bold.</strong> <strong>This text is also bold.</strong></p>
  <h2>Links</h2>
  <p><a href="https://example.com" title="Title" rel="noopener noreferrer nofollow">Link with title</a> <a href="https://example.com" rel="noopener noreferrer nofollow">Link without title</a></p>
  <h2>Images</h2>
  <h2>Lists</h2>
  <h3>Unordered List</h3>
  <ul>
  <li>
  <p>Item 1</p>
  </li>
  <li>
  <p>Item 2</p>
  </li>
  <li>
  Item 3
  </li>
  </ul>
  <h3>Ordered List</h3>
  <ol>
  <li>
  <p>First item</p>
  </li>
  <li>
  <p>Second item</p>
  </li>
  <li>
  Third item
  </li>
  </ol>
  <h2>Tables</h2>
  <table>
  <tbody>
  <tr>
  <th>
  <p>Header 1</p>
  </th>
  <th>
  <p>Header 2</p>
  </th>
  <th>
  <p>Header 3</p>
  </th>
  </tr>
  <tr>
  <td>
  <p>Row 1</p>
  </td>
  <td>
  <p>Data 1.2</p>
  </td>
  <td>
  <p>Data 1.3</p>
  </td>
  </tr>
  <tr>
  <td>
  <p>Row 2</p>
  </td>
  <td>
  <p>Data 2.2</p>
  </td>
  <td>
  <p>Data 2.3</p>
  </td>
  </tr>
  </tbody>
  </table>
  <h2>Math</h2>
  <h3>Inline Math</h3>
  <p>This is an inline math equation: <span class="math">$E = mc^2$</span>.</p>
  <h3>Block Math</h3>
  <p>Below is a block math equation:</p>
  <pre class="math">$$\\int_a^b f(x) \\, dx = F(b) - F(a)$$</pre>
  <h3>Complex Math</h3>
  <p>Solve the quadratic equation:</p>
  <pre class="math">$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$</pre>
  <h2>Image</h2>
  <p>IMAGE_PLACEHOLDER</p>
  <h2>Citation</h2>
  <p>CITATION_PLACEHOLDER</p>
  <h2>Edge Cases</h2>
  <h3>Long Text Wrapping</h3>
  <p>This is a very long paragraph that does not have any line breaks and is intended to test how the LaTeX engine handles text wrapping when there are no explicit line breaks within the text.</p>
  <h2>Conclusion</h2>
  <p>This document contains a wide range of LaTeX elements, including headers, lists, tables, images, citations, links and math.</p>
  </div>`;
}

export function getNoteLatex() {
  return `\\section{LaTeX Test Document}
\\subsection{Headers}
 \\section{H1 Header}
 \\subsection{H2 Header}
 \\subsubsection{H3 Header}
 \\textbf{H4 Header}
 \\textbf{H5 Header}
 \\textbf{H6 Header}
 \\subsection{Emphasis}


\\textit{This text is italicized.} \\textit{This text is also italicized.}

\\textbf{This text is bold.} \\textbf{This text is also bold.}

\\subsection{Links}


\\href{https://example.com}{Link with title} \\href{https://example.com}{Link without title}

\\subsection{Images}
\\subsection{Lists}
 \\subsubsection{Unordered List}
 \\begin{itemize}
\\item 
  Item 1
  
\\item
  Item 2
  
\\item
  Item 3
   
\\end{itemize}\\subsubsection{Ordered List}
 \\begin{enumerate}
\\item 
  First item
  
\\item
  Second item
  
\\item
  Third item
   
\\end{enumerate}\\subsection{Tables}
 \\begin{table}[htbp]
\\centering
\\caption{Caption}
\\label{tab:simple_table}
\\begin{tabular}{|l|l|l|}
\\hline

  Header 1
   & 
  Header 2
   & 
  Header 3
   \\\\
\\hline

  Row 1
   & 
  Data 1.2
   & 
  Data 1.3
   \\\\
\\hline

  Row 2
   & 
  Data 2.2
   & 
  Data 2.3
   \\\\
\\hline
\\end{tabular}
\\end{table}\\subsection{Math}
 \\subsubsection{Inline Math}


This is an inline math equation: $E = mc^2$.

\\subsubsection{Block Math}


Below is a block math equation:

$$
\\int_a^b f(x) \\, dx = F(b) - F(a)
$$

\\subsubsection{Complex Math}


Solve the quadratic equation:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

\\subsection{Image}


IMAGE_PLACEHOLDER

\\subsection{Citation}


CITATION_PLACEHOLDER

\\subsection{Edge Cases}
\\subsubsection{Long Text Wrapping}


This is a very long paragraph that does not have any line breaks and is intended to test how the LaTeX engine handles text wrapping when there are no explicit line breaks within the text.

\\subsection{Conclusion}


This document contains a wide range of LaTeX elements, including headers, lists, tables, images, citations, links and math.
`;
}

export function parseTemplateString(input: string): string {
  return input
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/`/g, "\\`"); // Escape backticks
}
