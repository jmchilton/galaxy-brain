# Test challenges debrief (round 2)

No test changes: the single new E2E test holds up; no unit/API tests on the branch.

- `test_run_reuses_equivalent_job` (Playwright + Selenium green): real E2E of a switch nothing else drives from the UI; asserts outcome via job API (`copied_from_job_id` None on first, == first job on rerun), not implementation.
- Red without the feature: removing the switch click leaves `copied_from_job_id` None (verified round 1; reasoning holds).
- Uses populators (`new_dataset`, `get_job_details`, `get_history_dataset_details`); no raw HTTP to helper-ize.
- Refactored setters (`_set_boolean_value`, workflow rerun boolean) are covered by existing harness boolean cases and `test_workflow_rerun` boolean test; both rerun green this round.

Not acted on:
- `tool_form_set_use_cached_job` is a one-call wrapper over `tool_form_set_switch`; kept as a named smart helper for a fixed tool-form parameter.
- `assert checkbox.is_selected() == value` right after the label click is unwaited; label click toggles the native input synchronously, so no wait added.
