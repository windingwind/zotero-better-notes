// Data
export { SYSTEM_TEMPLATE_NAMES, DEFAULT_TEMPLATES };

const SYSTEM_TEMPLATE_NAMES = [
  "[QuickInsertV3]",
  "[QuickImportV2]",
  "[QuickNoteV5]",
  "[ExportMDFileNameV2]",
  "[ExportMDFileHeaderV2]",
  "[ExportMDFileContent]",
  "[ExportLatexFileContent]",
];

// Non-system templates are removed from default templates
const DEFAULT_TEMPLATES = <NoteTemplate[]>[
  {
    name: "[QuickInsertV3]",
    text: `// @use-markdown
[\${linkText}](\${link})`,
  },
  {
    name: "[QuickImportV2]",
    text: `<blockquote>
\${{
  return await Zotero.BetterNotes.api.convert.link2html(link, {noteItem, dryRun: _env.dryRun});
}}$
</blockquote>`,
  },
  {
    name: "[QuickNoteV5]",
    text: `\${{
  let res = "";
  if (annotationItem.annotationComment) {
    let comment = annotationItem.annotationComment || "";
    
    // Remove "note link" if it points to a zotero://select URL
    comment = comment.replace(/\\*?note link:\\*?\\s*(?:\\[[^\\]]*\\]\\()?zotero:\\/\\/select[^\\s)]+\\)?/gi, "");
    
    // Remove the Turkish placeholders
    comment = comment.replace(/Se\\u00e7ilen Konum.*?\\(Referred in\\)?:?/gi, "");
    comment = comment.replace(/Konum aran\\u0131yor\\.\\.\\./gi, "");
    
    // Clean up excessive newlines
    comment = comment.replace(/\\n\\s*\\n\\s*\\n/g, "\\n\\n");
    comment = comment.trim();
    if (comment) {
      let html = await Zotero.BetterNotes.api.convert.md2html(comment);
      html = html.replace(/color\\s*:\\s*[^;\"']+;?/gi, "");
      html = html.replace(/background-color\\s*:\\s*[^;\"']+;?/gi, "");
      res += html;
    }
  }
  res += await Zotero.BetterNotes.api.convert.annotations2html([annotationItem], {noteItem, ignoreComment: true});
  return res;
}}$`,
  },
  {
    name: "[ExportMDFileNameV2]",
    text: '${(noteItem.getNoteTitle ? noteItem.getNoteTitle().replace(/[/\\\\?%*:|"<> ]/g, "-") + "-" : "")}${noteItem.key}.md',
  },
  {
    name: "[ExportMDFileHeaderV2]",
    text: `\${{
  let header = {};
  header.tags = noteItem.getTags().map((_t) => _t.tag);
  header.parent = noteItem.parentItem
    ? noteItem.parentItem.getField("title")
    : "";
  header.collections = (
    await Zotero.Collections.getCollectionsContainingItems([
      (noteItem.parentItem || noteItem).id,
    ])
  ).map((c) => c.name);
  return JSON.stringify(header);
}}$`,
  },
  {
    name: "[ExportMDFileContent]",
    text: `\${{
  return mdContent;
}}$`,
  },
  {
    name: "[ExportLatexFileContent]",
    text: `\${{
  return latexContent;
}}$`,
  },
];
