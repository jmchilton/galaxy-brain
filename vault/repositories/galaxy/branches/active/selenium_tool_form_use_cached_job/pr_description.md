Add a missing E2E test for the tool form's "Attempt to re-use jobs with identical parameters?" switch.

From the tool form, the job cache is reachable only through this switch, and no browser test on `release_26.2` turns it on. API and integration tests (`test_tools.py`, `test_job_cache.py`) send `use_cached_job` directly, so nothing checks that the form's switch reaches the request. This adds `test_run_reuses_equivalent_job`: run `cat1` on a dataset, run it again on the same dataset with the switch on, and check through the job API that the second job was copied from the first (`copied_from_job_id`) and the first wasn't. Without the switch click the test fails at that assertion.

***It checks that the form's switch reaches the job request (the form sends `use_cached_jobs`, which `submitLegacy.js` maps to `use_cached_job`), not how the cache matches jobs; `test_job_cache.py` and the API tests cover matching.***

![Tool form with the re-use switch on](screenshots/tool_form_use_cached_job.png)

***This is test code only - no client or server change. It targets `release_26.2` because missing tests are bugs.***

The new `tool_form_set_switch(parameter, value)` helper clicks the switch's visible label and asserts the result. ***The two existing boolean setters (`RunsToolTests._set_boolean_value` for tool-test harness cases and the workflow rerun test's toggle) now use it too, so they click the label a user clicks instead of JS-clicking the hidden `<input>`. Harness cases set the same values as before, but now fail with a message if a switch doesn't take, where the JS click passed silently.***

<details><summary>Details</summary>

- `NavigatesGalaxy.tool_form_set_switch` reads `tool_form.parameter_checkbox_input`, clicks the new `tool_form.parameter_switch_label` (`.custom-control-label`) if the state differs, and asserts the new state. `tool_form_set_use_cached_job` wraps it for this switch.
- The existing `tool_form.parameter_checkbox` target matches `.ui-switch`, which `FormBoolean` doesn't render, so the label needed a new target.
- The test waits for the form's default dataset pick (new `tool_form.parameter_data_select_value`) before picking `reuse_input.txt`. Otherwise the default could land after our pick and the second run would use hid 2, which isn't an equivalent job.
- The refactor is its own leading commit; the test follows.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It changes test code and `navigation.yml` selectors only.

## Context

Split out of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which drives Galaxy through GTN FAQ scenarios (here "re-use equivalent jobs"). Alternative kept on 🌿[`selenium_tool_form_use_cached_job_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_tool_form_use_cached_job_alt_original_scope) - the test and helper only, leaving the two existing boolean setters on their JS clicks. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope as implemented (after expanding to fold in the existing boolean setters).</summary>

- Round 1 expanded the branch so the existing hidden-input JS-click setters use the new helper instead of leaving three ways to set a switch.
- Migrating `test_workflow_editor.py`'s `.ui-switch` `parameter_checkbox` clicks was rejected: different component, unrelated churn.
- Porting the driver's `tool-run --reuse` was rejected: driver tooling is dev-only.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>No changes; the test asserts the outcome through the job API and goes red without the switch click.</summary>

- One E2E test, no unit/API tests to challenge; setup uses `dataset_populator`.
- A Selenium flake (default dataset pick landing after ours, 3 of 9 runs) was fixed by waiting for the default pick first.
- The refactored setters are covered by the existing harness boolean cases and `test_workflow_rerun` boolean test, rerun green.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Static review of the full diff plus the navigation components, Playwright/Selenium element wrappers, `FormBoolean`/`FormElement`/`ToolForm` and the bootstrap custom-forms SCSS.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Split refactor-first: the helper and its use by existing setters, then the new test.</summary>

The refactor commit is behavior-preserving for the harness boolean cases and the workflow rerun test, both rerun green under Playwright and Selenium.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing - test-only; failures show the job API values, a Galaxy wait timeout, or "switch '<name>' not set to <value> after clicking its label".
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. E2E only; it checks `copied_from_job_id` through the job API, not the DOM.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The refactor commit leads; existing tests cover it.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_tool_form.py::TestLoggedInToolForm::test_run_reuses_equivalent_job` passes under Playwright and Selenium locally; red under Playwright with the switch call removed.
- Harness boolean cases (`GALAXY_TEST_E2E_TOOL_TESTS=1`) and `test_workflow_rerun.py` pass under Playwright and Selenium with the shared helper.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
