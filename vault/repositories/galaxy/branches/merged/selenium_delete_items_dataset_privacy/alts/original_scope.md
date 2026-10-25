# original_scope

`selenium_delete_items_dataset_privacy_alt_original_scope` at `b1288fcd9b1`: the test-only version, hardened through test challenges, E2E polish, Codex, thermo-nuclear and baseline refactor. Three commits: `history_panel_item_delete` refactor, delete/undelete/purge E2E, Make new datasets private E2E.

Differs from the parent: no client changes. The delete test asserts hid 1 only after turning Include deleted off, routing around the HistoryPanel optimistic-hide bug; the privacy selectors use `input[name="check-button"]` and a text XPath for the Permissions tab.
