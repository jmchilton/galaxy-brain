Run via Claude Opus 5.5 at high effort.

# Test challenges debrief: wes_api_fixes_26_0

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md`, run against `85f9b2b42be` with a BRANCH_DIRECTORY (changes made in place). New head: `adf14a0006a` on `release_26.0` (`9ae7ab9c1df`), not pushed.

## Summary

The branch has no unit tests, no Vitest tests and no client changes; every test is an API test in `lib/galaxy_test/api/test_wes.py`. The unit-test checks (implementation-only tests, mocks, `SimpleNamespace`, layout fakes, restructuring for testability) have nothing to act on. The service already factors its new parsing into module-level pure functions (`_parse_engine_parameters`, `_parse_workflow_params`, `_parse_boolean_engine_parameter`), and the API tests cover them, so no unit tests were added. No E2E test is warranted: this is a server API with no UI.

Changes were around helpers and one coverage gap:

1. New helper `_cancel_wes_run(run_id, authenticated=True)` for `POST /ga4gh/wes/v1/runs/{id}/cancel`, which the file now calls four times. Own commit, `2875e36a82f` "WES tests: add a helper for cancelling a run", placed first; it converts the pre-existing `test_wes_cancel_run`. The other call sites were folded into their fix commits.
2. New test `test_wes_cancel_run_failed_workflow` in the cancel commit. The fix's `TERMINAL_GALAXY_STATES` covers `completed`, `failed` and `cancelled`, and the debrief names EXECUTOR_ERROR becoming CANCELED as part of the bug, but only the `completed` path was tested. Galaxy's `WorkflowInvocation.cancel()` already leaves `cancelled` alone, so `failed` is the only other state the fix changes.
3. `test_wes_failed_submission_leaves_no_workflow_or_history` now uses `workflow_populator.index()` and `dataset_populator.history_names()` instead of raw `self._get("workflows")` / `self._get("histories")`.

Commit structure stays one commit per fix, plus the helper commit:

| Commit | Subject |
| --- | --- |
| `2875e36a82f` | WES tests: add a helper for cancelling a run |
| `3c2952bba2b` | WES: accept a JSON boolean for use_cached_job (unchanged) |
| `27d748a502c` | WES: answer 403, not 500, for anonymous run-scoped requests |
| `52fde6be9e2` | WES: cancelling a finished run leaves its state alone |
| `36d4b4a8ef6` | WES: rejected submissions leave no workflow or history behind |
| `adf14a0006a` | WES: report omitted optional parameters as null in the run log (unchanged) |

## Per test

### `test_wes_submit_run_use_cached_job_boolean` (commit 1): kept

Fails without the fix at its own status assertion (500 for JSON `true`). It submits `True`, `False`, `"true"`, `"False"`, then expects 400 for `"maybe"`. The string cases guard the old accepted form; the 400 case is the new validation added by the same commit. The `"maybe"` 400 also appears in the rejected-submission test, but there it exercises "validated before import", so both stay. The test does not check that `use_cached_job: true` is honored (job reuse). The pass-through existed before, and only parsing changed, so a reuse test would add a slow second run for no new coverage.

### `test_wes_run_endpoints_require_authentication` (commit 2): helper only

The anonymous cancel now uses `_cancel_wes_run(run_id, authenticated=False)`. It covers all five run-scoped endpoints and checks that the anonymous cancel didn't take effect. It fails without the fix at its 403 assertion (500 on `GET /runs/{id}`).

### `test_wes_cancel_run_completed_workflow` (commit 3): uses a shared assertion helper

The post-cancel checks (200, `run_id` echoed, WES state, Galaxy state) moved into `_assert_cancel_leaves_state(run_id, wes_state, galaxy_state)`, shared with the new failed-run test.

### `test_wes_cancel_run_failed_workflow` (commit 3): new

Submits `WORKFLOW_SIMPLE` through WES with `input1` set to an unreachable URL (`gxfiles://thisurl/doesnt/work`, the same trick as `test_run_workflow_with_invalid_url` in `test_workflows.py`). It waits for WES `EXECUTOR_ERROR` (Galaxy `failed`, reason `dataset_failed`), cancels, and asserts the state is still `EXECUTOR_ERROR` / `failed`. With the early return in `cancel_run` disabled, it fails at its own assertion: `assert 'CANCELING' == 'EXECUTOR_ERROR'`.

### `test_wes_failed_submission_leaves_no_workflow_or_history` (commit 4): populators

Raw `GET /workflows` and `GET /histories` were replaced with `self.workflow_populator.index()` and `self.dataset_populator.history_names()`, which also assert the 200. The three rejection paths are unchanged: bad `use_cached_job` (pre-import validation), missing required input (post-import rollback, newly created history), and another user's `history_id` (post-import rollback, workflow only). The previous debrief records it failing on the parent commit at the workflow-list assertion.

Not covered: a `gxworkflow://` submission that gets rejected. No workflow is imported on that path, so only the history discard applies, and the import path's missing-input case already covers that. Left as is.

### `test_wes_run_log_omitted_optional_parameter_is_null` (commit 5): kept

It runs a real workflow with an omitted optional text input wired to an output, and checks the run log reports `null`. It fails without the fix at its own assertion. No helper changes needed; it uses `_get_run_details`.

## Tests run

All from the worktree with its `.venv`, one test per pytest invocation (each starts its own Galaxy):

| Test | State | Result |
| --- | --- | --- |
| `test_wes_cancel_run_failed_workflow` | before squash, fix present | pass |
| `test_wes_cancel_run_failed_workflow` | early return in `cancel_run` disabled | fail: `'CANCELING' == 'EXECUTOR_ERROR'` |
| `test_wes_cancel_run` | `adf14a0006a` | pass |
| `test_wes_cancel_run_completed_workflow` | `adf14a0006a` | pass |
| `test_wes_cancel_run_failed_workflow` | `adf14a0006a` | pass |
| `test_wes_run_endpoints_require_authentication` | `adf14a0006a` | pass |
| `test_wes_failed_submission_leaves_no_workflow_or_history` | `adf14a0006a` | pass |

`ruff`, `black`, `isort` and `flake8` are clean on `test_wes.py`, and `ruff` passes on the file at every commit in the series. `mypy lib/galaxy_test/api/test_wes.py` reports no errors in that file. Its 53 errors are in other modules that the local venv lacks stubs for.
