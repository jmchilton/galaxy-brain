# Rescope review — workflow_editor_run_cancel

**Fixed two small things. No blockers. One decision is still open for John: the fixture-key fix (`image_input_1` -> `image_input`).**

The fixes:
- `workflow_run_setup_inputs` now raises on non-data test_data instead of skipping it, which REVIEW_FOCUS asks for with input that never worked. Before this change, the old `value.pop("hid")` crashed on raw values, so no caller can depend on them, and none of the 6 callers' test_data has `type: raw`. The fix also removes the dead `else: continue`, because `ds_entry` only returns hda or hdca. It drops the `.get("id")` that could pass `None` to `__history_content_id`, which then falls back to resolving a different item. It also types `inputs`. This was folded into "Select File inputs in workflow_run_setup_inputs".
- The `workflow_run_specify_inputs` docstring now says "dataset or collection". This was folded into "Let workflow_run_specify_inputs fill the simplified run form".

The autosquash rebased from `65132d40dac`, so every commit SHA changed. New head: `6b83ea97e49`. The alt branch `workflow_editor_run_cancel_alt_original_scope` (`e858d2a07d8`) no longer shares commits with the parent. Its content differs only by the docstring.

All 7 affected tests passed under Playwright (headless, Vite on 5173), run one at a time: `test_execution_with_multiple_integer_parameter`, `test_execution_with_custom_invocation_report`, `test_execution_with_images_in_report`, `test_execution_with_multiple_inputs`, `test_execution_with_rules`, `test_execution_with_null_optional_select_from_data` and `test_run_from_editor_and_cancel`. black, ruff, flake8 and pre-commit pass. mypy, run from `lib/`, reports nothing in the two touched modules.

## Not acted on

- **Fixture key `image_input_1` -> `image_input` (`0cd95541b31`)** needs John's OK because it changes test data. I agree with the change. The workflow's only input is `image_input`, and the API sibling test uses the same key. The old key never matched; the test passed only because File data was dropped. `galaxy_ui_driver` still has `image_input_1`, so the restack has to pick this fix up.
- **`"{hid}: "` prefix collision** (`1: ` also matches `11: `). It's latent. `@managed_history` keeps hids low in every caller.
- **No decoy-style assertion on the expanded-form path.** The `input_data_div` selector is unchanged by this branch. It was already exercised by the string and collection callers, and `test_execution_with_rules` checks its output. The new File selection is pinned by the decoy assertion in `test_execution_with_multiple_integer_parameter`, which ran red then green.
- **TypedDict for `{src, id, hid}`.** It's polish; `dict[str, dict[str, Any]]` is enough for test helpers.
- **Selenium reruns.** I didn't rerun any tests under Selenium, because no Playwright test failed. The rescope run covered 2 of the 6 callers under Selenium, and my change doesn't touch browser-side code.
- **Auto-expanded workflows race.** A workflow that the UI expands by itself could render `#run-workflow` before `.workflow-expanded-form`, and then `workflow_run_specify_inputs` would pick the simplified selector. No current caller with inputs hits this; `ensure_expanded` waits for `expanded_form` to be visible. Noted only.
- Scope C (shared form-mode helper), scope D (canvas wait) and the multiselect left open by `select_set_value` stay deferred, as the scope evaluation recommended.

<details>
<summary>Full review</summary>

### Scope-expansion commits

- **Fixture key fix.** Correct. `WORKFLOW_WITH_IMAGES_IN_REPORT` declares `image_input: data`, and only the selenium test imports `WORKFLOW_WITH_IMAGES_IN_REPORT_TEST_DATA`. Ordering it before the helper fix keeps bisect green.
- **`workflow_run_setup_inputs` from `label_map`.** Right source: `load_data_dict` puts `type: File` and `Directory` only in `label_map`, while collections, plain strings and raw values go in both. The returned shape narrows from the full hda/hdca dicts to `{src, id, hid}`. All callers read only `hid`, plus the new `id` assertion, so nothing breaks.
  - The silent `continue`s are the problem fixed above.
  - `get_history_dataset_details` runs before `wait_for_history`. That ordering is the same as before the branch, for plain-string hdas, and it is fine because only `hid` is read.
- **`value["hid"]` instead of `pop`.** This fixes the argument mutation flagged by thermo. Good.
- **Decoy in `test_execution_with_multiple_integer_parameter`.** It strengthens the test, it doesn't weaken it. It's red on the old helper and green after the fix. Hids are 1 (input) and 2 (decoy), so there is no prefix collision.

### Whole branch

- **4b, form-mode branch in `workflow_run_specify_inputs`.** `is_absent` is an instant `len(find_elements) == 0` check on both backends (`has_driver.py`, `has_playwright_driver.py`), not a wait. It comes after `run_workflow.wait_for_visible()`, and `workflow_run_ensure_expanded` waits for `expanded_form` to be visible. Simplified mode uses `input_select_field` (`data-label`) and expanded mode uses `input_data_div` (`step-label`). The comment explains why the expanded form can't use `data-label`.
- **7h, Run activity.** `workflow_editor_click_run` is used only by the new test. The selector `#activity-workflow-run` was added to `navigation.yml`, and this is consistent with the other `tool_bar` activities.
- **7j, `invocations.cancel_button`.** Named selector; fine. `schema.ts` lags `navigation.yml` already, so I didn't act on it.
- **`test_run_from_editor_and_cancel`.**
  - It covers the API and the UI, and its preselection decoy makes it red without 4b.
  - The waits are justified with comments: the step summary load, the async cancel, and the 3s poll.
  - `[invocation_summary] = ...` runs after the cancel button is visible, so the invocation exists.

### Release-branch suitability

All the changes are test code, test fixtures or `navigation.yml` selectors. Nothing changes at runtime. This fits `release_26.2`.

### Sibling independence

`git merge-tree` is clean pairwise against `workflow_open_exact_title` (`b9c9894b63c`) and `workflow_editor_second_subworkflow` (`e1348b9f213`), and between the two siblings. Neither sibling touches `framework.py` or `workflow_fixtures.py`.

### REVIEW_FOCUS items

- Imports stay at the top of the module.
- No obvious comments were added.
- No tests were weakened.
- No trivial unit tests were added; E2E is the right level for these helpers.
- The typing gain is the `inputs` annotation.

</details>
