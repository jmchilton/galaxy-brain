# Implementation debrief

**STATUS: READY.** Head is `8141bfccf87`, pushed to `jmchilton/issue_24176_rerun_full_form_prefill`. It is stacked on `issue_24178_subworkflow_step_params_export` at its final tip `5cf81e75c12`; `dev` is at 88127f42979. Scope: keep as implemented ([scope_evaluation.md](scope_evaluation.md)).

## What it does

Rerunning an invocation that ends up in the expanded run form now starts from what the original run used, not from the workflow's saved defaults.

- **Server.** `GET /api/workflows/{id}/download?style=run&invocation_id=…` seeds the run form. The invocation is loaded with the ownership check, so another user gets a 403. Seeding happens only for `style=run` and only when the invocation ran this workflow version.
  - **Tool steps.** State is recomputed through `compute_runtime_state(step, step_args=…)`, the same `check_param` path the original request took.
    - Inputs saved as `${name}` templates keep the template, and connected inputs are skipped (`_seedable_step_args`).
    - Recorded values that no longer validate, such as a purged dataset, are dropped. If the rest still fail, the step falls back to its saved state.
  - **Subworkflow steps.** Run-time inputs get the recorded values, re-keyed by inner order index.
  - **`WorkflowInvocation.recover_step_parameters()`** returns `{step_id: params}`, with subworkflow params keyed by index. It skips malformed rows and rows naming unknown steps, such as imported invocations from before #24175, so the run form always loads.
- **Client.**
  - `WorkflowRerun` passes the request export and invocation id. `getRunData` sends `invocation_id`.
  - `WorkflowRunForm` prefills input steps, workflow parameters, resource parameters and job re-use.
  - The simple form's rerun input lookup now lives in a shared `rerunInputValue` in `model.js`.
  - A guard, `rerunHasStepParameters(request)`, opens the expanded form whenever the export carries tool step parameters. This was the coordinator's decision so the branch doesn't regress on its own: seeding closes `RuntimeValue` inputs, which would otherwise let such reruns fall into the simple form, and that form drops `parameters`.

## Decisions

- **Server seeding, as in the issue's Proposed Approach.** The client-side merge of the export stays open as a reviewer question.
- **Out of scope:**
  - Object stores in the expanded form.
  - The latent `param_map` keyed-by-id bug, which is noted but not fixed.
  - The explanatory message, hiding the simple-form toggle and the simple-form prefill. These belong to #24177, which builds on `rerunHasStepParameters`.
- **E2E test kept here.** `TestWorkflowRun::test_workflow_rerun_prefills_expanded_form` gives this branch end-to-end coverage. It came with new nav targets `workflow_run.step_header`/`step_body`/`job_reuse_checkbox` and `tool_form.parameter_preview`, plus a shared `workflow_run_expand_step`. #24177's planned rerun test should extend it rather than duplicate it.

## Overlap with #24175 (sibling)

#24175 adds `WorkflowRequestInputParameter.resolve_step_parameters()`, which returns `(step, params_by_index)` or `None` for an unknown step and raises `ValueError` for a malformed row. The export and `/request` code now use it. `recover_step_parameters()` was reshaped to the same output, with subworkflow params keyed by index and unknown or malformed rows skipped.

Whichever branch lands second should make `recover_step_parameters()` loop over `parameter.resolve_step_parameters()`: skip `None` and `ValueError`, then key by `step.id`. This branch did not restack onto #24175 or touch the export.

## Process

- [Initial implementation debrief](initial_implementation_debrief.md), which includes the normal review.
- [Test challenges](test_challenges_debrief.md)
- [E2E polish](polish_e2e_tests_debrief.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [Scope evaluation](scope_evaluation.md)
- [Screenshots](screenshot_debrief.md), stored locally in `screenshots/`.

The normal review raised a security concern, which went to a private report. Per policy there is no review debrief file.

## Tests

- **API.** 8 `test_run_form_seed*` tests cover:
  - a tool step and a conditional case switch,
  - the `${}` guard,
  - a subworkflow step,
  - a seeded dataset, then the same one purged,
  - an imported invocation,
  - another user (403).

  All 7 of the original API tests (all but the imported-invocation test) were written before the fix, and every guard was shown to be load-bearing by disabling it. With the parent's tests and the related run-form and replacement tests included, 20 pass.
- **Vitest.** `Workflow/Run` passes 74 tests, and vue-tsc is clean.
- **E2E.** 3 of 3 runs pass (Playwright ×2, Selenium ×1).
- **Lint.** black, isort, ruff 0.17.0 and mypy (run from `lib/`) report no new errors.

## Follow-ups (not this branch)

- Legacy input steps without a label but with a `tool_inputs["name"]` aren't prefilled, because `/request` keys them by `effective_label`. This is pre-existing in the simple form ([codex_review.md](codex_review.md)).
- Consolidate STEP_PARAMETERS parsing in `services/invocations.py` and `run_request.py` after the stack lands.
- Seeded subworkflow values don't go through `check_param`. That would need a value plumbed into `InputProxy.to_dict`.
- In #24177, collapse `WorkflowRerun`'s prop slices into `rerunRequest`.
- The E2E runner script copy (`e2e_24176_shots.sh` in the scratchpad) leaks celery workers. Fix its cleanup before reuse.
