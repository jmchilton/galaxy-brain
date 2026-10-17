# Implementation debrief (after re-scope)

**STATUS: READY.**

- Head is `ced412c6248`, pushed to `jmchilton/issue_24176_rerun_full_form_prefill`.
- It's stacked on `issue_24178_subworkflow_step_params_export` at its final tip, `57bf3eebd77`.
- The original scope is preserved as `jmchilton/issue_24176_rerun_full_form_prefill_alt_original_scope` (`d10e8cfbf41`).
- The second [scope evaluation](scope_evaluation.md) says **keep as implemented**.
- [Screenshots](screenshot_debrief.md) were regenerated: the E2E test passed and the captures match round 1.

## What it does

Rerunning an invocation that ends up in the expanded run form now starts from the original run's values, not from the workflow defaults.

- **Server seeding.** `style=run&invocation_id=` seeds the step parameters. Tool steps go through `compute_runtime_state`, and subworkflow steps get their run-time inputs.
- **Client prefill.** The client fills in inputs, workflow and resource parameters, and job re-use.
- **Guard.** Reruns whose export has tool step parameters open the expanded form.

Details are in the [old debrief](earlier_drafts/1/implementation_debrief.md) and the [re-scope debrief](implementation_rescope_debrief.md).

## Re-scope and review changes

- **Resolver.** `recover_step_parameters()` now delegates to the parent's `resolve_step_parameters()`.
- **One naming policy.** `Workflow.request_input_labels()` decides how invocation requests refer to input steps. A step is referenced by its effective label, or by its index when the label is missing or shared with another step.
  - Two consumers use it: `recover_inputs()` (the `/request` export) and the run-style `step_effective_label`.
  - Visible API change, worth calling out in the PR: for legacy workflows whose input steps share a name, `/request` now emits index keys with `inputs_by="name|step_index"`. Before, the shared name collapsed into one key. Codex found this.
- **`rerunInputValue`.** It looks steps up by `step_effective_label`. When that field is `null`, it uses the step index. It falls back to `step_label` only when the run data has no field (thermo finding, `ced412c6248`).
- **Export for #24177.** `withRerunValues` is exported from `model.js`. `WorkflowRun.test.js` has a shared `mountRerun` helper.
- **Deferred.** The imported-invocation seeding assertion goes to whichever of #24175 or #24176 lands second.

## Process

- **Normal review:** [subagents/rescope_normal_review.md](subagents/rescope_normal_review.md)
- **Test challenges:** [test_challenges_debrief.md](test_challenges_debrief.md). One API test was tightened so it fails at its own assertion.
- **E2E polish:** [polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md). No changes.
- **Codex:** [codex_review.md](codex_review.md). One P2, fixed.
- **Thermo-nuclear:** [thermo_nuclear_review.md](thermo_nuclear_review.md). It approved; its main deferred item was fixed anyway.
- **Scope evaluation:** [scope_evaluation.md](scope_evaluation.md). Keep as implemented; it lists possible decompositions.
- **Screenshots:** [screenshot_debrief.md](screenshot_debrief.md), with three captures in local `screenshots/`. The earlier round's are in `earlier_drafts/1/screenshots/`.

## Tests

- **API, under the lock:** 25 pass, covering run-form, request, step-param, rerun and recover tests.
- **Unit:** `test_run_parameters.py`, 15 pass.
- **Vitest:** `Workflow/Run`, 77 pass.
- **vue-tsc:** no new errors. There are 11 baseline `recursive` errors.
- **Lint:** black, isort and mypy (run from `lib/`) are clean on the changed files.
- **E2E:** Playwright passed on `ced412c6248` during the screenshot run. Round 1 also passed (Playwright ×2, Selenium ×1), and the test is unchanged.
