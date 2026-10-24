# faqs/galaxy/histories_import.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `316dbcf7610`. Embedded by 21 tutorials (mostly single-cell). Replay:
`histories_import.gxui.sh`.

- `import-history-button-location` (main, 26.1 too): **Import this history** is at the top right of
  the shared history's page, not the top left. Steps 3-4 (title, **Copy History**) match. The modal
  also offers "Copy all datasets including deleted ones".

Galaxy: no E2E test imported a shared history (the button had no selector). Added `history_view`
`import_button` and `copy_modal` selectors, `navigate_to_history_view`, `history_view_import` and
`test_history_sharing.py::test_import_shared_history` (316dbcf7610). It passes under Playwright and
Selenium, and fails without the Copy History click. gxui: `history-import LINK|ID [--name NAME]`.
