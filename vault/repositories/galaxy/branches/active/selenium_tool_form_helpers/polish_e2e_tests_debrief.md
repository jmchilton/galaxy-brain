# Polish E2E tests: selenium_tool_form_helpers

Replaced the raw repeat-instance selector with a navigation.yml target, swapped two helper sleeps for waits, and commented the sleeps that have nothing to wait on.

Polished head `5ffd1630708`. New head is `78210ddb6d0`, one commit on top.

## Commit

- `78210ddb6d0` Wait on tool form repeat instances and tag removal instead of sleeping
  - `navigation.yml`: new `tool_form.repeat_instance_parameter: 'div.ui-form-element[id^="form-element-${name}_${index}|"]'`.
  - `_add_repeat_instances` counts the rendered instances with that target instead of `find_elements_by_selector(f'[id^=...]')`. After each insert click it waits for the new instance's parameters, where it used to sleep `UX_RENDER`.
  - `_clear_multiselect_tags` waits until the tag count drops after each click, where it used to sleep.
  - `select_set_value`: the option selector that 7f duplicated is now one local `option_selector`.
  - Comments on the sleeps that stay. After each `tool_form_set_parameter`, and before the deferred retry, nothing signals which parameters a conditional reveals, and a parameter that never appears has no element to wait for. Expanding a section has no per-section target. After typing in a multiselect, the old options stay present while the list filters.

## Checked, no change

- The test bodies already use components (`parameter_div`, `parameter_checkbox_input`, `parameter_input`, `workflow_editor.node`, `workflows.edit_button`). They have no raw selectors and no sleeps.
- No new shared abstraction was needed. The repeated pieces are already helpers: `tool_form_fill`, `tool_form_parameters`, and `dataset_populator`.
- Screenshots: the new tests join `test_tool_form.py` and `test_workflow_editor.py`, which already capture many. They aren't the only tests over either component, so I added none.
- `select_set_value` still uses raw CSS relative to its container element. That code predates the branch, and navigation.yml has no generic multiselect component to hang it on.

## Test runs

All runs used Vite on 5173, backed by the other session's 8080. No server was started or stopped.

- Playwright, all pass: `test_tool_form_fill_counts_rendered_repeat_instances`, `test_tool_form_fill_by_parameter_path`, `test_tool_form_parameters_match_form`, `test_tool_form_parameters_for_rerun`, and `test_workflow_editor.py::test_tool_form_fill_on_editor_step`.
- Selenium, all pass: `test_tool_form_fill_counts_rendered_repeat_instances` and `test_tool_form_fill_by_parameter_path`. This needed the chromedriver that matches Chrome 155 on `PATH`; the 149 driver fails at session creation.
- Harness (`GALAXY_TEST_E2E_TOOL_TESTS=1`, `GALAXY_TEST_TOOL_FORM_TESTS`):
  - `multi_data_param_0` under both backends. A temporary trace, since removed, showed the tag-clear wait running for `f1` and `f2`.
  - `multi_repeats_0` under Playwright.
  - All of them filled and ran. They failed only at the known final "fell back to the legacy submission path" assertion, which needs CI's tool requests plus Celery.
- `pytest test/unit/selenium/test_tool_form_parameters.py test/unit/selenium/test_select_set_value.py`: 5 passed. Pre-commit (black, ruff, flake8, prettier) is clean.
