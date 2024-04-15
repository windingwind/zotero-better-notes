title =
    .title = 链接精灵
tab-inbound =
    .label = 提及
tab-outbound =
    .label = 指向

inbound-step1-content = 第一步-在此处提及:
inbound-step2-content = 第二步-插入链接到:
inbound-step3-content = 第三步-预览:
inbound-step3-middle =
    { $show ->
        [true] 提及了
        *[other] { "" }
    }

outbound-step1-content = 第一步-链接指向:
outbound-step2-content = 第二步-插入链接到:
outbound-step3-content = 第三步-预览:
outbound-step3-middle =
    { $show ->
        [true] 指向了
        *[other] { "" }
    }