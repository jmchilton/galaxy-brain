Add the missing 26.2 browser tests for tagging a history item and for re-detecting metadata from the Attributes tab.

| Flow | E2E coverage on `release_26.2` | This PR |
| --- | --- | --- |
| Expand a history item, click its Add Tags button, enter `#plus` | none in the history panel (only the history-level tag editor is driven) | `test_item_name_tag_propagates_to_tool_output`: the item is tagged `name:plus`, and a cat1 run on it shows `#plus` on its output |
| Edit Dataset Attributes > Attributes tab > Auto-detect | none (only the Datatypes tab's Auto-detect is tested) | `test_history_dataset_auto_detect_metadata`: a BED's `comment_lines` goes 0 → 3 by form save, then back to 0 after Auto-detect, through the API and in the reopened form |

***This is test-only. The single client change is a non-visual `id` on the existing Auto-detect button, in its own commit, matching its siblings `#dataset-attributes-autodetect-datatype` and `#dataset-attributes-default-save`.***

***It targets `release_26.2` because these flows have no browser coverage in the release. The branch's files merge into `dev` without conflicts.***

***API tests (`test_workflows.py::test_tag_auto_propagation`, `test_dataset_collections.py::test_collection_tools_tag_propagation`) already cover name-tag propagation. The new test covers the part they can't: entering the tag through the item's Add Tags UI, and seeing `#plus` rendered on the output.***

***The two refactors don't change behavior: `history_panel_add_tags` keeps its signature, and every existing caller of both shared helpers passes under Playwright and Selenium.*** The two flows share one PR because both are small and come from the same upstreaming effort. Either half could land alone.

Removing the item tag-entry call or the Auto-detect click makes the matching test fail. The Auto-detect test first checks that the detected value is 0, so the re-detect wait can't pass on a value that never changed.

<details><summary>What each commit does</summary>

1. **Share the Add Tags typing loop.** `history_panel_add_tags` now calls `tags_add_from_button(button, input, tags)`, which takes the editor's toggle and input targets, so the history-level and item-level editors share one loop. The existing `UX_RENDER` sleep between tags moves with it and gets a one-line reason.
2. **Share the success-alert check.** `TestDataset._click_and_assert_success_alert(button)` replaces the click, wait, and `alert-success` check in three existing `test_dataset.py` tests.
3. **Id on the Attributes tab's Auto-detect button.** `id="dataset-attributes-autodetect-metadata"` in `DatasetAttributes.vue`. Nothing else in the UI changes.
4. **Tagging test.** Adds `history_panel_item_add_tags(hid, tags)` and the `content_item.tag_area_button` / `tag_area_input` selectors (`navigation.yml` and `schema.ts`), which mirror the history-level `tag_area_*` keys.
5. **Auto-detect test.** Adds `edit_dataset_attributes.auto_detect_metadata_button` and the parameterized `metadata_input(name)`. The test waits on Auto-detect's own alert text, because the save's success alert is still showing when it clicks.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `NavigatesGalaxy` gains two helpers on a release branch: `tags_add_from_button` and `history_panel_item_add_tags`.
- `navigation.yml` gains `content_item.tag_area_button`, `content_item.tag_area_input`, `edit_dataset_attributes.metadata_input` and `edit_dataset_attributes.auto_detect_metadata_button`.
- `history_panel_add_tags` keeps its signature and behavior; its body now delegates to the shared loop.

</details>

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to tag datasets and re-detect metadata when driving Galaxy 26.2 from scripts. Alternative kept on 🌿 [`selenium_dataset_tags_auto_detect_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_dataset_tags_auto_detect_alt_original_scope) - no client change; the Auto-detect selector is the sibling `#dataset-attributes-default-save + button` instead of an id.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: two missing tests, two helper extractions and one id.</summary>

- A first evaluation recommended replacing the sibling selector with an id on the button; the second kept that scope.
- Left out: ids on the other id-less Attributes buttons (no caller yet), moving `test_pick_value_add_tags_pja` and `test_histories_list.py::add_tag` onto the new helper (unrelated files), merging it with `tagging_add` (different behavior: no toggle, no sleep between tags), and repairing the stale `edit_dataset_attributes` interface in `schema.ts`.
- Splitting into a tagging PR and an Auto-detect PR was weighed; they're independent, but each would be tiny.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve: both helper extractions remove duplication, and no shared code gains conditionals.</summary>

- A first round added the comment on why the Auto-detect step waits on its own alert text.
- Raised, not acted on: `tags_add_from_button` starts a `tags_*` prefix next to the existing `tagging_add`, and three tag-entry paths still coexist. Consolidating them touches workflow tests.
- `navigates_galaxy.py` gains about 10 lines.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added <code>@managed_history</code>, an API-derived hid in the tagging test and the <code>detected == 0</code> precondition; dropped a vitest the branch had added.</summary>

- The dropped vitest only checked that the id existed. The Auto-detect E2E test clicks the same button and checks the real result. `DatasetAttributes.test.ts` is unchanged from `release_26.2`.
- Setup and state checks use populators; the UI drives only the behavior under test.
- Without the id, the Auto-detect test fails at selector lookup rather than at its assertion. The alt branch shows its assertions hold with no client change.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings in either round.</summary>

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Changes to existing code lead as two refactor commits; the id is its own commit; the test commits only add code.</summary>

- New selectors and helpers with no caller on the base stay in their test's commit.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Users see no change. The new tests fail on named waits (`hid N to be tagged name:plus`, `comment_lines to be re-detected as 0`) or pytest equality diffs, plus the framework's screenshot and DOM dump.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check results, not markup: the input's `name:plus` tag and `metadata_comment_lines` going 0 → 3 → 0 are read through the API, and `#plus` is read off the output's rendered tags.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. Two refactors lead, then the id, then one commit per new test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Both new tests pass locally under Playwright (headless) and Selenium. The existing callers of the shared helpers (`test_history_dataset_rename`, `test_history_dataset_update_annotation_and_info`, `test_history_dataset_auto_detect_datatype`, `test_history_panel_tags_change`, `test_name_tags_display`) also pass under both. They were run on an earlier revision whose helper and test code is identical to this one.
- On push, CI runs these under Playwright; the Selenium suite runs on a schedule.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
