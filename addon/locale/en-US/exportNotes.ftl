title =
    .title = Export Notes with Better Notes

target =
    .value = Target: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " }and {$left} more.
    }
format =
    .value = Format:
format-markdown =
    .label = MarkDown(.md)
format-msword =
    .label = MS Word(.docx)
format-pdf =
    .label = PDF(.pdf)
format-freemind = 
    .label = Mind Map
format-note = 
    .label = Zotero Note
format-latex =
    .label = LaTeX(.tex)

links-keep =
    .label = Keep note links(zotero://note/)
links-embed =
    .label = Embed linked notes in the content
links-standalone =
    .label = Convert linked notes to standalone exports
links-remove =
    .label = Remove note links

markdown-autoSync =
    .label = Set auto-sync for each note
    .title = Auto-sync is available for "Convert linked notes to standalone exports" mode.
markdown-withYAMLHeader =
    .label = With YAML header
markdown-autoFilename =
    .label = Auto generate file name

useDefaultExport =
    .label = Use Zotero's default export
    .tooltiptext = Export notes without advanced options provided by Better Notes.

latex-merge =
    .label = Merge into one file
