pref-title=Better Notes

menuEdit-exportTemplate=Экспорт шаблона в файл...
menuEdit-templateEditor=Редактор шаблонов
menuEdit-importTemplate=Новый шаблон из буфера обмена

menuTools-syncManager=Синк менеджер

menuAddNote-newTemplateStandaloneNote=Новая отдельная Заметка из шаблона
menuAddNote-newTemplateItemNote=Новая элементная Заметка из шаблона
menuAddNote-importMD = Импорт файла MarkDown в качестве примечания

menuItem-exportLaTeX = Экспорт заметок в LaTeX

menuAddReaderNote-newTemplateNote=Новая элементная Заметка из шаблона

menuEditor-resizeImage=Изменить размер изображения

menuHelp-openUserGuide = Open Better Notes User Guide

templateEditor-templateType = Type
templateEditor-templateName = Name

templateEditor-templateDisplayName =
    .QuickInsertV3 = Quick Insert (Link)
    .QuickImportV2 = Quick Import (Embed)
    .QuickNoteV5 = Quick Note (From Annotation)
    .ExportMDFileNameV2 = Export File Name
    .ExportMDFileHeaderV2 = Export MD File Header
    .ExportMDFileContent = Export MD File Content
    .ExportLatexFileContent = Export Latex File Content

templateEditor-templateDisplayType =
    .system = Builtin
    .item = Item
    .text = Text
    .unknown = ?

templateEditor-templateHelp =
    .system = For specific purposes, e.g., generating note link.
    .item = Can generate note fragments from one or more selected items as input.
    .text = Can generate note fragments. It doesn't require any input.

editor-resizeImage-title = Resize Image
editor-resizeImage-prompt = Resize image width to:
editor-previewImage-title = Preview Image

syncManager-noteName=Имя заметки
syncManager-lastSync=Последний Синк
syncManager-filePath=MarkDown путь
syncManager-detectConfirmInfo = {$total} synced markdown files detected in {$dir}
    {$new} new, {$current} will be updated.
    Do you want to apply the changes?

syncInfo-syncTo=MarkDown путь
syncInfo-lastSync=Последний Синк
syncInfo-sync=Синк
syncInfo-unSync=ДеСинк
syncInfo-reveal=Показать в папке
syncInfo-manager=Синк Менеджер
syncInfo-export=Экспортировать как...
syncInfo-cancel=Закрыть

fileInterface-sync=Синк to

sync-start-hint=Авто-Синк заметок включен каждые
sync-stop-hint=Авто-Синк заметок отключен
sync-running-hint-title=Синхронизация заметок
sync-running-hint-check=Проверить статус
sync-running-hint-updateMD=Обновить MarkDown
sync-running-hint-updateNote=Обновить заметку
sync-running-hint-diff=Подтвердить слияние
sync-running-hint-finish=Финиш
sync-running-hint-synced=Синхронизировано
sync-running-hint-upToDate=Обновить

workspace-switchOutline=Переключить режим Набросок
workspace-saveOutlineImage=Сохранить изображение
workspace-saveOutlineFreeMind=Сохранить MindMap
workspace-emptyWorkspaceGuideInfo = No note opened in workspace.
workspace-emptyWorkspaceGuideOpen = Choose a note to open
workspace-emptyWorkspaceGuideOr = or
workspace-emptyWorkspaceGuideCreate = Create a new note

editor-toolbar-settings-openAsTab = Open as tab
editor-toolbar-settings-openAsWindow = Open as window
editor-toolbar-settings-showInLibrary = Show in Library
editor-toolbar-settings-insertTemplate=Вставить шаблон
editor-toolbar-settings-refreshTemplates = Update content from templates
editor-toolbar-settings-copyLink = Копировать Ссылку (L{ $line })
editor-toolbar-settings-copyLinkAtSection = Копировать Ссылку (Sec. { $section })
editor-toolbar-settings-openParent=Открыть вложение
editor-toolbar-settings-export=Экспортировать текущую заметку...
editor-toolbar-settings-refreshSyncing=Синхронизировать сейчас
editor-toolbar-settings-updateRelatedNotes = Update Related Notes

templatePicker-itemData-info=выбрано в библиотеке. Выберите источник данных:
templatePicker-itemData-useLibrary=Использовать выбранные записи в библиотеке
templatePicker-itemData-useCustom=Выбрать другой...
templatePicker-itemData-title=Выбрать источник данных шаблона записи

alert-notValidCollectionError=Выберите валидную коллекцию.
alert-notValidParentItemError=Нет валидного родительского элемента.
alert-syncImportedNotes = Синхронизировать импортированные заметки с файлами MarkDown?
alert-linkCreator-emptyNote = Cannot create link from/to an empty note. 
alert-templateEditor-shouldImport = Вы пытаетесь сохранить код шаблона заметки. Хотите импортировать его как шаблон?
alert-templateEditor-unsaved = You have unsaved changes in the template editor. Do you want to save them?

userGuide-start-title = Welcome to Better Notes!
userGuide-start-desc = Better Notes is a powerful note-taking tool that helps you organize your thoughts and ideas while reading papers. This guide will help you get started with Better Notes and show you how to make the most of its features.
userGuide-start-close = Remind me later
userGuide-createNoteButton-title = Create a New Note
userGuide-createNoteButton-desc = You can create a note here: blank or from a template.
userGuide-createNote-title = Create a New Note
userGuide-createNote-desc = Seems like you don't have any notes yet, let's create one.
userGuide-createNoteFound-desc = Found notes in your library. Let's open one as an example.
userGuide-openNote-title = Open note
userGuide-openNote-desc = You can open a note in Better Notes workspace tab by double-clicking it.
userGuide-openNote-next = Open Note
userGuide-workspace-title = Note Workspace Tab
userGuide-workspace-desc = The note tab is where you can edit your note content, view the outline, and manage the relations.
userGuide-workspaceEditor-title = Note Editor
userGuide-workspaceEditor-desc = The editor supports rich text editing, code block, math block, and more.
userGuide-workspaceEditorToolbar-title = Note Editor - Toolbar
userGuide-workspaceEditorToolbar-desc = The toolbar provides quick access to common editing functions.
    You can set the heading, text/background color, text style, insert link or reference here.
userGuide-workspaceEditorLinkCreator-title = Note Editor - Link Creator
userGuide-workspaceEditorLinkCreator-desc = You can create a link from/to another note via the link creator.
userGuide-workspaceEditorMoreOptions-title = Note Editor - More Options
userGuide-workspaceEditorMoreOptions-desc = Open the note in a new window, show it in the library, insert a template, copy the link, export the note, and more.
userGuide-workspaceOutline-title = Outline
userGuide-workspaceOutline-desc = The outline shows the structure of the note. You can navigate to a section by clicking on it.
userGuide-workspaceOutlineMode-title = Outline Mode
userGuide-workspaceOutlineMode-desc = Switch to outline mode to view the note structure in a more compact way.
userGuide-workspaceOutlineSaveAs-title = Save As
userGuide-workspaceOutlineSaveAs-desc = You can export the note to multiple formats, including PDF, Markdown, MS Word, mind map, and more.
userGuide-workspaceNoteInfo-title = Note Info
userGuide-workspaceNoteInfo-desc = You can view, edit, and manage the note's tags, relations, and links.
userGuide-finish-title = We are all set!
userGuide-finish-desc = Enjoy your note-taking journey with Better Notes!
    You can always run this guide again from the Help menu.
