title =
    .title = Esporta Note con Better Notes

target =
    .value = Destinazione: {$title}{ $left ->
        [0]{ "" }
        *[other] { " " }e {$left} in più.
    }
format =
    .value = Formato:
format-markdown =
    .label = MarkDown(.md)
format-msword =
    .label = MS Word(.docx)
format-pdf =
    .label = PDF(.pdf)
format-freemind = 
    .label = Mappa Mentale
format-note = 
    .label = Nota Zotero

links-keep =
    .label = Mantieni collegamenti alle note(zotero://note/)
links-embed =
    .label = Incorpora note collegate nel contenuto
links-standalone =
    .label = Converti note collegate in esportazioni autonome
links-remove =
    .label = Rimuovi collegamenti alle note

markdown-autoSync =
    .label = Imposta sincronizzazione automatica per ogni nota
    .title = La sincronizzazione automatica è disponibile per la modalità "Converti note collegate in esportazioni autonome".
markdown-withYAMLHeader =
    .label = Con intestazione YAML
markdown-autoFilename =
    .label = Genera automaticamente il nome del file

useDefaultExport =
    .label = Usa l'esportazione predefinita di Zotero
    .tooltiptext = Esporta note senza le opzioni avanzate fornite da Better Notes.
