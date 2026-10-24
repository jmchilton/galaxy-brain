# faqs/galaxy/histories_archive.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `7ee70847cf8`. Only contributing/faqs embeds it. Replay: `histories_archive.gxui.sh`.

- `archive-archived-histories-location` (main): steps 1-3 hold (History options > **Archive History** >
  **Archive history**). There is no **Data** menu, though. Archived histories are under the Activity
  Bar's **Histories** > **Archived Histories** tab, and the "archived" message links there. After
  archiving, Galaxy switches you to another history.

Galaxy: no E2E test archived a history. Added the `options_archive_history`, `histories.archived_tab`
and `histories.archive` selectors, `history_panel_archive`, `navigate_to_archived_histories` and
`test_history_archive.py::test_archive_current_history` (7ee70847cf8). It passes under Playwright and
Selenium, and fails without the Archive click. gxui: `history-archive`, `histories-archived`.
