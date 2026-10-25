# Polish E2E tests debrief

Added a `tool_form.parameter_data_select_value` target and used it to wait out the form's default input pick and assert ours before execute, fixing an intermittent Selenium failure (commit `91a2f246e7b`).

- Selectors: all via navigation.yml already (`parameter_switch_label`, `parameter_checkbox_input`); new `parameter_data_select_value` (`.multiselect__single`) mirrors workflow-run `form_element.select_value`.
- Sleeps: none in the test or new helper.
- Screenshots: `tool_form_use_cached_job` already captured (only UI test of the switch).
- DOM decoration / client refactor: not needed; target is release_26.2.
- Not done: moving the wait into `tool_form_select_data` itself (would touch other callers' timing); a candidate follow-up on dev.
- Results: Selenium (Chrome) 5/5 pass after fix (was 2 failures in 9 before); Playwright 3/3 pass.
