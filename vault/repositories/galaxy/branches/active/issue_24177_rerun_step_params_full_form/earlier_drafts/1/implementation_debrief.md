# Implementation debrief

**STATUS: READY.** Branch `issue_24177_rerun_step_params_full_form` is at `1d8829ef22d`, a single commit pushed to `jmchilton`. It is rebased on the final #24176 tip `8141bfccf87`. [Scope evaluation](scope_evaluation.md): keep scope as implemented.

## What it does (client only)

- **Rerun whose request carries tool step `parameters`:**
  - Opens the expanded form with the alert "The original run set tool step parameters. The simplified form does not support these, so they would be lost."
  - Hides the **Simple Form** toggle, so the user can't switch to a form that drops them.
  - `WorkflowRun.loadRun` now uses one pure function, `simpleFormDisabledReason(model, rerunRequest)`. It returns the first reason that applies, in this order: resource params, disconnected inputs, replacement params, rerun step params. That keeps dev's last-wins order.
  - The rerun reason is lowest priority, so the workflow's own reason still shows when it has one. `disableSimpleForm` is now computed from the reason.
- **Simple-form rerun:** prefills the preferred object store, or the split outputs/intermediate pair, from the export. Prefills workflow parameters from `replacement_params`.
- **E2E selectors:** `workflow_run.simple_form_link` and `simple_form_disabled_reason`.

## Decisions

- **Predicate kept from #24176:** non-empty `parameters`. Subworkflow rows count too, because the simple form drops those as well.
- **`WorkflowRun`'s `requestState` / `simpleFormUseJobCache` not folded** into `rerunRequest`. Landing, Home and the router use those props too.
- **`withRerunValues` duplicated, not moved:**
  - It is #24176 code. The normal review, Codex and the thermo review all suggest moving it to `model.js` and reusing it in the simple form; the duplicate is 3 lines.
  - **Pending a coordinator decision**, otherwise a cleanup after merge. The same cleanup should merge the two `mountRerun` helpers in `WorkflowRun.test.js`.
- **E2E folded into #24176's `test_workflow_rerun_prefills_expanded_form`**, at the coordinator's request:
  - The separate test is gone, along with this branch's own step selectors.
  - #24176's test now also asserts the reason alert and the missing toggle. These fail without #24177.
  - It also resubmits the first rerun and checks that the new invocation's request export keeps `num_lines` = 3, which is the issue's end-to-end ask.
  - The edit to #24176's test is additive: 9 lines.
- **History:** squashed to one commit for the rebase. The pre-squash commits are on the local branch `backup/issue_24177_pre_squash` (`dbd2a8d4a85`); delete it when no longer needed.
- **Known gaps, not fixed:**
  - Workflow-param prefill has no effect until the `replacement_dict` bug (issue footnote ¹, **not yet filed**) is fixed.
  - The expanded form has no object store controls.
  - The `param_map` keyed-by-id bug.
- **UX shift for the PR description:** every run started from the expanded form now reruns in the expanded form, with no toggle back.

## Tests

- **Vitest `Workflow/Run/`, 81 pass.** These were red-first on the parent:
  - `WorkflowRunFormSimple.test.ts` (new, `shallowMount`): preferred, split and intermediate-only stores in the `invokeWorkflow` payload; `replacement_params` prefill; no prefill when the export has none.
  - `WorkflowRun.test.js`: reason and disable props. The precedence test is mutation-checked.
- **Selenium**, under Playwright with the lock held: the whole `test_workflow_rerun.py` passed (5 tests) before the fold. After the fold, the merged `test_workflow_rerun_prefills_expanded_form` passed at `1d8829ef22d`.
- **Other checks:** `vue-tsc` clean, eslint and prettier clean, black and ruff 0.17.0 clean.

## Process

- [Normal review](subagents/normal_review.md)
- [Test challenges](test_challenges_debrief.md)
- [E2E polish](polish_e2e_tests_debrief.md)
- [Codex review](codex_review.md): one P3, the `withRerunValues` reuse.
- [Thermo-nuclear review](thermo_nuclear_review.md): the reason-function refactor.
- [Scope evaluation](scope_evaluation.md): keep.
- [Screenshots](screenshot_debrief.md): local `screenshots/`.
- [Dedupe review](subagents/dedupe_review.md)

Earlier debriefs cite pre-squash SHAs and say some changes are "uncommitted". All of that work is now in `1d8829ef22d`.

## Local environment

- The local E2E ran this worktree's Galaxy on 8095 and Vite on 5185 (`e2e.sh` in the session scratchpad). Ports 8080/5173 and 8090/5180 were held by servers from other sessions running outside the lock (`issue_24173_invocation_selection_urls`, `selenium_stories_core`). I did not touch them.
- `e2e.sh` sets `bind: localhost:8095` in the worktree's ignored `config/galaxy.yml` for each run and reverts it afterwards. The line is reverted now.
- Earlier runs leaked gravity/celery processes from this worktree; I have killed them by PID. The script now kills the whole `run.sh` process tree on exit.
