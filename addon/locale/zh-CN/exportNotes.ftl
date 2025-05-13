title =
    .title = 使用 Better Notes 导出笔记

target =
    .value = 目标: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " } 以及其他 {$left} 个。
    }
format =
    .value = 格式:
format-markdown =
    .label = MarkDown(.md)
format-msword =
    .label = MS Word(.docx)
format-pdf =
    .label = PDF(.pdf)
format-freemind = 
    .label = 思维导图
format-note = 
    .label = Zotero 笔记
format-latex =
    .label = LaTeX(.tex)

links-keep =
    .label = 保留笔记链接(zotero://note/)
links-embed =
    .label = 嵌入链接的笔记内容
links-standalone =
    .label = 将链接的笔记分别导出
links-remove =
    .label = 移除笔记链接

markdown-autoSync =
    .label = 为每个笔记设置自动同步
    .title = 自动同步适用于“将链接的笔记分别导出”模式。
markdown-withYAMLHeader =
    .label = 包含 YAML 头
markdown-autoFilename =
    .label = 自动生成文件名

useDefaultExport =
    .label = 使用 Zotero 的默认导出
    .tooltiptext = 导出笔记时不使用 Better Notes 提供的高级选项。

latex-merge =
    .label = 合并为一个tex文件