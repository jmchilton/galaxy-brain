Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review

I acted on two things and amended both into the single branch commit, now `eaa927c3cad` (was `24f37801ebd`). First, the performance step's unit test failed `mypy` (CI runs `mypy test lib`): it passed `None` for two typed `WesService` arguments and a `SimpleNamespace` as `trans`. I rebuilt it on Galaxy's own test fixtures, `MockApp` and a real `WorkRequestContext`, with `Mock()` for the two collaborators `list_runs` never touches. Second, `UNSUCCESSFUL_JOB_STATES` now uses `Job.states` members instead of string literals. The implementation is otherwise small and direct, and I found no structural change worth making on a release branch.

Not acted on:

- **Keep the unreachable `"failed"` entry.** Kept. The tuple classifies job states as unsuccessful or not. Whether the completion monitor lets an invocation with a `failed` job complete is a separate rule, owned by `Job.settled_states`. Dropping the entry would couple the two silently: if `failed` ever joined `settled_states`, WES would report `COMPLETE` for runs with failed jobs. The client's collection `JobStateSummary.js` likewise lists `failed` in its `ERROR_STATES`. The docs' "`error`, `failed` or `paused`" stays accurate as a rule.
- **Extract a shared "did this invocation succeed" predicate.** Deferred to `dev`. Nothing existing decides it. The completion notification hook prints the summary without judging it. The `/completion` API returns the raw summary. The client's `errorCount` uses a different set (`error`, `deleted`, `deleting`, and treats `paused` as non-terminal). A model-level `WorkflowInvocationCompletion.unsuccessful_job_count` or similar is a reasonable `dev` refactor once a second consumer exists. Today it would move a WES-specific policy (paused counts as failure) into the model for one caller. The D3 narrowing would also change the rule.
- **Invocation states as `InvocationState` members.** Not changed. `galaxy_state == "completed"` sits next to `GALAXY_TO_WES_STATE` and `TERMINAL_GALAXY_STATES`, which are parent code keyed by literals. Converting one comparison would leave the file mixed. Converting all of them belongs to a `dev` cleanup.
- **Drop the unit test.** Kept, after the rework above. API tests can't observe query counts, Galaxy already has a statement-counting unit test (`test/unit/data/test_hda_copy_from.py`), and the test fails (`assert 3 == 1`) when the joinedload is swapped for another relationship. It is not a trivial test.
- **`wes.py` is over 1k lines.** Not this branch: `release_26.0` has 1173 lines, the parent brings it to 1253, and this branch adds 25. Splitting state mapping and task pagination out of `services/wes.py` is a `dev` refactor.
- **`test_wes_state_mapping_failed_job` overlaps the other two tests.** Kept. The subworkflow test pins `error` and the paused test pins `paused`. The original test (an error with a paused job downstream) catches no mutant the other two miss, but it is the reported demo-bug shape and documents it.

## Tests run

- `PYTHONPATH=lib pytest test/unit/webapps/test_wes_service_queries.py`: pass. With the joinedload pointed at `WorkflowInvocation.history` instead, it fails with `assert 3 == 1` (`wes.py` restored afterwards).
- API tests, each in its own pytest invocation: `test_wes_state_mapping_failed_job`, `test_wes_state_mapping_paused_job`, `test_wes_state_mapping_failed_job_in_subworkflow` and `test_wes_state_mapping` all pass.
- `ruff`, `black`, `isort`, `flake8` and `.venv/bin/mypy` are clean on `wes.py` and the unit test.

<details>
<summary>Full review</summary>

## Scope

The branch diff `67305c6d0a1..24f37801ebd`: `_invocation_wes_state` and `UNSUCCESSFUL_JOB_STATES` in `services/wes.py`, which replace three `GALAXY_TO_WES_STATE.get(...)` call sites, plus a `joinedload` in `list_runs`. Also three API tests with an `_assert_wes_run_state` helper, one unit test, and the docs.

## Structure of the change

The change is the right shape. The three call sites that mapped invocation state now share one pure function, so no conditional was bolted onto the endpoints. The rule reads a precomputed, recursive summary, so it needs no per-request job queries. `GALAXY_TO_WES_STATE` stays a plain table for the states that need no context.

