# Initial implementation debrief

Ported `test_run_reuses_equivalent_job` from `galaxy_ui_driver` `fff4be834ab` to `release_26.2` as `5ac6ef35921` (+30 lines, 3 files).

- `tool_form_fill` is dev-only (#24331), so input is picked with `tool_form_select_data("input1", "reuse_input.txt")`. Explicit pick is required: on the second run the default would be hid 2, which isn't an equivalent job.
- `_set_boolean_value` is on `RunsToolTests` on 26.2 and JS-clicks a hidden input. New `NavigatesGalaxy.tool_form_set_use_cached_job` reads `parameter_checkbox_input` state and clicks the visible label via new `tool_form.parameter_switch_label` (existing `parameter_checkbox` targets `.ui-switch`, which `FormBoolean` doesn't render).
- Screenshot `tool_form_use_cached_job` with the switch on; only UI test of this switch.
- Verified: green on Playwright and Selenium (Chrome); red on Playwright with the switch call removed (`copied_from_job_id` None).
- Not ported: gxui `tool-run --reuse` (driver tooling, not on 26.2).
