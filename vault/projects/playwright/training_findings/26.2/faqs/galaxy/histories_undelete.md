# faqs/galaxy/histories_undelete.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `b6077811fd5`. Embedded by galaxy-interface/history.

Steps 1-3 work (Advanced search has a **Deleted** checkbox; a **Show deleted** button is a shortcut).

- `histories-undelete-restore-button` (main): step 4: the title does nothing; click **Restore** on
  the card. The gif is stale (screenshots yaml).

Coverage: test_delete_and_undelete_history. New gxui verbs `histories-delete`, `histories-restore`.
Replay: `histories_undelete.gxui.sh`.

gx note: `histories_click_advanced_search` (`#standard-search .advanced-search-toggle`) times out on
the list page; tests use `components.histories.advanced_search_toggle`. Unused by tests — dead helper.
