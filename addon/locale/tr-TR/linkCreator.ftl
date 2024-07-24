title =
    .title = Bağlantı Oluşturucu
tab-inbound =
    .label = Burada Bahset
tab-outbound =
    .label = Burada Bağlantı Oluştur

inbound-step1-content = Step 1. Notta bahset:
inbound-step2-content = Step 2. Nota bağlantı ekle:
inbound-step3-content = Step 3. Ön izleme:
inbound-step3-middle =
    { $show ->
        [true] mentions
        *[other] { "" }
    }

outbound-step1-content = Step 1. Nota bağlantı ekle:
outbound-step2-content = Step 2. Notta bahset:
outbound-step3-content = Step 3. Ön izleme:
outbound-step3-middle =
    { $show ->
        [true] links to
        *[other] { "" }
    }

outlinePicker-cursorLine = 🖋️İmleç (Satır{ $line })
