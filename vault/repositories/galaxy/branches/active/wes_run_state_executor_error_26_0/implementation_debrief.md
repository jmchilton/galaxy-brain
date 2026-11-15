Run via Claude Opus 5.5 at high effort.

# Implementation debrief: wes_run_state_executor_error_26_0

STATUS: **READY**, but it waits on John's decision. The branch is hardened and the scope evaluation recommends keeping it as implemented. It still reverses a behavior the docs call intentional, so it stays in `branches_need_decision`.

Head `ec656e83ae7`: two commits on the parent [`wes_api_fixes_26_0`](../wes_api_fixes_26_0/index.md) at `67305c6d0a1`, which sits on `release_26.0`. Pushed to jmchilton. Fork CI for `ec656e83ae7` was queued at hand-off.

This is demo bug 5 from stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md): an IWC run reported COMPLETE with fastp in `error` and MultiQC `paused`. The first implementation debrief, with the before-fix evidence, is [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md).

## Commits

| Commit | What it does |
| --- | --- |
| `525361a1b32` | Refactor, no behavior change: `_invocation_wes_state(invocation)` holds the old mapping. Run status, the `list_runs` summary and the run log call it. |
| `ec656e83ae7` | A `completed` invocation reports EXECUTOR_ERROR when its `WorkflowInvocationCompletion.job_state_summary` (which includes subworkflow jobs) counts a job in `error`, `failed` or `paused`. `list_runs` joinedloads the completion. The docs' state table, §4 and the gotchas bullet now describe the new rule. Adds three API tests and one unit query-count test. |

## How it got here

1. **Rebase.** Moved from the parent's old head `85f9b2b42be` onto `67305c6d0a1`. Two conflicts, both in `services/wes.py`. The parent had removed `NO_REPLACEMENT_VALUE`, which sat next to the new helper, and `list_runs` now filters on a `user` local. API tests `test_wes_state_mapping_failed_job`, `test_wes_state_mapping` and `test_wes_list_runs` passed, and the result was pushed as `89cbcf8dad8`.
2. **[Test challenges](test_challenges_debrief.md).** The original test didn't pin the paused rule: it still passed with `paused` removed from the tuple. Added `test_wes_state_mapping_paused_job` (a deleted collection element pauses the job, with no error job anywhere) and `test_wes_state_mapping_failed_job_in_subworkflow`. Also added an `_assert_wes_run_state` helper that checks `/status`, the run log and `GET /runs`.
3. **[Performance](performance_challenges_debrief.md).** Nothing needed fixing. The joinedload is a plain LEFT JOIN on a unique key, so it doesn't break keyset pagination or LIMIT. A page costs one statement instead of 1 + the number of completed runs. Added `test/unit/webapps/test_wes_service_queries.py` to pin that.
4. **[Codex](codex_review.md).** One finding, fixed: the docs' "Known limitations" bullet still described the old rule. Also corrected the state table's COMPLETE row.
5. **[Thermo-nuclear](thermo_nuclear_review.md).** The unit test failed `mypy test lib`, so it was rebuilt on `MockApp` and a real `WorkRequestContext`. `UNSUCCESSFUL_JOB_STATES` now uses `Job.states` members. The shared "did this invocation succeed" predicate is deferred to `dev`: nothing else decides that today.
6. **[Baseline refactor](baseline_refactor.md).** Split out the behavior-preserving helper commit. The behavior commit's `wes.py` diff is now just the rule.
7. **[Scope evaluation](scope_evaluation.md).** Recommends keeping the scope as implemented (below).
8. **Check branch.** `make format` left the tree unchanged, and `mypy` is clean on `wes.py`, `test_wes.py` and the unit test. No UI, so no screenshots. There is no issue, so nothing was posted.

## Scope decision

