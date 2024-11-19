pref-title=Better Notes

menuEdit-exportTemplate=运行模板并导出为文件...
menuEdit-templateEditor=模板编辑器
menuEdit-importTemplate=从剪贴板导入笔记模板

menuTools-syncManager=同步管理器

menuAddNote-newTemplateStandaloneNote=从模板新建独立笔记
menuAddNote-newTemplateItemNote=从模板新建条目子笔记
menuAddNote-importMD = 导入MarkDown为笔记

menuAddReaderNote-newTemplateNote=从模板新建条目子笔记

menuEditor-resizeImage=缩放图片

menuHelp-openUserGuide = 打开Better Notes用户指南

templateEditor-templateType = 类型
templateEditor-templateName = 名称

templateEditor-templateDisplayName =
    .QuickInsertV2 = Quick Insert (插入链接)
    .QuickImportV2 = Quick Import (嵌入链接笔记)
    .QuickNoteV5 = Quick Note (从批注创建笔记)
    .ExportMDFileNameV2 = Export MD File Name (导出MD文件名)
    .ExportMDFileHeaderV2 = Export MD File Header (导出MD头)
    .ExportMDFileContent = Export MD File Content (导出MD正文)

templateEditor-templateDisplayType =
    .system = 内置
    .item = 条目
    .text = 文本
    .unknown = ?

templateEditor-templateHelp =
    .system = 用于特定目的，例如生成笔记链接。
    .item = 可以从一个或多个选定的条目生成笔记片段。
    .text = 可以生成笔记片段。不需要任何输入。

editor-resizeImage-title = 缩放图片
editor-resizeImage-prompt = 缩放图片宽度为：
editor-previewImage-title = 预览图片

syncManager-noteName=笔记名称
syncManager-lastSync=最近同步
syncManager-filePath=MarkDown路径
syncManager-detectConfirmInfo = 扫描到{$total}项由本插件同步的markdown文件 (来自{$dir})
    将要新同步{$new}项, 将要覆盖{$current}项
    确定应用这些更改吗?

syncInfo-syncTo=MarkDown路径
syncInfo-lastSync=最近同步
syncInfo-sync=同步
syncInfo-unSync=取消同步
syncInfo-reveal=在文件夹中显示
syncInfo-manager=同步管理
syncInfo-export=导出为...
syncInfo-cancel=关闭

sync-start-hint=自动同步已启用, 间隔
sync-stop-hint=自动同步已停止
sync-running-hint-title=笔记同步
sync-running-hint-check=检查状态
sync-running-hint-updateMD=更新MarkDown
sync-running-hint-updateNote=更新笔记
sync-running-hint-diff=确认合并
sync-running-hint-finish=同步完成
sync-running-hint-synced=已同步
sync-running-hint-upToDate=已最新

fileInterface-sync=同步到

workspace-switchOutline=切换大纲模式
workspace-saveOutlineImage=保存图片
workspace-saveOutlineFreeMind=保存思维导图
workspace-emptyWorkspaceGuideInfo = 没有打开的工作区笔记。您可以：
workspace-emptyWorkspaceGuideOpen = 打开现有笔记
workspace-emptyWorkspaceGuideOr = 或
workspace-emptyWorkspaceGuideCreate = 创建新笔记

editor-toolbar-settings-openAsTab = 在标签页中打开
editor-toolbar-settings-openAsWindow = 在窗口中打开
editor-toolbar-settings-showInLibrary = 在文库中显示
editor-toolbar-settings-insertTemplate=插入模板
editor-toolbar-settings-refreshTemplates = 更新模板生成内容
editor-toolbar-settings-copyLink=复制行(L{ $line })
editor-toolbar-settings-copyLinkAtSection=复制节(Sec. { $section })
editor-toolbar-settings-openParent=打开附件
editor-toolbar-settings-export=导出当前笔记...
editor-toolbar-settings-refreshSyncing=立即同步
editor-toolbar-settings-updateRelatedNotes = 更新关联笔记

templatePicker-itemData-info=在文库中被选中。请选择模板数据源：
templatePicker-itemData-useLibrary=使用文库中选中的条目
templatePicker-itemData-useCustom=另作选择...
templatePicker-itemData-title=选择条目模板数据源

alert-notValidCollectionError=请选择一个有效的分类。
alert-notValidParentItemError=无效的父条目。
alert-syncImportedNotes = 保持导入的笔记与 MarkDown 文件同步？
alert-linkCreator-emptyNote = 无法从/向空笔记创建链接。
alert-templateEditor-shouldImport = 似乎您正在尝试直接保存一个笔记模板分享代码。您想要将其导入为模板吗？
alert-templateEditor-unsaved = 您在模板编辑器中有未保存的更改。您想要保存它们吗？

userGuide-start-title = 欢迎使用Better Notes！
userGuide-start-desc = Better Notes是一个强大的笔记工具，帮助您组织阅读论文时的概念和想法。本指南将帮助您开始使用Better Notes，并向您展示如何充分利用其功能。
userGuide-start-close = 稍后提醒我
userGuide-createNoteButton-title = 创建新笔记
userGuide-createNoteButton-desc = 您可以在这里创建笔记：空白或从模板创建。
userGuide-createNote-title = 创建新笔记
userGuide-createNote-desc = 看来您还没有任何笔记，让我们创建一个。
userGuide-createNoteFound-desc = 在您的库中找到了一些笔记。将打开其中一个作为例子。
userGuide-openNote-title = 打开笔记
userGuide-openNote-desc = 您可以通过双击在Better Notes标签页中打开一个笔记。
userGuide-openNote-next = 打开笔记
userGuide-workspace-title = 笔记标签页
userGuide-workspace-desc = 笔记标签页（原工作区）是您可以编辑笔记内容、查看大纲和管理笔记链接关系的地方。
userGuide-workspaceEditor-title = 笔记编辑器
userGuide-workspaceEditor-desc = 编辑器支持富文本编辑、代码块、数学块等。
userGuide-workspaceEditorToolbar-title = 笔记编辑器 - 工具栏
userGuide-workspaceEditorToolbar-desc = 工具栏提供对常见编辑功能的快速访问。
    您可以在这里设置标题、文本/背景颜色、文本样式、插入链接或引用。
userGuide-workspaceEditorLinkCreator-title = 笔记编辑器 - 链接精灵
userGuide-workspaceEditorLinkCreator-desc = 您可以通过链接精灵创建从/到另一个笔记的链接。
userGuide-workspaceEditorMoreOptions-title = 笔记编辑器 - 更多选项
userGuide-workspaceEditorMoreOptions-desc = 在新窗口中打开笔记，显示在库中，插入模板，复制链接，导出笔记等。
userGuide-workspaceOutline-title = 大纲
userGuide-workspaceOutline-desc = 大纲显示了笔记的结构。您可以通过点击它来导航到一个部分。
userGuide-workspaceOutlineMode-title = 大纲模式
userGuide-workspaceOutlineMode-desc = 切换到大纲模式以不同的方式查看笔记结构。
userGuide-workspaceOutlineSaveAs-title = 另存为
userGuide-workspaceOutlineSaveAs-desc = 您可以将笔记导出为多种格式，包括PDF、Markdown、MS Word、思维导图等。
userGuide-workspaceNoteInfo-title = 笔记信息
userGuide-workspaceNoteInfo-desc = 您可以查看、编辑和管理笔记的标签、关系和链接。
userGuide-finish-title = 准备完成！
userGuide-finish-desc = 享受您与Better Notes的笔记旅程！
    您可以随时从菜单栏 - 帮助再次运行此指南。
