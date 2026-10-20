# Scope evaluation — workflow_editor_run_cancel

**Recommendation: modest expansion. Fold the `workflow_run_setup_inputs` / `label_map` fix into this branch so that existing `workflow_run_specify_inputs` callers really select their `type: File` inputs, and stop `workflow_run_specify_inputs` mutating its argument. Keep everything else as implemented. The shared "form mode" helper and the canvas wait in `workflow_index_open_with_name` stay deferred.**

The branch is about 60 lines, so there is no decomposition section. It is under the 100-line threshold.

Reviewed `65132d40dac..workflow_editor_run_cancel` (head `2645a2f7476`, 4 commits: 4b, 7h, 7j, test). Inputs: the branch notes (initial, test challenges, polish, codex, thermo, baseline), the [upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md), and the sibling branches `workflow_open_exact_title` and `workflow_editor_second_subworkflow`.

## Scope items raised by earlier reviews

| Source | Item | Disposition here |
|---|---|---|
| initial debrief, test challenges, plan "Follow-up" | `workflow_run_setup_inputs` drops `type: File` inputs, so callers select nothing | **Expand** (scope B) |
| thermo | `value.pop("hid")` mutates the caller's dict (predates the branch) | **Expand** with B. It is the same function as the 4b fix, so it's one line. |
| thermo, baseline | Shared "form mode" helper for `workflow_run_ensure_expanded` / `workflow_run_specify_inputs` | Defer (scope C) |
| polish | `workflow_index_open_with_name` doesn't wait for the editor canvas | Defer (scope D) |
| polish | Multiselect dropdown left open after `select_set_value` | Defer. `select_set_value` belongs to the tool-form area PR (gxui `a68deb35cc6`). |
| thermo | `schema.ts` lacks `tool_bar.run` / `invocations.cancel_button` | No change. `schema.ts` already lags `navigation.yml`. |

## A. As implemented

This scope adds an E2E test: run a workflow from the editor's Run activity, pick a non-default dataset in the simplified form, cancel, then assert the cancel through the API and in the UI. It also brings the three fixes the test needs: 4b (simplified-form selector in `workflow_run_specify_inputs`), 7h (the Run activity in `workflow_editor_click_run`) and 7j (the `invocations.cancel_button` selector).

| Pros | Cons |
|---|---|
| Matches the plan's coverage-PR carve-up exactly (4b, 7h, 7j). The test is red without each fix. | It leaves the known bug that hid 4b: 3 existing callers (`type: File` inputs) still select nothing and pass only on the form's preselection. |
| Small, and independent of its siblings. | A reviewer reading the 4b fix will ask why `workflow_run_and_submit` callers still don't exercise it. |
| Green under both backends. Reviewed by codex and thermo. | The helper still mutates its input (`value.pop("hid")`). |

## B. Modest expansion: make existing callers really select their inputs (recommended)

Change `workflow_run_setup_inputs` (`lib/galaxy_test/selenium/framework.py`) to build its returned dict from `load_data_dict`'s `label_map`, not `inputs`. That covers `type: File`, `Directory`, collections and plain strings. Keep only the `src: hda/hdca` entries, with their `hid` added, and skip `raw` scalars. `workflow_run_specify_inputs` then reads `value["hid"]` instead of popping it. Add an assertion to at least one affected caller that checks the invocation's inputs against the setup ids.

| Pros | Cons |
|---|---|
| Fixes the bug that hid 4b. This is a related bug in the code path the branch touches, which the guidance says to fold in. | The returned dict changes for every caller, so 6 existing E2E tests must be rerun one at a time, under both backends ideally: `test_execution_with_multiple_integer_parameter`, `test_execution_with_custom_invocation_report` and `test_execution_with_images_in_report` (newly selecting), plus `test_execution_with_multiple_inputs` (plain strings, already selected), `test_execution_with_rules` (a collection, already selected) and `test_execution_with_null_optional_select_from_data` (no test data). |
| After the change, 4b's expanded-form path (`input_data_div`) is really exercised by `ensure_expanded=True` callers, not only the simplified path by the new test. | Selecting by hid can surface latent problems. For example, `select_set_value` does a substring match on `"{hid}: "`, so hid 1 can match `11: ...`. These tests have few datasets, so it is unlikely to show up. gxui's `a68deb35cc6` doesn't help: it clicks only an option exactly equal to the value, and `"{hid}: "` never equals a full label. If the problem shows up, it needs its own fix. |
| `framework.py` is untouched by both siblings and by gxui's `galaxy.selenium` lift (`50ac1760a58` doesn't move `workflow_run_setup_inputs`), so it adds no conflict risk. | The branch grows by about 15 to 25 lines and becomes "test + harness fix" rather than a pure cherry-pick. The `galaxy_ui_driver` restack must account for the new commit. |
| Removes an open follow-up from the plan doc rather than parking it. | |

