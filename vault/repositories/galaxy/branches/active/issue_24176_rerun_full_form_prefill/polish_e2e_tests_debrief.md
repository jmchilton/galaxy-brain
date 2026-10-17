I re-checked `test_workflow_rerun_prefills_expanded_form` against the polish process on the rebased head `b5c7505e1b3` and made no changes, because the round 1 polish still holds and nothing E2E-relevant has changed since.

## Details

Scope: the branch's only E2E test, `TestWorkflowRun::test_workflow_rerun_prefills_expanded_form` in `lib/galaxy_test/selenium/test_workflow_rerun.py`. The round 1 polish is commit `3b4509a3a2d` (see `earlier_drafts/1/polish_e2e_tests_debrief.md`).

### What changed since round 1
- `git diff 3b4509a3a2d..HEAD` does not touch the selenium test, `navigates_galaxy.py` or `navigation.yml`.
- The only Vue change is in `WorkflowRunForm.vue`: `withRerunValues` now comes from `model.js`. The DOM the test depends on is unchanged:
  - the `step-label` attribute in `WorkflowRunDefaultStep.vue` and `WorkflowRunInputStep.vue`
  - the "Attempt to re-use jobs with identical parameters?" field
  - `.ui-form-preview`
- `step_effective_label` only affects legacy input steps. The test's tool step `random` is labelled, so its `step-label` is the same.

### Process checklist
- **Selectors:** the test has no raw CSS/DOM selectors. It uses `workflow_run.expanded_form`, `workflow_run.job_reuse_checkbox`, `tool_form.parameter_input` and `tool_form.parameter_preview`, plus `workflow_run_expand_step`, which uses `step_header`/`step_body`.
- **Shared abstractions:** the step expand (used twice) is `workflow_run_expand_step` in `navigates_galaxy.py`, and the preview check (used twice) is `_assert_tool_parameter_preview`. Both are reusable by sibling #24177, and their names were kept stable for it.
- **Sleeps:** the branch test has none. Its waits are `wait_for_visible`/`wait_for_present`, and the step body visibility check runs after the click.
- **Screenshots:** three are captured: `workflow_rerun_expanded_form_seeded_step`, `..._seeded_workflow_parameters` and `..._seeded_workflow_parameters_step`.

### Considered, not done
- **Rerun-by-id URL:** `self.get(f"workflows/rerun?invocation_id=...")` appears twice. It is a route, not a selector, and `self.get(path)` is the normal idiom. A new helper here would be churn that could clash with #24177, so it was left as is.
- **Pre-existing code:** the other tests in this file have `sleep_for(UX_TRANSITION)` calls, and `_assert_input_table_has_parameter` uses a raw `[data-description="input table"]` selector. Neither is part of this branch, so both were left alone.

### Runs
- None. Nothing was changed, so the round 1 runs still apply: Playwright 2/2 and Selenium 1/1.
