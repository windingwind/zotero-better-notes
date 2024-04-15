title =
    .title = Link Creator
tab-inbound =
    .label = Mention in
tab-outbound =
    .label = Link to

inbound-step1-content = Step 1. Mention in note:
inbound-step2-content = Step 2. Insert to:
inbound-step3-content = Step 3. Preview:
inbound-step3-middle =
    { $show ->
        [true] mentions
        *[other] { "" }
    }

outbound-step1-content = Step 1. Link to note:
outbound-step2-content = Step 2. Insert to:
outbound-step3-content = Step 3. Preview:
outbound-step3-middle =
    { $show ->
        [true] links to
        *[other] { "" }
    }
