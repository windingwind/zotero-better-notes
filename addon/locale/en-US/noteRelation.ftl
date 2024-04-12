note-relation-header =
    .label = Relation Graph
note-relation-sidenav =
    .tooltiptext = Relation Graph
note-relation-refresh =
    .tooltiptext = Refresh

note-inbound-header =
    .label =
        { $count ->
            [one] { $count } Inbound Link
            *[other] { $count } Inbound Links
        }
note-inbound-sidenav =
    .tooltiptext = Inbound Links
note-inbound-refresh =
    .tooltiptext = Refresh

note-outbound-header =
    .label =
        { $count ->
            [one] { $count } Outbound Link
            *[other] { $count } Outbound Links
        }
note-outbound-sidenav =
    .tooltiptext = Outbound Links
note-outbound-refresh =
    .tooltiptext = Refresh
