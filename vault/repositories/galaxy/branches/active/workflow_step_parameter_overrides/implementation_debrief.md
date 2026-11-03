# Implementation debrief: workflow_step_parameter_overrides

**STATUS: READY.** The branch has a nested `step_parameter_overrides` invocation field and a run-form picker with a list view and a pop-out workflow view. The API commits are first and can be extracted onto `dev`.

Coordinated by Claude Opus 5.5. Every phase, review and hardening step ran via Claude Opus at high effort, except Codex, which ran as gpt-6.1-sol with no reported effort.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/workflow_step_parameter_overrides/differential-review/snapshots/20261103T200600Z-hardening-0c57368d1d50.json
  hardening @ 0c57368d1d50 vs jmchilton/issue_24177_rerun_step_params_full_form (merge-base 46db8f9d5b69)
  since 20261103T134331Z-implementation-f404830c4133:
    commits: 0 same, 0 rebased, 6 changed, 3 new, 1 dropped
    hunks:   46 carried, 17 changed, 32 new, 17 dropped
```

## Branches

- **`jmchilton/workflow_step_parameter_overrides`**: head `0c57368d1d5`. It has 9 commits on `issue_24177_rerun_step_params_full_form` `46db8f9d5b6`, a stack of #24177 → #24176 → #24178 → `dev`.
- **`jmchilton/workflow_step_parameter_overrides_api`**: head `0d5448ef3c8`. It holds the bottom 5 commits cherry-picked onto `origin/dev` `38dc259318c`, ready to open as their own PR.
  - Commit 1 carries two dev-only lines: #24178's `param_map.get(step.id)` fix, and a `None` check that mypy needs.
  - Expect one conflict hunk in `services/invocations.py` against #24178. Resolve it by taking #24178's side.
- **`jmchilton/workflow_step_parameter_overrides_alt_original_scope`**: head `20c7b0feaea`. It is the branch before the re-scope; see [alts/original_scope.md](alts/original_scope.md).

## Commits

1. `58a86dec561`: Baseline tests for subworkflow step parameter value errors.
2. `b682078c173`: refactor that moves the run form's tool step model out of `_workflow_to_dict_run`.
3. `0919ef03fb4`: adds `step_parameter_overrides` to invocation requests, in `lib/galaxy/workflow/step_parameter_overrides.py`.
   - Validation is strict and returns 400s with path-keyed `err_data`.
   - Overrides merge into the same per-step map that `parameters` produces, and apply on top of it.
   - Switching a conditional's case fills and records that case's defaults.
   - The field is recorded as a `meta` request row, with no migration. `/request` returns it, and export/import carries it.
   - Inner subworkflow step errors now nest under the subworkflow step.
4. `3bfb3a7732c`: `parameters_display` rows carry a `path` when they can be overridden.
5. `d7952c3ab81`: run form data includes `subworkflow_steps`, recursively.
6. `e1c0b115a1d`: the list picker and override cards.
   - It also adds the `step_parameter_overrides` route argument and rerun re-show, and puts server errors on their cards.
   - It rewords #24177's legacy-rerun alert. The parent stack's `WorkflowRunForm.vue` and `test_workflow_rerun.py` change here too.
7. `74402d218bd`: the pop-out workflow view, which shares the list's selection.
   - Subworkflow nodes list their inner steps, labelled like "nested › Step 2: echo".
   - A keyboard step selector is included.
8. `45c779f37a0`: "Rerun with this changed" on job parameter rows. It is hidden for jobs of subworkflow invocations.
9. `0c57368d1d5`: 11 E2E tests with `navigation.yml` selectors, plus a fix to the `workflow_run_ensure_expanded` helper.

Size: 3,696 added lines over 48 files. About 1,960 are production code (555 server, 1,406 client), 1,707 are tests and 23 are generated.

## Process

- [Brain research](brain_research.md).
- Three implementation phases, each followed by a normal review: [redesign](subagents/phase_a_redesign.md), [API first](subagents/phase_b_api_first.md) and [merged picker](subagents/phase_c_merged_picker.md). [Initial debrief](initial_implementation_debrief.md).
- **Round 1 hardening**, in [earlier_drafts/1/](earlier_drafts/1/):
  - performance: batched step-relationship prefetch, subworkflows built once per request, the JobStep check cached, a shared workflow fetch;
  - Codex: a nested conditional case fix, and a warning when a link reaches the expanded form;
  - thermo-nuclear: a single flattening path, one card list and a union tree type;
  - baseline refactor: the refactor commit;
  - scope evaluation: recommended a modest expansion.
- **Re-scope**: [debrief](implementation_rescope_debrief.md), [implementation](subagents/rescope_implementation.md), [review](subagents/rescope_normal_review.md). It adds card errors and rewords the legacy-rerun alert.
- **Round 2 hardening**:
  - [test challenges](test_challenges_debrief.md): unit tests now go through the public API, and E2E replaced 12 vitest cases;
  - [E2E polish](polish_e2e_tests_debrief.md);
  - [performance](performance_challenges_debrief.md): the picker renders only while open, and in-place selection takes 1.6 s per click down to 5 to 8 ms at 500 inner steps;
  - [Codex](codex_review.md): its one finding was refuted;
  - [thermo-nuclear](thermo_nuclear_review.md): a `StepParameters/` module directory and a separate payload module;
  - [baseline refactor](baseline_refactor.md): unchanged;
  - [scope evaluation](scope_evaluation.md): **keep**;
  - [screenshots](screenshot_debrief.md): 11 images, and the fix for a dead `v-b-tooltip` on "Rerun with this changed".
- **Branch check**: `make format` left nothing to change. mypy, run from `lib/` on the changed files, reports only the unrelated `notification.py:862` error.
- **Coordinator walkthrough**: I read the commit series, the server module and diffs, and the run form integration, and checked the screenshots. I found nothing further to change.

## Tests, last runs

- **API**: 14 on the branch: 11 new, both `parameters_display` tests and the baseline test. 70 across the wider step-parameter and subworkflow selection after the re-scope. On the extraction branch, the same 14 pass.
  - 6 existing `dev` step-parameter tests fail on the extraction branch and on plain `origin/dev` alike. The cause is the shared `.venv`'s gxformat2 pin.
- **Unit**: 3 tests in `test/unit/workflows/test_step_parameter_overrides.py`, plus a doctest.
- **Vitest**: 41 files, 249 tests across the run, editor-node, job-parameter and invocation suites.
- **E2E**: 12/12. That is the 11 override tests plus #24177's `test_workflow_rerun_prefills_expanded_form`, run with Playwright against a built `static/dist`.
  - After the screenshots step's tooltip fix, only `test_rerun_with_this_changed` was rerun.
- **CI**: none yet. The branch was pushed at the end of this session.

## For the PR description

- `err_data` for a legacy `parameters` error inside a subworkflow is now nested under the subworkflow step. The baseline commit pins the old shape.
- The #24177 legacy-rerun alert is reworded, along with its `test_workflow_rerun.py` assertion. Expect a one-line conflict if #24177 changes that test.
- Extracting commit 1 onto `dev` needs the `param_map.get(step.id)` fix. Without it, a subworkflow scheduled in a later pass may also lose its inner step parameters. That is plausible but unconfirmed.
- The `/request` subtraction returns detached copies of the rows that still have values. A pure-data version is a follow-up once both this and #24178 land.

## Known gaps and follow-ups

- **Repeats in a switched case**: switching into a case with a `min >= 1` repeat runs the job with zero instances. This predates the branch, and legacy `parameters` behave the same.
- **Expanded form**:
  - It shows nothing for inner-step errors (a two-line fix).
  - It lists the parameters a link names, but doesn't apply their values.
- **Locked in the picker**: conditional test parameters and `data_column` parameters.
- **Not yet supported**:
  - "Rerun with this changed" inside subworkflow invocations, which needs a parent-invocation lookup.
  - Drilling into a subworkflow's graph.
- **Smaller items**:
  - Graph nodes aren't focusable; the step dropdown covers keyboard use.
  - Card errors aren't linked to their inputs for screen readers. The shared `FormError` is a plain span.
  - The form doesn't scroll to the first card with an error.
  - The picker filter isn't debounced. It only matters past about 500 inner steps.
- **Decomposition**: [scope_evaluation.md](scope_evaluation.md) lists six ways to split the branch. The obvious one is the API PR from `workflow_step_parameter_overrides_api`, followed by the feature PR on #24177. The split is John's call.

## Environment notes

- Phase A installed `psycopg-binary` into the worktree `.venv` and ran `sudo playwright install-deps chromium`.
- The galaxy-playwright skill's script needs zsh, so a bash copy was used.
- Headless Chromium against Vite failed with `ERR_INSUFFICIENT_RESOURCES`. All E2E runs used a built `static/dist` instead.
- In this session's sandbox, Codex can't run shell commands, so both Codex reviews were given the diffs directly.
