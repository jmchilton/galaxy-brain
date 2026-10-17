# Implementation debrief

**STATUS: READY.** `jmchilton/issue_24177_rerun_step_params_full_form` is at `46db8f9d5b6`. It has 4 commits on #24176's final tip `ced412c6248`, which sits on #24178 `57bf3eebd77` and then `dev`. The second [scope evaluation](scope_evaluation.md) says keep as implemented, with no scope change. The original scope is kept as `jmchilton/issue_24177_rerun_step_params_full_form_alt_original_scope` (`7f57142acd3`). The earlier round is in [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md), and the re-scope steps are in [implementation_rescope_debrief.md](implementation_rescope_debrief.md).

## Commits (client only)

1. **`708a26767b1` Baseline tests: simple-form rerun gating reason and submission payload.**
   - Pins the precedence where the workflow's own reason beats a rerun's.
   - Pins the simple-form submit payload: no object stores, plus `history_id` / `inputs_by` / `batch`.
   - Passes on the parent's code.
2. **`b7733f5f4f0` Refactor workflow run simple-form gating into a computed reason.**
   - Adds a new `Run/simpleFormDisabledReason.ts`, with a first-wins pure function and a `SimpleFormDisabledReason` union.
   - In `WorkflowRun.vue`, `simpleForm`, `disableSimpleForm` and `disableSimpleFormReason` are now computed. The gating block in `loadRun()` is gone.
   - `WorkflowRunForm`'s reason prop is typed with the union.
   - Behaviour is the same as the parent.
3. **`0431cefba41` Keep rerun in the expanded form when the original run set tool step params.**
   - When the export has non-empty `parameters`, the rerun gets the lowest-priority reason `rerunHasStepParameters`. It shows the alert "The original run set tool step parameters. The simplified form does not support these, so they would be lost." and hides the Simple Form toggle.
   - On a simple-form rerun, the preferred object store or the split pair is prefilled from the export. Workflow parameters are prefilled with #24176's shared `withRerunValues`.
   - Adds the `workflow_run.simple_form_link` and `simple_form_disabled_reason` nav targets, plus assertions in #24176's Selenium test.
4. **`46db8f9d5b6` Simple workflow run form: submit workflow parameters as `replacement_params`** (issue footnote ¹).
   - The form sent `replacement_dict`, which the API ignores.
   - Adds the new Selenium test `test_workflow_rerun_simple_form_keeps_workflow_parameters`.

## Decisions

- **Predicate kept from #24176:** non-empty `parameters`. Subworkflow rows count too.
- **Shared code reused:** `withRerunValues` and `mountRerun` from #24176, and `assert_item_name`, `wait_for_and_send_keys` and `wait_for_value` from the E2E framework.
- **The `isRerun` check before the rerun reason is dropped.** Only `WorkflowRerun` passes `rerunRequest`, and it always sets `is-rerun`.
- **Unit test dropped by the test challenge:** the "simple form prefills workflow parameters" unit case. The new Selenium test covers prefill and resubmission end to end, and the unit case got its value from a faked `FormDisplay` emit. The key fix keeps a unit red-to-green through `replacement_params: {}` and `not.toHaveProperty("replacement_dict")`.
- **Settled (from the coordinator), kept out:**
  - full-form object stores
  - the "step params lost" notice
  - folding `requestState` / `simpleFormUseJobCache` into `rerunRequest`
  - the `param_map` keyed-by-id bug
  - server seeding, the legacy-input lookup and import, which belong to #24176 and #24175
- **Follow-ups**, from [scope evaluation](scope_evaluation.md#follow-ups-not-scope-changes):
  - drop `WorkflowRunForm`'s redundant `disableSimpleForm` prop
  - an exhaustive reason→message map
  - Selenium `_open_rerun` and submit helpers (some call sites are in #24176's test)
  - honour `simplified_workflow_run_ui: off` on rerun

## For the PR description

- **Renames now apply** on simple-form runs and workflow landing runs (landing mounts the simple form), which had silently dropped them since 2020. They are also saved in the invocation request, so reruns prefill them.
- **Workflow parameters no longer count as changed** in the rerun "matches original" check, so a retyped original value doesn't flip the button (review L3).
- **Every run started from the expanded form now reruns in the expanded form,** with no toggle back.
- **Gating is computed,** so it reacts to prop changes immediately.
- **Footnote ¹ is fixed here,** so drop the issue's "to be filed on its own".
- **Don't claim current workflows silently fall back** on the legacy-input path. That gap is old Galaxy saves only.

## Tests (final head `46db8f9d5b6`)

- **Vitest `Workflow/Run`:** 82 pass. The new tests were red first, and the gating precedence was mutation-checked. The workflow-parameter prefill is now covered only by the Selenium test, and the object-store prefill by vitest.
- **Other checks:** vue-tsc shows only the 11 baseline `recursive` errors. Eslint has no errors, only the old `v-on-event-hyphenation` warnings. Prettier, black and ruff 0.17.0 are clean.
- **Selenium (Playwright, headless)**, under the lock on 8095/5185: `test_workflow_rerun_simple_form_keeps_workflow_parameters` and `test_workflow_rerun_prefills_expanded_form` pass. They were run after the re-scope, after the review fixes, after the thermo refactor and for the screenshots at the final head. Polish ran the new test once more. Both tests also pass on the **Selenium** backend at the final head, which checks Selenium/Playwright parity.

## Process (round 2)

- [Normal review](subagents/rescope_normal_review.md): no high or medium findings; L1, L2, N1 and N3 acted on.
- [Test challenges](test_challenges_debrief.md): 1 test moved into Baseline, 1 dropped, 1 strengthened.
- [E2E polish](polish_e2e_tests_debrief.md): 2 SmartTarget swaps.
- [Codex](codex_review.md): no findings.
- [Thermo-nuclear](thermo_nuclear_review.md): computed gating, typed reason, `isRerun` check dropped, watch fix.
- [Baseline refactor](baseline_refactor.md): the gating refactor is split into its own commit, and the tree is unchanged.
- [Scope evaluation](scope_evaluation.md): keep. Possible decompositions are listed there, including taking the 1-line key fix off `dev` first.
- [Screenshots](screenshot_debrief.md): 5 local captures in `screenshots/`, including the simple-form rerun prefilled with `moocow` and the `moocow suffix` outputs.

## Local environment

E2E used this worktree's Galaxy on 8095 and Vite on 5185, through `scratchpad/r24177/e2e.sh`. The ignored `config/galaxy.yml` bind is reverted, and no processes or ports are left over. One early run was stopped before any server came up, and I reverted its bind line by hand.
