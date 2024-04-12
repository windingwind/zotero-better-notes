note-relation-header =
    .label = Relation Graph
note-relation-sidenav =
    .tooltiptext = Relation Graph
note-relation-refresh =
    .tooltiptext = Refresh

note-inlink-header =
    .label =
        { $count ->
            [one] { $count } Inbound Link
            *[other] { $count } Inbound Links
        }
note-inlink-sidenav =
    .tooltiptext = Inbound Links
note-inlink-refresh =
    .tooltiptext = Refresh

note-outlink-header =
    .label =
        { $count ->
            [one] { $count } Outbound Link
            *[other] { $count } Outbound Links
        }
note-outlink-sidenav =
    .tooltiptext = Outbound Links
note-outlink-refresh =
    .tooltiptext = Refresh
