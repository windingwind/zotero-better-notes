title=Экспорт Заметок
options-linkMode=Режим связанных заметок
options-MD=MarkDown(.md)
options-Docx=MS Word(.docx)
options-PDF=PDF(.pdf)
options-mm=Mind Map
options-note=Zotero Note
embedLink=Все внедрённые в одном экспорте
standaloneLink=Каждый конвертированный в отдельный экспорт
keepLink=Сохранять Zotero ссылки(zotero://note/)
exportMD=Экспорт MD файл(-ов)
setAutoSync=Установить Авто-синк
    .title = Auto-Sync is available for "Each Converted to Standalone Exports" mode.
withYAMLHeader=С YAML заголовком
autoMDFileName = Авто-имя MD файла
exportDocx=Экспорт Docx файл
exportPDF=Экспорт PDF файл
exportFreeMind=Экспорт FreeMind файл
exportNote=Экспорт в новый пункт Zotero Note
confirm=Экспорт
cancel=Закрыть
target=Цель: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " }and {$left} more
    }