# Thermo-nuclear review

Ran the thermo-nuclear code quality review on `git diff origin/release_26.2...HEAD` at `062c9b2c1de`, scaled to the PR: about 85 lines of E2E coverage on a release branch. It found no structural regressions and no blockers. Acted on 1: type hints on the new `history_panel_wait_for_hid_datatype`. Folded into "Test changing the data type of selected history items"; head `7470d5c9fe0`. The rest are noted as follow-ups.

Not acted on:
- **Two "datatype is X" helpers** (`framework.py` `assert_item_extension`, one-shot; new `NavigatesGalaxy.history_panel_wait_for_hid_datatype`, polling). Merging them changes `test_upload_activity.py`'s 4 callers. That's out of scope for a release coverage PR, so it's a follow-up.
- **Repeated `.g-modal-confirm-buttons button:last-child`** (5 places in `navigation.yml`, 1 in `navigates_galaxy.py`). This PR adds 1 more. A shared GModal-confirm component would be a refactor of existing code. Polish already noted it; follow-up.
- **File size.** `navigates_galaxy.py` (3371) and `navigation.yml` (1905) were already over 1k lines. This PR adds about 20 and 16 lines, so it doesn't cross the threshold. Splitting them is out of scope.
- **`citation_bibtex.split(",")[0]`** for the BibTeX key. It's a small data-shape assumption, but it's simpler than parsing the BibTeX properly. Test challenges already weighed this.

## Verification

- `cd lib && mypy galaxy/selenium/navigates_galaxy.py`: no errors in that file. The 7 errors reported are in other modules and were already there.
- `test_history_panel.py::test_change_datatype_of_selected_items` + `test_collection_edit.py::test_change_datatype_simple_list` (the helper's only callers): 2 passed under Playwright, 2 passed under Selenium. Each run used a framework-managed server.

<details>
<summary>Full review</summary>

**Structural / code-judo.** None found. The non-test changes are what a coverage PR needs and nothing more: four `data-description` hooks, two navigation.yml components and three `NavigatesGalaxy` helpers. Each helper follows an existing pattern. `click_history_option_tool_references` follows `click_history_option_sharing`. `history_panel_change_datatype_of_selected` follows `history_panel_build_list_auto` with `use_bootstrap_dropdown(..., menu="selected content menu")`, plus the canonical `select_set_value`. `history_panel_wait_for_hid_datatype` sits with the other `history_panel_wait_for_hid_*` waiters and uses `_wait_on`, which keeps polling while the result is falsy. No branching was added to existing flows. The `test_collection_edit.py` change deletes 3 lines in favor of the shared helper.

**Duplication (follow-up).** `UsesHistoryItemAssertions.assert_item_extension(hid, ext)` in `lib/galaxy_test/selenium/framework.py` reads `item.datatype` once. The new helper polls the same component. The cleaner end state is one concept: either `assert_item_extension` delegates to the waiter, or the waiter replaces it. Its 4 callers in `test_upload_activity.py` would then wait instead of reading once. That's harmless but touches tests outside this PR's scope.

**Boundary / types.** `history_panel_wait_for_hid_datatype(self, hid, datatype)` was untyped, while its sibling `history_panel_change_datatype_of_selected(datatype: str)` and neighbor `history_panel_wait_for_and_select(hids: list[int])` are typed. Fixed.

**Selectors.** `change_datatype_modal.ok` repeats the GModal last-button pattern. Codex's fix already handles the `item_selector` wait, and naming it `item_selector` avoids a clash with `select_set_value`'s `.selector` attribute. `citations._.reference` has to stay a child of `_` (polish debrief).

**File size.** Both shared files were well past 1k lines before this PR. The PR adds a small amount and doesn't push either over a threshold.

**Tests.** Both tests use components and helpers only. They wait instead of sleeping and check the API to back up the UI. The earlier reviews already settled the hid-3 negative check and the API-derived citation counts; nothing to add.

</details>
