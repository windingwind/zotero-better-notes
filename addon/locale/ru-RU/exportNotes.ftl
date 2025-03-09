title =
    .title = Экспорт заметок с Better Notes

target =
    .value = Цель: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " }и еще {$left}.
    }
format =
    .value = Формат:
format-markdown =
    .label = MarkDown(.md)
format-msword =
    .label = MS Word(.docx)
format-pdf =
    .label = PDF(.pdf)
format-freemind = 
    .label = Карта разума
format-note = 
    .label = Заметка Zotero
format-latex =
    .label = LaTeX(.tex)

links-keep =
    .label = Сохранить ссылки на заметки(zotero://note/)
links-embed =
    .label = Встроить связанные заметки в содержимое
links-standalone =
    .label = Преобразовать связанные заметки в автономные экспорты
links-remove =
    .label = Удалить ссылки на заметки

markdown-autoSync =
    .label = Установить авто-синхронизацию для каждой заметки
    .title = Авто-синхронизация доступна в режиме "Преобразовать связанные заметки в автономные экспорты".
markdown-withYAMLHeader =
    .label = С YAML заголовком
markdown-autoFilename =
    .label = Автоматически генерировать имя файла

useDefaultExport =
    .label = Использовать стандартный экспорт Zotero
    .tooltiptext = Экспортировать заметки без расширенных опций, предоставленных Better Notes.