I looked for a code-judo move and found none worth the churn:

- Folding the rule into the table, for example by keying on `(state, has_failures)`, would make the table harder to read for the one state that needs context.
- Writing a WES state onto the completion record at completion time would add a column and a migration for a value that is cheap to derive.
- Computing the state in SQL for `list_runs` would duplicate the Python rule.

The body's `(completion.job_state_summary if completion else None) or {}` is dense but correct. Completion can legitimately be `None` for a `completed` invocation, for example one imported from a model store, and `job_state_summary` is nullable. Rewriting it would be cosmetic.

## Canonical abstractions

- **Job state names.** `Job.states` (`JobState`, a `str` enum) is the canonical source, and `Job.settled_states` already groups it the same way. Using members makes a typo an import-time `AttributeError` instead of a key that silently never matches. Summary keys are `str(job.state)`, and `str` enum members hash and compare equal to their values, so `.get(Job.states.ERROR)` finds `"error"`. The unit test's `{"error": 1}` case shows this. **Fixed.**
- **Invocation success.** There is no existing backend predicate (see the not-acted-on list). `client/src/api/jobs.ts`'s `ERROR_STATES` and `client/src/components/History/Content/Collection/JobStateSummary.js`'s `ERROR_STATES` disagree with each other, and both disagree with this rule. A shared definition is a `dev` concern.

## `"failed"` in `UNSUCCESSFUL_JOB_STATES`

The test-challenge step was right that it can't be reached today. `WorkflowInvocationStep.is_complete` requires `Job.is_terminal`, which means `state in Job.settled_states`, and `failed` isn't in that set. So `WorkflowCompletionManager` never records completion for such an invocation. I kept the entry for the reason given above. The opposite reading, that it "keeps never-working input alive", doesn't apply: it is a classification of an enum, not accepted input.

The underlying fact is worth recording. An invocation with a `failed` job never reaches `completed`, so WES reports it `RUNNING` indefinitely. That is Galaxy core completion behavior, outside this branch and its parent.

## Unit test (`test/unit/webapps/test_wes_service_queries.py`)

- **mypy failure (fixed).** `mypy.ini` checks untyped defs, and tox runs `mypy test lib`. The test had three errors: `WesService(None, None, ...)` twice (`arg-type`), `SimpleNamespace` as `ProvidesUserContext` (`arg-type`), and iterating the `Optional` `runs` (`union-attr`). `mypy` on the test file alone doesn't show them, because it can't resolve `galaxy` without `lib` on its path. They appear when `wes.py` is checked with it, as in CI. The rework uses `MockApp()` (its in-memory model replaces the hand-rolled `mapping.init("/tmp", ...)`) and `WorkRequestContext(app, user=...)`, the real lightweight `ProvidesUserContext`. It passes `Mock()` for the workflows service and config. `MockApp` can't build `WesService` or `WorkflowsService` through DI, and `MockAppConfig` isn't a `GalaxyAppConfiguration`. It reads `runs or []`. The diff is about the same size.
- **Value.** It guards the one non-obvious performance property the branch adds (one statement per page instead of 1 + completed runs). It also checks that the joined data drives the state, so the count can't pass vacuously. `session.expunge_all()` before the call is load-bearing: without it the completions sit in the identity map and the test passes with no joinedload. Kept.

## API tests

`_assert_wes_run_state` is a good helper: it checks all three changed sites, including the listing that exercises the joinedload. The three tests each set up one cause. The overlap is noted above. No change.

## Docs

Consistent with the code after the Codex step's fix. No change.

## File size

`services/wes.py` is 1278 lines: 1173 on `release_26.0`, 1253 at the parent. The branch's 25 lines are cohesive and sit next to the table they extend. A split, for example into `wes_state.py` and `wes_tasks.py`, is a `dev` refactor.

## Parent findings

- `WES_TO_GALAXY_STATE` (from `release_26.0`, not the parent) is unused anywhere in `lib/` or `test/`. With this branch it is also misleading: it maps `EXECUTOR_ERROR` back to `failed` only. Deleting it is a one-line `dev` cleanup. I left it because it's outside this branch's diff.

</details>
