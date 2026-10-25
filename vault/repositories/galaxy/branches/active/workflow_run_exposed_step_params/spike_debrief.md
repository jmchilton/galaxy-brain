# Spike debrief: workflow_run_exposed_step_params

The UI shape works, and the RERUN_ISSUE holds up with five corrections. The full write-up and screenshots are in [LESSONS_LEARNED.md](../../../../../projects/workflow_applications/LESSONS_LEARNED.md).

## Branch

`jmchilton/workflow_run_exposed_step_params`, head `147dac7222a`, on `issue_24177_rerun_step_params_full_form` `46db8f9d5b6`. Four commits:

- `cce1cb094c0`, server: G1 strict keys, G4 recorded exposed keys (a `meta` request row, no migration), and G2 `name`/`exposable` on `parameters_display` rows. Also adds the `exposed_step_params` echo test tool and fixtures.
- `6ed1cfe0b54`, client: `stepParameterTree.ts`, the picker, bonus cards, `step_param`/`step_param_value` route args, the rerun re-show and relaxed gate, and the job parameter row action.
- `a48d75712e1`, the E2E tests.
- `147dac7222a`, probes for two-level-deep subworkflow keys (apply, and unknown key 400).

## Tests run

- API: `test_workflow_exposed_step_params.py` passes 10/10. G1 was red first. The G3 probes (one and two levels deep) were green with no code change. Existing step-param API tests: 22/22 pass with strictness on.
- Vitest: `stepParameterTree.test.ts` passes 8/8, and the existing WorkflowRun, WorkflowRunFormSimple, model and JobParameters suites pass.
- E2E (Playwright, headless, harness-started Galaxy): `test_workflow_run_exposed_step_params.py` passes 5/5. With strictness on, `test_workflow_rerun.py` plus `test_workflow_run.py` passed 41/41 (one upload timeout under load passed on re-run). About 13 of those drive the expanded form; the rest submit the simple form, which sends no `parameters`.
- No CI.

## Shortcuts

- Lint hooks ran on commit. No mypy run.
- No `navigation.yml` entries: the E2E tests use raw selectors.
- The client API schema was not regenerated (`exposed_step_parameters`, `name` and `exposable` are untyped, via `as any`).
- No guard for the F3 row action inside subworkflow invocations.
- G3 inner-tree listing was not built.
- The worktree shares `.venv` and `node_modules` with the #24177 worktree through symlinks, so it needs its own before any real work.

## Suggested action

Edit RERUN_ISSUE.md per LESSONS_LEARNED "Suggested issue edits" and file it. Don't PR this branch. Real work would split into G1 (strict keys and caller audit), G2+G4 API, and client PRs. Once the issue is filed, park the spike as reference or abandon it.
