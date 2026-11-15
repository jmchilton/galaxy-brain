# Implementation debrief: wes_api_fixes_26_0

Stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). Fixes Galaxy WES bugs that the demo's probes found on v26.1.2 (`~/projects/repositories/galaxy-wes-tes/docs/troubleshooting.md`, "Galaxy WES bugs", evidence under `runs/setup/wes-probes/`).

## Branches

| Branch | Base | Head | Purpose |
| --- | --- | --- | --- |
| `wes_api_fixes_26_0` | `release_26.0` `9ae7ab9c1df` | `85f9b2b42be` | The bug fixes, for a PR. |
| `wes_api_fixes_v26.1.2` | tag `v26.1.2` `391641a4e12` | `2aad3a3e80c` | Same five commits cherry-picked (clean) for the demo's Galaxy. **Demo only, not for a PR.** No worktree; `ghwt` rejects the dot, so it was built in a temporary worktree that has been removed. |
| [`wes_run_state_executor_error_26_0`](../wes_run_state_executor_error_26_0/index.md) | this branch | `d83962aa811` | Behavior change (bug 5), needs a decision. |

All three are pushed to `jmchilton`.

## Why `release_26.0`

WES first shipped in v26.0.0 (PR #21335). `release_26.0` has every bug fixed here. Its `services/wes.py` differs from `release_26.1` and `v26.1.2` only in two `effective_tool_id` lines (`240b124f3fc`), and `api/wes.py` and `test_wes.py` are identical, so the commits merge forward. `release_26.2` and `dev` differ only by typing changes (`Optional[X]` to `X | None`, `ProvidesHistoryContext`). Cherry-picking onto `v26.1.2` applied cleanly; the resulting `wes.py` equals this branch's apart from those two lines.

## Commits

Each commit has its fix, its test and any doc change (`doc/source/dev/ga4gh_wes.md`).

1. `dc6cc85965d` WES: accept a JSON boolean for use_cached_job. Demo bug 1. `_parse_boolean_engine_parameter` accepts `true`/`false` and the strings `"true"`/`"false"` (any case); anything else is 400. Test `test_wes_submit_run_use_cached_job_boolean`.
2. `428372476e1` WES: answer 403, not 500, for anonymous run-scoped requests. Demo bug 3. `_get_invocation` raises `AuthenticationRequired` (403) before the lookup, matching `GET /runs` (#22347). That covers `GET /runs/{id}`, `/status`, `/tasks`, `/tasks/{task_id}` and `POST /runs/{id}/cancel`. The spec lists 401 for unauthenticated requests; Galaxy's `AuthenticationRequired` is 403 and `GET /runs` already uses it, so this matches. Test `test_wes_run_endpoints_require_authentication`.
3. `2d3dc5ce44b` WES: cancelling a finished run leaves its state alone. Demo bug 4. See below. Test: strengthened `test_wes_cancel_run_completed_workflow` (asserts `run_id`, WES state `COMPLETE` and Galaxy state `completed` after cancel).
4. `c5ea3582452` WES: rejected submissions leave no workflow or history behind. Demo bug 2. See below. Test `test_wes_failed_submission_leaves_no_workflow_or_history` (bad `use_cached_job` -> 400, missing required input -> 400, another user's `history_id` -> 404; then no workflow with the test's unique name and no history with its `history_name` in the user's lists).
5. `85f9b2b42be` WES: report omitted optional parameters as null in the run log. Demo bug 6. The run log maps the stored `{"__class__": "NoReplacement"}` output value to `null`. WES-only: Galaxy's native invocation API still returns the marker (it is how Galaxy stores the value; changing `to_dict` would change the native API on a release branch). Test `test_wes_run_log_omitted_optional_parameter_is_null`.

## Choices

### Cancel on a terminal run

Galaxy's `WorkflowInvocation.cancel()` deliberately moves a `completed` or `failed` invocation to `cancelling`, so that remaining paused jobs get deleted. Through WES this turned COMPLETE (or EXECUTOR_ERROR) into CANCELED.

WES 1.1 describes cancel as "Cancel a running workflow" and lists only 200, 401, 403, 404 and 500, with no error for an already-finished run. COMPLETE, EXECUTOR_ERROR and CANCELED are terminal. The least surprising behavior is an idempotent no-op: return 200 with the `run_id` and leave the state alone. Rejecting with 400 isn't in the spec and would break clients that cancel defensively on shutdown.

So `cancel_run` returns early for Galaxy states `completed`, `failed` and `cancelled` (`TERMINAL_GALAXY_STATES`). Trade-off: a WES cancel no longer deletes leftover paused jobs of a completed run, or jobs still running in a `failed` invocation. Galaxy's own `DELETE /api/invocations/{id}` still does.

### Rejected submissions

`submit_run` imported the workflow and created the history before parsing engine parameters and invoking. Two parts:

- `workflow_params` and `workflow_engine_parameters` are parsed and validated (JSON objects, `use_cached_job` boolean) before anything is created. JSON `null` is still accepted for both.
- Required inputs, the target history (`history_id` of another user) and other invocation checks happen inside `invoke_workflow`, after the import. Validating them first would duplicate `build_workflow_run_configs`. Instead, on any exception after the import, `_discard_rejected_submission` rolls back the session and marks the imported workflow and the newly created history `deleted`, then re-raises. A `history_id` the caller supplied is never touched. Soft delete matches Galaxy's normal delete; they still show in the deleted views. Purging was avoided because `HistoryManager.purge` raises when user dataset purge is disabled.

Galaxy's native invoke API has the same leak for `new_history_name` (`_get_target_history` runs before `_normalize_inputs` in `lib/galaxy/workflow/run_request.py`). Not fixed here.

## Tests and evidence

Run with `pytest lib/galaxy_test/api/test_wes.py::TestWesApi::<test>` from the worktree, one test per invocation (each starts its own Galaxy), with a uv Python 3.12 venv built from `pinned-requirements.txt` and `dev-requirements.txt` plus `psycopg-binary==3.3.2` (the pinned `psycopg` needs libpq, which this host lacks).

Before, on `9ae7ab9c1df` with the tests added:

| Test | Result |
| --- | --- |
| `test_wes_submit_run_use_cached_job_boolean` | fail: 500, `AttributeError: 'bool' object has no attribute 'lower'` |
| `test_wes_run_endpoints_require_authentication` | fail: 500 on `GET /runs/{id}`, `AttributeError: 'NoneType' object has no attribute 'id'` |
| `test_wes_cancel_run_completed_workflow` | fail: `'CANCELING' == 'COMPLETE'` |
| `test_wes_failed_submission_leaves_no_workflow_or_history` | fail: 200 for `use_cached_job: "maybe"`. Rerun on `2d3dc5ce44b` (fixes 1-3): fail, three `WES rejected <token> (imported from WES API)` workflows left |
| `test_wes_run_log_omitted_optional_parameter_is_null` | fail: `{'__class__': 'NoReplacement'} is None` |

After, on `85f9b2b42be`: all five pass. `ruff`, `black`, `isort` and `flake8` are clean on the changed Python files. mypy was not run locally; fork CI's Python linting job covers it.

Existing WES tests whose code paths changed (submission tests, gxworkflow tests) were not run locally; fork CI runs them.

## Not done

- Demo bug 7 (integer inputs not validated): shared invocation path, not WES-specific; out of scope.
- Demo bugs 8-10 (DRS host, DRS 202 without Celery, public-only DRS objects, collections without DRS URIs, service-info defaults such as `auth_instructions_url: "TODO"`): design or config work, not quick fixes.
- Minor items: `next_page_token` is `null` instead of `""` at the end; the missing-input 400 names a database step id. Not touched.
- The native API's `new_history_name` leak (above).
