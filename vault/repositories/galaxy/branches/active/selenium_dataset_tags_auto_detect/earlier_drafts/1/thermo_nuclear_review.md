# Thermo-nuclear review

Verdict: approve. There are no structural regressions and no code-judo move worth making on a 26.2 test-only branch. I made one change: a one-line comment on the metadata Auto-detect step. It records why the step waits on the alert's text instead of calling `_click_and_assert_success_alert`. The Save step's success alert is still showing at that point, so the helper would pass without Auto-detect doing anything. The comment is there so a later tidy-up doesn't switch the step to the helper and make the check vacuous. I folded it into the Auto-detect commit. Head moved from `2ea54a301b4` to `142b0facd30`, and only that commit's hash changed. Not pushed.

1. `3f1900de910` Share the Add Tags typing loop as `tags_add_from_button` (unchanged)
2. `10f649d0e87` Share the Edit Dataset Attributes success-alert check (unchanged)
3. `fb0283ee475` Tagging test (unchanged)
4. `142b0facd30` Auto-detect test (was `2ea54a301b4`, plus the comment)

## Test results (run one at a time)

| Test | Playwright | Selenium |
|---|---|---|
| test_dataset::test_history_dataset_auto_detect_metadata | pass (31s) | pass (36s) |

The other commits are byte-identical to the versions verified in `polish_e2e_tests_debrief.md`, so I didn't rerun those tests.

## Not acted on

- **Two tag-entry helpers in navigates_galaxy.py.** The existing `tagging_add` (raw CSS, used by the workflow tests) and the new `tags_add_from_button` (component-based) both type tags in a loop. They predate this branch as separate approaches and aren't equivalent. `tagging_add` has no toggle button and re-clicks the input when `auto_closes` is set. Merging them would touch the workflow-management tests. That's a dev follow-up, not a fit for this branch.
- **`test_histories_list.py::add_tag`.** It does a hand-written toggle-button and input entry on a raw grid-cell WebElement, adding one tag. It could become a `tags_add_from_button` caller if the grid cell had component selectors. I left it for the same reason as `test_workflow_editor.py::test_pick_value_add_tags_pja` (declined earlier): it's an unrelated file and would add conflict surface.
- **`tags_add_from_button(button, input, tags)` signature.** I kept the two explicit selectors. Passing the component and reading fixed `tag_area_button` / `tag_area_input` keys would hide a data-shape assumption.
- **`_click_and_assert_success_alert` stays in `TestDataset`.** test_dataset.py is its only user. `edit_dataset_dbkey` in navigates_galaxy.py clicks Save without checking the alert, so the sequence isn't duplicated anywhere else.
- **File size:** N/A. navigates_galaxy.py was already well over 1k lines, and the branch adds about 10.
- **Sibling selector `auto_detect_metadata_button`:** still the decision for John that's already recorded in `polish_e2e_tests_debrief.md`. An id or `data-description` would need a Vue change.
- **`detected` / literal `hid=1` in the Auto-detect test:** declined earlier as cosmetic. No new reason.

<details>

Checked against the prompt's blockers:

- Structure / code judo: the refactor commits remove duplication (the tag loop, and a click/alert triplet repeated four times) rather than moving it around. Neither test body has any branching.
- Spaghetti growth: none. `history_panel_add_tags` keeps `@edit_details`, and the new helper is a straight extraction.
- Boundaries / types: the new selectors are `${_}`-scoped inside `content_item`. The schema.ts keys were added for `content_item`. `edit_dataset_attributes` was already stale in schema.ts on 26.2.
- Canonical helpers: the tests use the existing populators, `history_panel_item_edit`, `history_panel_ensure_showing_item_details` and `history_panel_wait_for_hid_ok`. No dev-only helpers are used.
- Orchestration: test-only. The waits are on API state (the tag persisted, comment_lines re-detected), not on sleeps. The one sleep in `tags_add_from_button` was inherited from base and is commented.

</details>
