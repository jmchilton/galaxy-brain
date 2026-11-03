# Initial implementation debrief: workflow_step_parameter_overrides

Coordinated by Claude Opus 5.5. Every phase and review ran via Claude Opus at high effort.

The branch implements [#24454](https://github.com/galaxyproject/galaxy/issues/24454) around the nested `step_parameter_overrides` field in [api_design.md](api_design.md). It also merges the spike's tree picker and its graph-picker alt into one picker: the list view is the default, and a workflow view pops out.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/workflow_step_parameter_overrides/differential-review/snapshots/20261103T134331Z-implementation-f404830c4133.json
  implementation @ f404830c4133 vs jmchilton/issue_24177_rerun_step_params_full_form (merge-base 46db8f9d5b69)
  first snapshot: 7 commits, 40 files, 80 hunks
```

## Commits

The branch has 7 commits over `46db8f9d5b6` (the #24177 stack head).

**API series.** These three commits are extractable onto `dev`; a local branch, `workflow_step_parameter_overrides_api`, has them cherry-picked onto `origin/dev`.

1. `7ecb000ea36`: adds `step_parameter_overrides` to invocation requests. A new module, `lib/galaxy/workflow/step_parameter_overrides.py`, handles validation and merging. The field is recorded in a `meta` request row, which needs no migration. `/request` returns it, and export/import carries it.
2. `6ad285f7797`: `parameters_display` rows now give each parameter's nested tool state `path`.
3. `4f70c613dc3`: run form data now includes `subworkflow_steps`.

**Client and E2E**, on top of #24177:

4. `6f1e8696b7f`: the list picker, cards, the `step_parameter_overrides` route argument, and rerun re-show.
5. `6b07cd83848`: the pop-out workflow view, sharing the list's selection.
6. `d9c3cc51d18`: "Rerun with this changed" on job parameter rows.
7. `f404830c413`: 8 E2E tests, with `navigation.yml` selectors.

## Decisions

- **Switching a conditional's case** fills that case's defaults and records them. This deviates from the posted design: the obvious alternative was a 400. Legacy `parameters` still returns a 400 in this case.
- **Storage.** The override values also go into the `step` rows. `/request` subtracts them before re-keying, which works with both `dev`'s row format and #24178's. If both fields set the same key, the override wins, and the record keeps only the override.
- **Subworkflows** can be picked at any depth. In the workflow view, a subworkflow node lists its inner tool steps' parameters instead of drilling into the inner graph. Inner steps read "nested › Step 2: echo" in the list, the panel, the cards and the alerts.
- **"Rerun with this changed"** is hidden for jobs inside subworkflow invocations.

## Process so far

- [Brain research](brain_research.md).
- Phases, each followed by a normal review:
  - A, redesign: [phase debrief](subagents/phase_a_redesign.md), [review](subagents/phase_a_normal_review.md)
  - B, API-first: [phase debrief](subagents/phase_b_api_first.md), [review](subagents/phase_b_normal_review.md)
  - C, merged picker: [phase debrief](subagents/phase_c_merged_picker.md), [review](subagents/phase_c_normal_review.md)
- Every fix was squashed into the commit it belongs to.

## Tests at the implementation snapshot

- **API**: 13 tests (12 in the new file, plus `test_jobs.py -k parameters_display`) pass on the branch and on the extraction branch. The existing step-parameter tests pass 27/27 on the branch.
- **Vitest**: 41 files, 253 tests.
- **E2E**: 8/8.
- **Lint and types**: vue-tsc, eslint (0 errors), prettier, ruff, black and isort are clean. mypy from `lib/` is clean apart from an unrelated `notification.py` error.

## Known gaps

- Server validation errors aren't mapped onto cards.
- Graph nodes aren't keyboard-focusable. A step dropdown covers keyboard use.
- The picker still locks conditional test parameters and `data_column` parameters.
- A switched-to case that contains a `data_column`, or a select whose options depend on other parameters, is untested and might fill a wrong default.

## Environment notes

- **Python**: Phase A installed `psycopg-binary` into the worktree `.venv` and ran `sudo playwright install-deps chromium`.
- **E2E runs**: the E2E skill's script needs zsh, so a bash copy was used. Headless Chromium against Vite failed with ERR_INSUFFICIENT_RESOURCES, so E2E ran against the client built into `static/dist`.
- **gxformat2 pin**: the `.venv` carries the stack's gxformat2 pin. As a result, 6 existing `dev` step-parameter tests fail on the extraction branch and on plain `origin/dev` alike.
