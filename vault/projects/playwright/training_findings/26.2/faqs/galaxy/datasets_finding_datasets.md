# faqs/galaxy/datasets_finding_datasets.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ffc8a469ec6` (`faq_server.sh main`). A new user with a
dataset in each of two histories; the Datasets list and its search. No tutorial embeds it.

## GTN

- `finding-datasets-user-menu` (main, 26.1 too): there is no **User > Datasets**; the user menu
  only has Preferences and Sign Out. The list is the Activity Bar's **Datasets**. It lists every
  history's datasets, hidden ones and collections included, with a name search.
- The refresh icon is there; the notes on uploads (logout, most recently used history) weren't exercised.

## Galaxy

- Gap: nothing opened the Datasets list. Added `test_datasets_list_spans_histories`
  (`ffc8a469ec6`, a fresh user): rows across two histories, latest first, then search. Adds the
  `datasets` component, `navigate_to_datasets_list`, `datasets_list_rows` and
  `datasets_list_search`. Green under Playwright and Selenium.
- The History cell's text includes its link's screen-reader tooltip ("Switch to history and view
  dataset"), so `datasets_list_rows` keeps the first line.
- The empty-list alert says "upload new datasets using the button above"; there is no button. Minor.
- gxui: `datasets-list [--search TEXT]` (tip `fa8cfda6c7c`).
