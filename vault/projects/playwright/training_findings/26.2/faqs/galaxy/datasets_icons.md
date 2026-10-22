# faqs/galaxy/datasets_icons.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `32e12d33af7` (`faq_server.sh main`). A pasted bed, a
`cat1` output, an unrelated paste and a failed `Filter1`. Each icon was clicked on the expanded output.
Embedded in `metabolomics/gc_ms_with_xcms`.

## GTN

- `icons-export-another-galaxy` (version): 26.2 adds **Export to another Galaxy**
  (`fa-file-export`, between Download and Copy Link) on the user's own datasets. The FAQ doesn't list
  it, and GTN's `_config.yml` has no icon for it. The button needs Celery, which usegalaxy.* runs.
- Every other icon matches: eye, pencil, trash, disc (title `Download (<size>)`), link, info, chart,
  sitemap (**Show Related Items**; clicking again clears the `related:` filter) and redo. The bug icon
  shows only on red datasets and opens the error page with its report form.
- The Visualize line still holds: external display links come first, then the visualization list
  (Editor is "Manually edit text content"). UCSC wasn't listed for an hg19 bed here because that
  comes from server display config, so it's not a finding.

## Galaxy

- Covered: the related filter (`test_history_related_filter`), the bug icon / error page, Copy Link
  (`1c8ea1d9a31`) and Export (vitest only). The title-button checks in
  `test_history_dataset_state._assert_buttons` are a stub, and the fix is already queued
  (gx_issues `history_item_button_assertions_stubbed`, `985f0cba`), so nothing duplicated here.
- Gap: nothing checked that a second click on Show Related Items clears the filter. Strengthened
  `test_history_related_filter` (`32e12d33af7`) with `history_panel_item_show_related` and
  `history_panel_filter_text`. Green under Playwright and Selenium.
- gxui: `dataset-related HID` (prints the filter and the hids shown; run again to clear). The replay
  lists the buttons with `gxui snapshot history_panel`.
