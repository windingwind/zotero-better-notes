title = Export Notes
options-linkMode = Linked Notes Mode
options-MD = MarkDown(.md)
options-Docx = MS Word(.docx)
options-PDF = PDF(.pdf)
options-mm = Mind Map
options-note = Zotero Note
embedLink = All Embedded in One Export
standaloneLink = Each Converted to Standalone Exports
keepLink = Keep Zotero Links(zotero://note/)
exportMD = Export MD File(s)
setAutoSync = Set Auto-Sync
    .title = Auto-Sync is available for "Each Converted to Standalone Exports" mode.
withYAMLHeader = With YAML Header
autoMDFileName = Auto Generate MD File Name
exportDocx = Export Docx File
exportPDF = Export PDF File
exportFreeMind = Export FreeMind File
exportNote = Export to New Zotero Note Item
confirm = Export
cancel = Close
target = Target: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " }and {$left} more.
    }