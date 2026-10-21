# Test challenges debrief (round 2, after re-scope)

One change: I dropped the `DatasetAttributes.test.ts` vitest "submits metadata auto-detect from the Attributes tab". **This removes a test.** It reverses a suggestion from the [post-rescope review](subagents/rescope_normal_review.md), which the branch had taken. I folded the drop into the Auto-detect commit and reworded that commit's message so it no longer mentions the vitest. `DatasetAttributes.test.ts` now has no diff against `release_26.2`. Head moved from `157d6e7c064` to `8f0ad8b2b6e`:

1. `3f1900de910` Share the Add Tags typing loop (unchanged)
2. `10f649d0e87` Share the success-alert check in test_dataset.py (unchanged)
3. `fb0283ee475` Tagging test (unchanged)
4. `8f0ad8b2b6e` Auto-detect test (was `157d6e7c064`, vitest removed, message reworded)

## Why the vitest went

- **Covered by E2E.** `test_dataset.py::test_history_dataset_auto_detect_metadata` clicks the same `#dataset-attributes-autodetect-metadata` button. It then checks Auto-detect's own alert text, and that `comment_lines` really gets re-detected through the API and in the reopened form. That proves the button submits `autodetect` end to end. The vitest checked the same thing against a mocked `set_edit`.
- **Tests the implementation.** It "failed without the id" only because `find()` missed. It was checking that the attribute exists, not any behavior.
- The client README sends multi-component behavior to Selenium/Playwright, and prefers `shallowMount` for focused unit tests. The existing tests in this file are unchanged.

## Checklist

- **Vitest best practices:** after the drop, the branch has no unit tests.
- **API/integration helper reuse:** N/A, there are no API tests. Setup and state checks in both E2E tests use populators (`new_dataset`, `run_tool`, `get_history_dataset_details`), which follows Best Practice #7.
- **Missing E2E?** No. Both features have E2E tests.
- **E2E vs "Component - E2E Tests - Writing" and "Smart Components":**
  - Both tests use `@managed_history` (#1).
  - Every selector is in `navigation.yml`, and `metadata_input(name)` is parameterized (#9, #11).
  - The helpers live on `NavigatesGalaxy` and are prefixed `history_panel_*` / `tags_*` (#12, #13).
  - There are no backend-specific calls (#16).
  - The one `sleep_for` in `tags_add_from_button` was already there (moved, not added). It has a one-line reason.
- **`id` vs `data-description` (#10):** round 1 deferred this only because client changes were ruled out. Now that the branch touches the client, I decided to keep the plain `id`. It matches the component's siblings, `#dataset-attributes-autodetect-datatype` and `#dataset-attributes-default-save`, which `navigation.yml` already targets by id. Using `data-description` for one of the three buttons would be inconsistent.
- **`tags_add_from_button(button, input, tags)`** takes two SmartTargets instead of a component. Its two callers have different component roots: the history-level `history_panel.tag_area_*` and the item-level `content_item.tag_area_*`. Passing the targets is the simplest shared shape.
- **Overlap with lower layers:** the API tests cover name-tag propagation. The tagging E2E test adds what they can't: entering the tag through the item's Add Tags UI, and seeing `#plus` rendered on the output. Kept.

## Red/green (replaces round 1's reasoning)

Round 1 said the branch "changes no product code". That stopped being true once the re-scope added the `id`.
- **Tagging test:** fails without `history_panel_item_add_tags` / the `content_item.tag_area_*` selectors. Those are test infrastructure, not product code, and mutation checks were done in the initial implementation.
- **Auto-detect test:** without the Vue `id`, the test fails when it looks up the selector (`auto_detect_metadata_button` times out), not at its own assertion. That is the pattern the rule warns about. Here it comes with the branch's shape: a coverage branch whose only product change is a test hook. The original-scope alt (`#dataset-attributes-default-save + button`) shows the test's assertions hold without the hook. The `detected == 0` precondition keeps the re-detect wait from passing vacuously.
- **Refactor commits** (`3f1900de910`, `10f649d0e87`): behavior-preserving. The existing callers (`test_history_panel_tags_change`, `test_name_tags_display`, and the test_dataset.py edit tests) are the guard. They passed on both backends in round 1 and weren't rerun this round.

## Not acted on

- The Auto-detect test still uses a literal `hid=1`. It runs under `@managed_history`, so the hid is deterministic. Switching to `hda["hid"]` would be cosmetic and would mean rerunning E2E on both backends.
- `test_workflow_editor.py::test_pick_value_add_tags_pja` could call `tags_add_from_button`. Changing that unrelated file widens the conflict surface (same call as round 1).
- The test name `test_item_name_tag_propagates_to_tool_output` doesn't use the file's `test_history_panel_*` prefix. The branch record and the upstreaming plan refer to it by this name.

## Verification

- `DatasetAttributes.test.ts` under the pinned node: 4/4 pass. It is now identical to `release_26.2`.
- `git diff 157d6e7c064 8f0ad8b2b6e` touches only `DatasetAttributes.test.ts`. No Vue, navigation, or E2E code changed, so I didn't rebuild the client or rerun E2E.
  - The Auto-detect test passed on both backends at `157d6e7c064`, per the [re-scope debrief](implementation_rescope_debrief.md).
  - `git diff 142b0facd30 HEAD` (the round-1 head) touches only the Vue `id` and its `navigation.yml` line. So the tagging test, the tag helpers, and the `test_dataset.py` refactor are identical to round 1's code. That code passed on both backends, along with the refactor's callers `test_history_dataset_rename`, `test_history_dataset_update_annotation_and_info`, `test_history_dataset_auto_detect_datatype`, `test_history_panel_tags_change` and `test_name_tags_display` (see [earlier_drafts/1/polish_e2e_tests_debrief.md](earlier_drafts/1/polish_e2e_tests_debrief.md)).
- Not pushed.
