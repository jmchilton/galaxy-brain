Run via Claude Opus 5.5 at high effort.

# Test challenges debrief

I acted on four things and amended them into the branch commit, now `14ca2eb99a8` (was `89cbcf8dad8`). I added a paused-only API test and a subworkflow API test. I moved the three-endpoint state check into a `_assert_wes_run_state` helper that uses the existing `_list_wes_runs` helper. I dropped `assert_ok=False` from the completion wait. No code under `lib/galaxy/` changed.

Not acted on:

- **Success with a skipped job stays COMPLETE.** Not added. Such a test passes with and without the branch, so it would have to go in a "Baseline tests" commit. `skipped` isn't in the explicit `UNSUCCESSFUL_JOB_STATES` allowlist, so the risk is low. Worth adding if the D3 narrowing reworks the rule.
- **Job state `failed` has no test.** A job in `failed` (`Job.mark_failed`, set when tool execution raises) isn't in `Job.settled_states`. The completion monitor never marks an invocation that has one as `completed`. So the `"failed"` entry in `UNSUCCESSFUL_JOB_STATES` can't be reached and can't be tested through the API. The entry is a code question for John or the review step: drop it, or keep it as harmless. I left the code alone.
- **No unit test for `_invocation_wes_state`.** API tests reach every reachable case. A table test over summary dicts would just restate the tuple.
- **No E2E test.** WES is API only, with no UI.
- **D3 narrowing.** Not tested, as instructed.
- **`test_wes_state_mapping` (success path).** It's parent code and was left unchanged. It still asserts `COMPLETE` and passes on `14ca2eb99a8`.

## Tests run

Each test ran in its own pytest invocation from the worktree.

| Code under test | `paused_job` | `failed_job_in_subworkflow` | `failed_job` | `state_mapping` |
|---|---|---|---|---|
| Branch (`14ca2eb99a8` content) | pass | pass | pass | pass |
| Parent's `wes.py` (`67305c6d0a1`) restored temporarily | fail: `assert 'COMPLETE' == 'EXECUTOR_ERROR'` in `_assert_wes_run_state` | fail, same | fail, same | not run |
| Mutant: `"paused"` dropped from `UNSUCCESSFUL_JOB_STATES` | fail, same | not run | **pass** | not run |

The mutant row shows the gap the new paused test closes. `wes.py` was restored after each experiment, and `git status` was clean except `.venv`. `ruff`, `black`, `isort` and `flake8` are clean on `test_wes.py`.

<details>
<summary>Full review</summary>

## Scope

The branch's test diff (`git diff 67305c6d0a1..HEAD -- lib/galaxy_test`) started as one API test, `test_wes_state_mapping_failed_job`. There are no unit, Vitest or Selenium tests.

## `test_wes_state_mapping_failed_job` (kept, tightened)

The test runs `job_properties` with `failbool: true`, feeding `cat1`. The run ends with one job in `error` and one `paused`, and the invocation reaches Galaxy `completed`.

- **Fails without the fix at its own assertion:** confirmed (row 2).
- **`assert_ok=False` on `wait_for_invocation_and_completion`.** That flag only governs whether a `failed` or `cancelled` invocation raises right away. Job states don't matter to it. With `False`, a scheduling failure would wait out the full timeout instead of failing fast. Removed it.
- **`assert invocation["state"] == "completed"`.** The helper only returns once the state is `completed`, so this was redundant. Removed it.
- **`GET /runs` check.** It called `_wes_get_and_validate("ga4gh/wes/v1/runs")` even though the file already has `_list_wes_runs`, and it relied on the server's default `page_size` of 10. It now goes through `_list_wes_runs(10)` inside `_assert_wes_run_state`. On robustness: `list_runs` orders by `WorkflowInvocation.id.desc()`, and API tests in a class run one at a time against the class user. The run this test just finished is therefore on the first page. The list-comprehension assertion `== [state]` reports a missing run as `[] == [...]`, which is clearer than a `StopIteration`. Parallel tests sharing a user could push the run off page one, but Galaxy API tests don't run that way.
- **Coverage gap.** With `"paused"` removed from the tuple, this test still passes because the `error` job alone triggers EXECUTOR_ERROR. Nothing pinned the paused rule that the implementation debrief argues for.

## New `test_wes_state_mapping_paused_job`

This is a deterministic way to get an invocation whose only unsuccessful job is paused. The approach comes from the existing `test_pause_outputs_with_deleted_inputs`. It builds a one-element list, deletes the element without purging it, and runs `WORKFLOW_WITH_MAPPED_OUTPUT_COLLECTION` on the list. The job handler's `__filter_jobs_with_invalid_input_states` pauses the `cat` job instead of failing it, and the invocation completes with summary `{"paused": 1}`.

The test checks that the invocation's jobs are exactly `["paused"]`, so a setup drift (for example, Galaxy starting to fail such jobs) shows up as a setup failure, not a false pass. It then asserts EXECUTOR_ERROR on all three endpoints.

Alternatives rejected:

- An input dataset already in `error`: `check_inputs_ready` or the scheduler can fail the invocation instead.
- An external producer that fails after scheduling: this races the scheduler and would be flaky.

This also matches a realistic WES case: an input that wasn't produced inside the invocation leaves a paused job and no `error` job.

## New `test_wes_state_mapping_failed_job_in_subworkflow`

The outer workflow has only an inline subworkflow step. Inside it, `job_properties` fails. If the state were computed from the outer invocation's own steps instead of the completion record's recursive `compute_recursive_job_state_summary`, the outer run would read COMPLETE. The test pins the debrief's stated reason for using the completion record. It fails without the fix (row 2).

## Helper

`_assert_wes_run_state(run_id, wes_state)` checks `/status`, the run log and the first page of `GET /runs`. All three are sites the branch changed, and the listing exercises the new `joinedload`. The three EXECUTOR_ERROR tests use it. Per the process doc, a URL+method pattern used more than once gets a helper.

## Checklist items not applicable

- No unit tests, so the mock, `SimpleNamespace`, dataclass and restructuring checks don't apply.
- No Vitest tests.
- No E2E test: the feature has no UI.
- No "Baseline tests" commit: all three tests are new behavior and fail without the change.

## Parent findings

None.

</details>
