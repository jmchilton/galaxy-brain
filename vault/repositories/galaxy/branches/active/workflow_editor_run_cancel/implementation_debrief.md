# Implementation debrief — workflow_editor_run_cancel

Base `release_26.2` (`65132d40dac`). Commits cherry-picked from `galaxy_ui_driver` with no conflicts, then the test:

1. `6b639d732b9` Let workflow_run_specify_inputs fill the simplified run form (4b)
2. `7078f4c023a` Click the editor's Run activity in workflow_editor_click_run (7h)
3. `831de3dd1a8` Name the invocation page's Cancel button in navigation.yml (7j)
4. `4a0abaaaa0f` Test running a workflow from the editor and cancelling it

## Test

`test_workflow_run.py::TestWorkflowRun::test_run_from_editor_and_cancel`. It uploads two datasets and a one-input workflow with a `cat_data_and_sleep` step (300 s), opens the workflow in the editor and clicks Run. It selects the older dataset in the simplified form, submits, and clicks Cancel on the invocation page. It then asserts the invocation is `cancelled` and that its input is the selected dataset.

## Red → green (local, Vite 5173)

- Green on the branch under both Playwright and Selenium.
- 4b reverted: times out on `[step-label='input1'] .multiselect`. The simplified form has no `step-label`.
- 7h reverted: times out on `#workflow-run-button`.
- 7j: without it the test can't name `invocations.cancel_button`.

## Finding (follow-up, not fixed here)

`workflow_run_setup_inputs` puts `type: File` test data only in `load_data_dict`'s `label_map`, never in `inputs`. Existing callers of `workflow_run_specify_inputs` (e.g. `workflow_run_and_submit`) therefore select nothing. They pass only because the run form preselects the newest dataset. That is why 4b's bug went unnoticed. The first draft of this test fell into the same trap and passed with 4b reverted. The test now builds its `{label: {"hid": ...}}` dict directly.
