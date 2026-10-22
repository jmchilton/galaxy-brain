# Alt: original scope

Branch: [`issue_24377_history_item_buttons_26.2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24377_history_item_buttons_26.2_alt_original_scope), tip `db138499905`. It was the parent's first two commits until the round-2 baseline refactor reordered the parent; see [../baseline_refactor.md](../baseline_refactor.md).

This alt is test-only. It restores `_assert_buttons`, fixes the `info_button` and `edit_button` selectors and the tooltips, and replaces the fixed sleeps in the dbkey test. It waits out the `GCollapse` open transition only inside `_assert_action_buttons`, using a selector on the collapse's inline style (`.g-collapse-open[style*="overflow: visible"]`).

The parent differs in three ways:
- It adds a `g-collapse-shown` class to galaxy-ui `GCollapse`.
- It moves the settle wait into `history_panel_click_item_title(wait=True)`, so every caller gets it.
- It adds button checks to the discarded and deferred tests.

This alt does not touch the client UI.
