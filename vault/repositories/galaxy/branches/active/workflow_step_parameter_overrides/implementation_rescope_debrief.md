# Re-scope debrief: workflow_step_parameter_overrides

Coordinated by Claude Opus 5.5. The re-scope and its review ran via Claude Opus at high effort.

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended keeping the scope and adding a modest expansion. That expansion closes two gaps that #24454 itself names. The original scope is kept as [alts/original_scope.md](alts/original_scope.md) (`workflow_step_parameter_overrides_alt_original_scope`, `20c7b0feaea`).

## What was added

- **Server errors on their cards.**
  - Validation 400s for override values now show on the card they belong to.
  - Inner subworkflow steps were already validated on submit, but their `err_data` was keyed by the inner step's index alone. It could collide with a top-level step that has the same index.
  - API commit 1 now nests inner errors under the subworkflow step, one level per subworkflow, to match the overrides.
  - This also changes the shape legacy `parameters` callers get. A new bottom commit, "Baseline tests for subworkflow step parameter value errors", pins the old shape, and API commit 1 updates it.
  - Errors with no card stay in the submission alert, with picker labels: conditional test parameters, repeat- or step-level errors, unknown keys, and non-indexed `err_data`.
- **Legacy-rerun alert.** It now reads "The original run didn't record which tool step parameters were chosen, so the full form is shown."
  - The text lives in the parent stack's `WorkflowRunForm.vue`.
  - #24177's `test_workflow_rerun.py` asserts it, so both change in this branch's picker commit. Expect a one-line conflict if #24177 touches that test.
- **Tests.**
  - `stepParameterErrors.test.ts`, plus card and form vitest cases.
  - E2E `test_server_errors_land_on_their_cards`, with an error one subworkflow deep.
  - API assertions for both error shapes.
  - The baseline test.

## Review

The [re-scope implementation](subagents/rescope_implementation.md) and [normal review](subagents/rescope_normal_review.md) found the `modules.py` nesting safe. Only the expanded form reads invocation `err_data`, and it never placed inner errors anyway. The review added the baseline commit and fixed a stale code comment.

## For the PR description

- The `err_data` shape change for inner-step errors.
- The #24177 alert rewording.

## Commits after the re-scope

The branch is 9 commits over `46db8f9d5b6`:

1. Baseline tests
2. Refactor
3. API 1
4. API 2
5. API 3
6. Picker
7. Workflow view
8. Rerun with this changed
9. E2E

The extraction branch `workflow_step_parameter_overrides_api` carries the baseline, the refactor and the API series on `origin/dev`.

## Tests

- **API**: 70 on the branch, 61 on the extraction branch (excluding the known gxformat2-pin failures).
- **vitest**: 40 files, 259 tests.
- **E2E**: 10/10, plus #24177's prefill rerun test.

## Next

First-round hardening debriefs moved to [earlier_drafts/1/](earlier_drafts/1/). The full hardening runs again fresh.
