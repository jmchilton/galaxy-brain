Add missing E2E tests for a tool form data field's accepted formats list and for assigning interval columns on a dataset's Attributes tab, with shared helpers to read and set any Galaxy form field.

Two everyday UI paths had no E2E test on `release_26.2`, and the form field helpers the tool test harness needs to set values had no way to read one back:

| UI path | What a user does | Checked before | Checked now |
| --- | --- | --- | --- |
| Tool form data field (`FormDataExtensions`) | clicks the formats button to see which datatypes the input accepts | nothing | the list shows exactly the tool's declared formats (`csv`, `tabular` for `column_param`) |
| Dataset Attributes tab | reassigns an interval dataset's chrom/start/end/name columns and saves | nothing | chrom/start/end defaults shown, success alert, stored metadata via the API, and the new values after reopening the form |
| Any `FormDisplay` form field | sets a boolean, number, checkbox or dropdown select, color or drill-down | only that the tool test harness could set them | each value reads back as set (`test_form_element_values`) |

***These test existing behavior, not a fix: they pass on `release_26.2`, and the only non-test changes are `data-*` attributes on `FormDataExtensions.vue` and `FormElement.vue`. It targets `release_26.2` because missing tests are bugs.***

<details><summary>Details</summary>

- `tool_form_accepted_formats(parameter)` opens the formats list and returns the datatypes shown; it reads new `data-description` hooks (`accepted formats button`, `accepted format`) on both the popover and collapse variants, instead of a generated-id sibling selector.
- `FormElement`'s `.ui-form-field` gains `data-name`, `data-type` and `data-display` next to its existing `data-label`, so a test can tell a field's kind from the DOM instead of guessing from which inputs are present.
- The tool test harness's value setters move from `framework.py` (`_detect_param_type` and five `_set_*_value` methods) into `NavigatesGalaxy.form_element_set_value(name, value)`, joined by a new `form_element_value(name)` reader. Both reuse the `tool_form.parameter_*` selectors (plus a new `parameter_field`), which match any `FormElement`, not just the tool form. The harness keeps only its test-specific skips.
- `edit_dataset_attribute_fields()` returns the Attributes tab's visible fields as `FormField(name, label, value)` straight from those hooks; the interval test sets columns with `form_element_set_value`.
- The interval test goes red if the Save click is removed (stored metadata unchanged).
- `comment_lines` is not asserted: saving the form turns its `0` into blank, which is fixed separately.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds `data-*` attributes and test code only; the moved harness setters keep their behavior and are covered by the Tool form harness job.

## Context

Split out of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which uses these helpers to drive Galaxy's UI. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope: two small missing-test additions, no fix folded in.</summary>

- Folding in the `comment_lines` 0→blank fix was rejected: it is fixed on another branch.
- Covering more metadata kinds (bed `strandCol`, tabular `column_names`) adds no new behavior class; better as follow-up.
- Splitting the two tests into separate PRs is overhead with no gain.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression at <code>222a113f31d</code>; the later form helper refactor came from John's review.</summary>

- Selectors use `data-description` hooks or the tab's existing `aria-labelledby` scoping.
- `edit_dataset_attribute_fields` keeps its label in the tuple, since a downstream caller uses it.
- Tests have no sleeps, assert exact equality and set up through populators.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Both tests kept; assertions are exact and the interval test fails without Save.</summary>

- E2E is the right layer: popover/collapse rendering and the Attributes form round trip.
- No OR or subset checks; accepted formats compared as a sorted exact list.
- Both pass on Playwright and Selenium, run one at a time.
- `test_form_element_values` (added after this check) also passes on both; the moved setters pass the harness's boolean, color, select, checkbox and drill-down cases.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings at <code>222a113f31d</code>, before the form helper refactor.</summary>

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The form helper refactor is its own commit, ahead of the interval test that uses it.</summary>

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing - test-only for users; a regression fails the E2E on an exact-equality assertion showing the formats or column values, with screenshots of the formats list and edited Attributes form.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. E2E only; the interval test checks stored metadata through the API.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The whole PR is baseline tests; the helper refactor precedes the interval test that uses it.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_tool_form.py::TestToolForm::test_data_parameter_accepted_formats`
- `lib/galaxy_test/selenium/test_tool_form.py::TestToolForm::test_form_element_values`
- `lib/galaxy_test/selenium/test_tool_form_harness.py` (moved setters)
- `lib/galaxy_test/selenium/test_dataset.py::TestDataset::test_history_dataset_assign_interval_columns`

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
