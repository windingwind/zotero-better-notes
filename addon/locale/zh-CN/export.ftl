title=导出笔记
options-linkMode=链接笔记模式
options-MD=MarkDown(.md)
options-Docx=MS Word(.docx)
options-PDF=PDF(.pdf)
options-mm=思维导图
options-note=Zotero笔记
embedLink=全部嵌入为一个导出
standaloneLink=分别单独导出
keepLink=保留Zotero链接(zotero://note/)
exportMD=导出MD文件
setAutoSync=设置自动同步
    .title=自动同步仅能在"分别单独导出模式"使用
withYAMLHeader=带有YAML头
autoMDFileName=自动生成MD文件名
exportDocx=导出Word文件
exportPDF=导出PDF文件
exportFreeMind=导出FreeMind文件
exportNote=导出为Zotero笔记条目
confirm=导出
cancel=关闭
target=目标: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " }和其他{$left}个
    }