# faqs/galaxy/datasets_undelete.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `b0c1d0188a5` (`faq_server.sh main`). Three pasted datasets,
1 and 2 deleted. Typing `deleted:true` showed only them and lit the trash counter (**Include
deleted (2)**). Select Items, tick 1, **All 2 selected** > **Undelete** ("Really restore 1 content
items?" > **Restore**). Then Include deleted and 2's Undelete icon. Embedded in
`galaxy-interface/history`.

## GTN

- No findings. The filter, the Selection menu's **Undelete** and the item's trash-arrow-up
  **Undelete** icon (`dataset-undelete`) match 26.2.
- Marginal, not filed: the FAQ never says to click **Select Items** before "Select datasets" (the
  GIF shows it), and Undelete now asks to confirm with **Restore** (as Delete and Hide do).
- `shared/images/datasets_undeleting.gif` (2024) shows only the history panel, which still matches.

## Galaxy

- Gaps: no E2E typed a history filter, or undeleted from the Selection menu. The panel's
  `history_panel.search` selector matched a hidden input and had no callers, and tests typed filters
  through raw `history_element(... ".content-operations-filters")` lookups.
  - `c3c36d23184` fixes `history_panel.search` and adds `history_panel_filter(text)`.
    `history_panel_filter_text` and the collection builders' `_show_hidden_content` now use it.
  - `b0c1d0188a5` extends `test_delete_undelete_and_purge_items`: filter `deleted:true`, then Select
    Items > Undelete, via the new `history_panel_undelete_selected`.
  - Green under Playwright and Selenium. `test_history_related_filter` and
    `test_build_paired_list_auto_matched`, which use the changed helpers, are green under Playwright.
- gxui: `history-filter TEXT` prints the hids a filter shows. `history-undelete HIDS...` takes the
  FAQ's route: `deleted:true`, select, **Undelete**, **Restore**. Verbs that start at `home` clear
  the filter (tip `3f9bc855d76`).
