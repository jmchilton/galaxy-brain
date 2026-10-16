# Screenshot debrief

Screenshots successfully obtained.

Both were taken at HEAD `dbd2a8d4a85` under Playwright (headless), through the shared E2E lock. No Galaxy code or test changes were needed. Files are in `screenshots/`, which is gitignored.

## Index

| File | Source test | Shows |
|------|-------------|-------|
| `screenshots/workflow_rerun_keeps_tool_step_parameters.png` | `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_keeps_tool_step_parameters` (new; screenshot `workflow_rerun_keeps_tool_step_parameters`) | Rerun of a run that set `num_lines` = 3 at runtime. It lands in the expanded (legacy) form, and the orange alert reads "This is the legacy workflow run form. The original run set tool step parameters. The simplified form does not support these, so they would be lost." There is no **Simple Form** toggle. Step "2: random" is expanded and shows "Randomly select 3 lines". |
| `screenshots/workflow_rerun_simple_form_no_step_params.png` | `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun` (existing; screenshot `workflow_rerun_ready`) | Contrast/regression check: the original run (cat-twice, no runtime step params) was submitted from the simple form. Its rerun still opens the simplified form with the original input preselected (`1: 1.fasta`) and shows no alert, so the new guard does not over-trigger. |

## Runs

- `test_workflow_rerun_keeps_tool_step_parameters`: reused the coordinator's capture from HEAD (`...-2.png` in the scratchpad), so it was not re-run. It passed.
- `test_workflow_rerun`: 1 passed in 76s.

## Not captured

- **Simple-form object store prefill:** the controls only render when object store selection is configured (a multi-backend object store plus a user preference). The stock dev config does not have that, and setting it up would mean an integration-selenium config. That is out of proportion for this branch. The vitest `WorkflowRunFormSimple.test.ts` covers the payload.
- **Simple-form workflow-param prefill from `replacement_params`:** a UI-origin run can't reach this, because simple-form runs never record `replacement_params` (the `replacement_dict` bug, issue footnote ¹). It would need an API-origin invocation, and even then it has no effect on what is submitted. Vitest covers it.
- **Other existing rerun tests** (`test_workflow_rerun_preserves_false_boolean_parameter`, `test_workflow_rerun_with_unset_optional_data_input`): they show the same simple-form-rerun path as the contrast shot and add nothing for this change. Not re-run.

## Update after final rebase and E2E fold (head `1d8829ef22d`, on #24176 `8141bfccf87`)

- `screenshots/workflow_rerun_keeps_tool_step_parameters_final.png`: #24176's `workflow_rerun_expanded_form_seeded_step` capture at final HEAD. The test now carries #24177's assertions. It shows the reason alert, no Simple Form toggle, and the expanded random step with the seeded `3`. The earlier `workflow_rerun_keeps_tool_step_parameters.png` is kept for reference.