<details>
<summary>Details</summary>

- `load_data_dict` (`populators.py:4391`) puts `type: File`/`Directory` only in `label_map`. Collections, `raw` values and plain strings go into both. `workflow_run_setup_inputs` discards `label_map` (`inputs, _, _ = ...`).
- Affected fixtures: `WORKFLOW_WITH_CUSTOM_REPORT_1_TEST_DATA` (two `File` inputs + a list), `WORKFLOW_WITH_IMAGES_IN_REPORT_TEST_DATA` (a `File`), and the inline `File` in `test_execution_with_multiple_integer_parameter`. These pass today because preselection plus extension filtering happens to pick the right dataset. `WORKFLOW_WITH_DYNAMIC_OUTPUT_COLLECTION` (plain strings) and `WORKFLOW_WITH_RULES_1` (a collection) are already selected.
- `raw` values in `inputs` would crash `value.pop("hid")` today if any caller passed them. B's filter makes the contract explicit: data inputs only.
- Red to green: the cleanest red is an assertion on an existing caller's invocation inputs. If preselection happens to choose correctly, that assertion may pass before the fix. In that case, add a second, newer, same-extension dataset to the inline `multiple_integer_parameter` setup (the pattern this branch's test uses) so the fix is observable.
- Keep it as its own commit after 4b ("Select type: File test data in workflow_run_setup_inputs") so it can be dropped or split if a reviewer objects.

</details>

## C. Expansion: shared "form mode" helper

Extract the repeated "wait for `run_workflow`, branch on `expanded_form.is_absent`" check from `workflow_run_ensure_expanded` and `workflow_run_specify_inputs` into one helper (e.g. `workflow_run_is_simplified()`).

| Pros | Cons |
|---|---|
| Removes a small duplication that thermo flagged. | It's a refactor, not a use case or bug. Two call sites of a two-line check is a weak case for an abstraction. |
| It would give a natural place for later form-mode logic. | `navigates_galaxy.py` hunks are adjacent to the siblings' hunks: `workflow_open_exact_title` touches about line 1954, next to `specify_inputs` at 1963, and `workflow_editor_second_subworkflow` touches about line 1437, next to `click_run` at 1432. More churn here makes the restacks worse. |

## D. Expansion: editor-canvas wait in `workflow_index_open_with_name`

Move the test's `canvas_body.wait_for_visible()` into the helper.

| Pros | Cons |
|---|---|
| Removes one line of test boilerplate. | `workflow_open_exact_title` rewrites `workflow_index_open_with_name` (7g). This belongs there, or after it lands. |
| | No other caller needs it today. |

## E. Contraction: helpers only, or drop 4b

Land 7h and 7j (and maybe 4b) without the E2E test, or drop 4b and test only editor Run + Cancel through the expanded form.

| Pros | Cons |
|---|---|
| Smaller. | It breaks the plan's rule that a fix lands with a test that uses it, and it loses the release-branch "missing test" framing. |
| | Dropping 4b leaves the simplified form untestable by `workflow_run_specify_inputs`, and the simplified form is the default UI path. |

## Unresolved questions

- Should B's red step add a second same-extension dataset to an existing test, or is an invocation-inputs assertion that may already pass enough?
- If B surfaces the `"{hid}: "` substring-match issue (`1: ` matches `11: `), should we fix the hid selection in `workflow_run_specify_inputs` here, or work around it in the test data?
