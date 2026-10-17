# Re-scope debrief, 2026-10-16

> **Superseded by [implementation_debrief.md](implementation_debrief.md).** This records the re-scope phase only. Later steps in this round added the gating-refactor commit and moved the precedence test into Baseline. They also dropped the L1 resubmit unit test and its `emitDisplayedValues` helper (see [test challenges](test_challenges_debrief.md)). The final head is `46db8f9d5b6` on `ced412c6248`, with 82 vitest passing.

The [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion, and the coordinator approved both items. This page covers the re-scope, the normal review and the push.

- **Original scope:** kept as `jmchilton/issue_24177_rerun_step_params_full_form_alt_original_scope` at `7f57142acd3`, with no worktree and no MY_BRANCHES entry. The local `backup/issue_24177_pre_squash` is deleted.
- **Rebase:** `git rebase --onto 88d38744136 d10e8cfbf41` applied with no conflicts. Git merged #24176's shared `mountRerun` cleanly, but it left this branch's own nested `mountRerun(runData, rerunRequest)` shadowing it. I fixed that by hand (below). The branch was later moved onto #24176 `b5c7505e1b3` (docs and API-test only) with no conflicts.
- **Pushed after this phase:** `5125a74ac3c`.

## What changed

The branch now has three commits:

1. **Baseline tests: WorkflowRunFormSimple rerun submission payload.**
   - Following the new AGENTS.md "Baseline Tests" rule, `WorkflowRunFormSimple.test.ts` starts with one case that pins current behaviour.
   - A rerun whose request recorded no object stores or workflow parameters submits none, with `history_id`, `inputs_by` and `batch` pinned.
   - It passes on the parent: I checked it locally, and the reviewer checked it in a scratch export.
2. **Keep rerun in the expanded form when the original run set tool step params.** This is the original patch, plus:
   - **`withRerunValues` is shared.** The simple form copies each `wpInputs` entry, dropping `color`, and then calls `withRerunValues(wpInputs, rerunRequest.replacement_params)` from `model.js`. The inline copy is gone. The copy comes first, so the model prop is never mutated.
   - **The tests use #24176's `mountRerun(props, runData)`.**
     - The branch's own helper is deleted.
     - Its "explains the expanded form" test nearly duplicated #24176's "opens the expanded form … tool step parameters" test, so its `disableSimpleForm` / `disableSimpleFormReason` assertions were folded into #24176's test. That edit is additive.
     - The precedence test ("keeps the workflow's own reason") stays as its own case on the shared helper.
3. **Simple workflow run form: submit workflow parameters as `replacement_params`** (issue footnote ¹).
   - `onExecute` sent `replacement_dict`, which nothing reads. `lib/galaxy` reads only `payload["replacement_params"]` (`run_request.py:546`), and the invoke schema declares only that key, so the old key was silently dropped.
   - The value shape is the same as the expanded form's, which sends `wpData` raw. An untouched field is `undefined` and drops out of the JSON.
   - Red first: the extended unit test failed at `expect(request.replacement_params).toEqual({sample: "s1"})`.

## Behaviour changes for the PR text

- **Renames now apply** on simple-form runs and on workflow landing runs, because landing mounts the simple form. Until now, `${...}` renames from the simple form were dropped silently, ever since the simplified form was added in 2020 (`4626f714bb2`).
- **Workflow parameters are now saved** in the invocation request, so simple-form reruns prefill them.
- **Reruns no longer flag workflow parameters as changed.** Before, a retyped original value marked the parameter as not matching the original, and that switched the button label (review L3).

## Tests

- **Vitest unit test**, extended so a submission must carry `replacement_params`. The resubmit case emits the values `FormDisplay` was given, so the submitted value comes from the prefill (review L1). Mutation-checked.
- **One new Selenium test,** `test_workflow_rerun_simple_form_keeps_workflow_parameters`:
  1. Runs `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM` from the simple form (`expanded_form.assert_absent()`) and asserts the output is named `moocow suffix`.
  2. Reruns, asserts the simple form shows `moocow`, resubmits, and asserts the second output's name.
  - **Why a new test, not an extension:**
    - Every `test_replacement_parameters*` test calls `workflow_run_ensure_expanded()`, which is why the bug went unnoticed. Making them use the simple form would lose the expanded-form coverage they provide.
    - `test_workflow_rerun` and `test_workflow_rerun_prefills_expanded_form` cover other forms and workflows.
  - It uses the existing `assert_item_name` mixin. Without commit 3 it fails at the first name assertion, which by reasoning is the literal `${replaceme} suffix`.
- **Results:** vitest `Workflow/Run` 83 pass. vue-tsc shows only the 11 baseline `recursive` errors. Eslint shows only pre-existing warnings; prettier, black, isort and ruff are clean. Under the lock on 8095/5185, the new Selenium test and #24176's `test_workflow_rerun_prefills_expanded_form` both pass (Playwright backend, run twice).

## Review

- [Normal review](subagents/rescope_normal_review.md): no high or medium findings. L1, L2, N1 and N3 acted on. L3 goes into the PR text. N2 is harmless.
- **Moved to `earlier_drafts/1/`:** test challenges, E2E polish, Codex review, thermo-nuclear review, scope evaluation, the screenshot debrief and `subagents/`. `screenshots/` and `implementation_debrief.md` move in the rerun below.
- **Process note:** AGENTS.md calls the initial debrief `implementation_initial_debrief.md`, but the file on disk is `initial_implementation_debrief.md`, and I kept it. The rewritten "After your plan is done" list adds a refactor-baseline step (`baseline_refactor.md`), which the rerun includes.
