# selenium_tool_form_helpers

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_tool_form_helpers?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_tool_form_helpers)

## Status

Implemented on `dev`, head `148ec120d51`.

No PR.

CI not yet observed.

## Scope

Tool-form helpers on `NavigatesGalaxy`:
- `tool_form_fill` / `tool_form_set_parameter` move out of `RunsToolTests` (6a), and deferred conditional parameters are retried at all (6a′).
- `tool_form_parameters` describes a form's fields from the build model (6b), or a job's rerun form with `job_id` (6c).
- Filling works on a workflow editor step's form (7a), adds only the missing repeat instances (7e), and `select_set_value` picks the option equal to the value (7f).

New E2E tests: `test_workflow_editor.py::TestWorkflowEditor::test_tool_form_fill_on_editor_step` (7a) and `test_tool_form.py::TestToolForm::test_tool_form_parameters_for_rerun` (6c). 6a′, 6b, 7e and 7f carry unit tests; 6a and 6b carry E2E tests.

Red → green:
- Both new tests are green under Playwright and Selenium.
- With 7a reverted, the editor test times out waiting for `button#execute`.
- With 6c reverted, `tool_form_parameters` rejects `job_id`. The test also checks the value is the job's 42, not the tool's default of 1.
- `test_tool_form.py` passes in full under Playwright (29 tests), and the touched unit tests pass.
- Harness tests (`GALAXY_TEST_E2E_TOOL_TESTS=1`: `gx_conditional_select_1`, `gx_section_boolean_0`, `gx_repeat_data_0`) fill and run, then fail only at the final "fell back to the legacy submission path" assertion, which needs CI's tool requests plus Celery.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). A dev-only merge keeps these commits on `galaxy_ui_driver` until it restacks onto a base that has them.
