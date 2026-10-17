# Re-scope debrief, 2026-10-16

The [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion, and John approved it along with decisions across the stack. This page covers phase 1: the re-scope, a normal review, and the push.

- **Head:** `88d38744136`, pushed to `jmchilton/issue_24176_rerun_full_form_prefill`.
- **Parent:** `issue_24178_subworkflow_step_params_export` at `b53a5d9fe8b`. The branch was first rebased from `a171dbed419` onto `8f358dbb341`, then onto `b53a5d9fe8b`.
- **Original scope:** kept as `jmchilton/issue_24176_rerun_full_form_prefill_alt_original_scope` at `d10e8cfbf41`, with no worktree and no MY_BRANCHES entry.

## What changed

- **(a) Delegation.** `WorkflowInvocation.recover_step_parameters()` now loops over the parent's `resolve_step_parameters()`. It skips a row, with a warning, when the resolver raises `ValueError` or returns `None`. The branch's own row parsing is gone.
  - A characterization unit test covers a valid subworkflow row, an unknown step, a malformed name, a non-dict value and a row of another type.
  - The rebase onto `b53a5d9fe8b` hit a conflict in `test_run_parameters.py`. Both sides' tests were kept.
- **(b) Legacy unlabeled input steps.** The run-style download adds a field to each step, **`step_effective_label`**, and `rerunInputValue` prefers it over `step_label` (truthiness check, then `step_index`, then a match by position on `""`). `step_label` is untouched. Both forms gain this, because the simple form already goes through `rerunInputValue`.
  - **Why this name:** it follows the run step model's `step_*` keys (`step_label`, `step_name`, `step_index`, `step_type`). It also names the server concept it exposes, `WorkflowStep.effective_label`. That is the same key `recover_inputs()` (`/request`) and `inputs_by="name"` resolve by, so the name is easy to grep across client and server.
  - **Sent through `_request_input_labels()`, which returns `None` for an effective label more than one step uses** (review finding a). Old Galaxy saved the default "Input Dataset" name on every unlabeled input, so `/request` can't tell such steps apart. Without the guard, all of them would have been prefilled with the same dataset.
  - **The gap is narrower than the scope evaluation assumed.**
    - Modern saves never store `name` in an input step's `tool_inputs` (`InputModule._parse_state_into_dict`, since 2019). Import copies a non-default name into `label` (`__set_default_label`, since 2017).
    - So only input steps saved by older Galaxy releases are affected. For current workflows, the field equals `step_label` or is `None`, and the client behaves exactly as before.
    - Because of that, the API test `test_run_form_input_steps_carry_request_input_keys` is a contract test: label-or-index matches the `/request` input keys. It can't build a legacy row.
    - Legacy coverage comes from two other tests: a `model.test.js` case, written red first, and the unit test `test_request_references_legacy_input_steps` (renamed in phase 2), which sets `tool_inputs` names directly.
- **(c) `withRerunValues` moved.** It's now exported from `model.js`, with a JSDoc `@template` that keeps `FormInputNode[]` typing in the `.vue` callers. The local copy in `WorkflowRunForm.vue` is gone.
  - `WorkflowRun.test.js` now has one describe-level `mountRerun(props, runData = sampleRunData1)`, which unmounts the default wrapper and stubs both forms. Both rerun tests use it.
- **(d) Not done.** Strengthening `test_run_form_seeded_from_imported_invocation` isn't possible on this stack. Imported rows name the source workflow's step ids, so the resolver returns `None` and seeding is skipped by design. That is #24175's fix. **Whichever of #24175 and #24176 lands second should make this test assert real seeding.**

## Client surface #24177 builds on

- **New export:** `withRerunValues(inputs, values)` in `client/src/components/Workflow/Run/model.js`.
- **`rerunInputValue(requestInputs, step, position)`:** same signature, but it now reads `step.step_effective_label` first.
- **New run-style step field:** `step_effective_label`.
- **Unchanged:** `rerunHasStepParameters`, `getRunData(…, invocationId)`, the `WorkflowRun`/`WorkflowRunForm` `rerunRequest` props, and `step_label`. Nothing was renamed.
- **Test helper:** `WorkflowRun.test.js` has a shared `mountRerun(props, runData)` at describe level.

## Review and validation

- The [normal review](subagents/rescope_normal_review.md) found one medium issue, which is fixed, plus low items and nits, which are acted on or explained. No security findings.
  - There was no earlier `subagents/` directory to move. The original review went to a private security report, not a vault file.
- **Tests:**
  - API, under the lock: 17 pass, covering all 9 `test_run_form_seed*` and contract tests, the parent's request/step-param tests and the related run-form tests.
  - Unit `test_run_parameters.py`: 15 pass.
  - vitest `Workflow/Run`: 77 pass.
  - vue-tsc: no new errors (11 baseline errors, all about the file-source `recursive` property).
  - black, isort and mypy (run from `lib/`) are clean on the changed files.
- **Moved to `earlier_drafts/1/`:** test challenges, E2E polish, Codex review, thermo-nuclear review, scope evaluation and the screenshot debrief. Phase 2 will move `screenshots/` and `implementation_debrief.md`.
- **Process note:** the rewritten AGENTS.md calls the initial debrief `implementation_initial_debrief.md`, but the file on disk is `initial_implementation_debrief.md`. I kept the existing file.
