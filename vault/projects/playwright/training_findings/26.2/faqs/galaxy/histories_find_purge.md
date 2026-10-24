# faqs/galaxy/histories_find_purge.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `4dc3afa5d26`. No tutorial embeds it. Replay: `histories_find_purge.gxui.sh`.

- `find-purge-stale-steps` (main, 26.1 too): no **User > Histories**; it is the Activity Bar's
  **Histories**. Advanced Search has Deleted and Purged checkboxes, not **Status: All**. The list
  shows only undeleted histories, so tick **Deleted** to reach deleted ones. Select with
  **Select all** above the cards, then **Purge (N)**, and confirm with **Purge histories**.

Galaxy: bulk purge had no selector or test (single-card purge and bulk delete did). Added
`histories.select_all`, `histories.bulk_purge_button`, `histories_purge_all` and
`test_histories_list.py::TestHistoriesPurge::test_purge_all_histories` (4dc3afa5d26, fresh user). It
passes under Playwright and Selenium, and fails without the confirm click. gxui:
`histories-purge-all`.