The scope evaluation: "**Recommendation: keep as implemented, on `release_26.0`, with no expansion.**" The demo found four kinds of failed run that WES reported COMPLETE. D3's narrower output rule catches the same two this branch catches: failed+paused jobs, and the uid failure, which has the same shape. No job-state or output-state rule can catch the other two (lost discovered outputs, 4 of 12 jobs). Every job and every output was `ok` there; those are Pulsar and runner bugs, fixed elsewhere. D3 differs only in reporting COMPLETE for some filter-failed workflows: 4 of IWC's 134 workflows, the ones that label only post-filter outputs. The cost is output queries on failed runs, a fallback for workflows with no labelled outputs, and a terminal state that can change. Paused-only misses a failing last step.

Since the recommendation isn't a scope change, "Parking on a Scope Decision" doesn't apply. The open question is the one from the first debrief: does John reverse his documented 26.0 choice ("a failed job does not make the run unsuccessful")?

- **Take it as is**, on `release_26.0` (recommended), or retargeted to `dev`.
- **D3 on `dev`** if filter-failed runs reading COMPLETE matters more. [scope_evaluation.md "What would change"](scope_evaluation.md#what-would-change-if-john-picks-d3) lists the code, tests, docs, target and remaining validation. The helper commit, the joinedload with its unit test, and all three API tests still apply under D3.
- **Paused-only**, on `release_26.0`: drop `error`/`failed` from the tuple. This is the least contested part, and it keeps all IWC filter-failed workflows COMPLETE.
- **Drop it.** Optionally make the docs gotcha more prominent. The helper commit could still go with the parent.

The scope evaluation also lays out [possible decompositions](scope_evaluation.md#possible-decompositions), including putting the helper commit in the parent PR.

## Choices

- **Snapshot, not live.** The summary is written once, at completion. If a user later resumes a paused job and it succeeds, the run stays EXECUTOR_ERROR. Galaxy doesn't revisit `completed` either.
- **`failed` stays in the tuple, though it can't match today.** `failed` isn't in `Job.settled_states`, so an invocation with a `failed` job never completes. On the workflow path that exception fails the invocation itself, which WES already reports as EXECUTOR_ERROR. The tuple classifies job states, so dropping `failed` would silently tie it to the completion monitor.
- **Galaxy `failed` stays EXECUTOR_ERROR, not SYSTEM_ERROR.** Most invocation failure reasons are data or tool failures.
- **The unit test stays.** API tests can't see query counts, and it fails when the joinedload is swapped out.

## Tests

API tests, one per pytest run with the worktree `.venv`, all passing at `ec656e83ae7`:
- `test_wes_state_mapping_failed_job`
- `test_wes_state_mapping_paused_job`
- `test_wes_state_mapping_failed_job_in_subworkflow`
- `test_wes_state_mapping`

Each of the three new tests fails at its own assertion with the parent's `wes.py` (`'COMPLETE' == 'EXECUTOR_ERROR'`). The paused test also fails with `paused` removed from the tuple. On the refactor commit `525361a1b32`, `test_wes_state_mapping`, `test_wes_list_runs` and `test_wes_get_run` pass. The unit test `test/unit/webapps/test_wes_service_queries.py` passes, and fails (`3 == 1`) with the joinedload swapped out.

Lint: `make format` clean; `ruff`, `flake8`, `isort` and `mypy` clean on the changed files.

Fork CI: runs for `eaa927c3cad` were superseded. Runs for `ec656e83ae7` were queued at hand-off.

## Parent findings (not acted on)

- `_get_invocation` checks ownership through `invocation.history.user_id`, which loads the full History row (with its audit subquery) on every single-run WES call. Filtering on a History join, as `list_runs` does, would avoid it. Performance step; parent code.
- `WES_TO_GALAXY_STATE` is unused (already on `release_26.0`). With this branch it is also misleading, because EXECUTOR_ERROR maps back only to `failed`. A one-line `dev` cleanup. Thermo step.

## Snapshot

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/wes_run_state_executor_error_26_0/differential-review/snapshots/20261115T132223Z-hardening-ec656e83ae7f.json
  hardening @ ec656e83ae7f vs wes_api_fixes_26_0 (merge-base 67305c6d0a10)
  first snapshot: 2 commits, 4 files, 11 hunks
```
