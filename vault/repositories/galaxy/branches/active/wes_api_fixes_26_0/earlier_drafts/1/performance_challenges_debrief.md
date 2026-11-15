Run via Claude Opus 5.5 at high effort.

# Performance challenges debrief: wes_api_fixes_26_0

Process: `vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md`, run against `adf14a0006a` on `release_26.0` (`9ae7ab9c1df`) with a BRANCH_DIRECTORY. Scope: only what the branch changes in `lib/galaxy/webapps/galaxy/services/wes.py`.

## Summary

Nothing needed fixing, so no code changed. Head is still `adf14a0006a`. Every changed path either does the same work as before or less. No new queries, loops over rows, endpoints, polling or response fields are added. This is reasoned from the code. Nothing was measured, because the before/after difference is visible in the diff and a measurement would not change the decision.

## Per change

### `submit_run`: validation moved ahead of import (commits 1, 4)

`_parse_engine_parameters` and `_parse_workflow_params` are pure JSON parsing on request strings. Moving them ahead of `_load_workflow_content` and the workflow import means a malformed request is now rejected before any fetch, import or `History` insert/commit. The rejected path gets cheaper and the accepted path does the same work as before. The boolean parse in `_parse_boolean_engine_parameter` is constant-time.

### `submit_run`: rollback and soft delete on failure (commit 4)

`_discard_rejected_submission` runs only when submission raises after the import: one `rollback`, at most two scalar attribute writes (`StoredWorkflow.deleted`, `History.deleted`) and one `commit`. That adds at most two small `UPDATE`s, and possibly a primary-key reload of the expired objects after the rollback, on a request that is already failing. There's no per-step or per-dataset work, and nothing runs on success. Soft delete was chosen over purge, which also keeps this path from touching datasets or object stores.

### `cancel_run`: early return for terminal states (commit 3)

`invocation.state` is already loaded by `_get_invocation`. For `completed`, `failed` and `cancelled` runs, the branch now skips `request_invocation_cancellation`. That call re-fetched the invocation with an ownership check, set `cancelling`, inserted an `InvocationCancellationUserRequest` message and committed. A `cancelling` invocation then goes back to the workflow scheduler, which runs `cancel_invocation_steps`, two `UPDATE job ... IN (SELECT ... FOR UPDATE)` statements over the invocation's steps. The early return removes all of that for terminal runs. That includes scheduler load from WES clients that cancel defensively on shutdown, a pattern the implementation debrief cites. The branch only removes work here.

### `_get_invocation`: anonymous check first (commit 2)

`trans.user is None` is checked before the `WorkflowInvocation` lookup, so anonymous requests to the five run-scoped endpoints now fail with no query. Before, they ran the query and then hit a 500. Authenticated requests are unchanged.

### Run log: `NoReplacement` mapped to `null` (commit 5)

`update()` became a loop over `invocation_dict["output_values"]`, which has one entry per workflow parameter output (a handful). Each entry gets an equality check against a two-key dict: a type mismatch returns at once, and a dict compares by length first. The cost is O(number of value outputs), with no queries and no change in response size. The marker's replacement, `null`, is smaller than the marker.

## Out of scope (pre-existing, not changed by the branch)

Noted only. None of these are made worse here.

- `_get_invocation` checks ownership through `invocation.history.user_id`. That lazy-loads the history: two queries where a join filtered on `History.user_id` would take one.
- `_invocation_to_run_log` builds the run log from `invocation.to_dict(view="element")`, which serializes steps, inputs and outputs in full. The cost grows with workflow size on every `GET /runs/{id}`. The task-list endpoints already use keyset pagination with `LIMIT`.
- On the success path, `_get_or_create_history` commits the new history before invocation (the "Postgres tests in CI fail without this commit" comment). The branch keeps that commit.

## Tests run

None. No code changed, and the test-challenge step had already run the branch's WES API tests green at `adf14a0006a` (see [test_challenges_debrief.md](test_challenges_debrief.md)). The worktree is clean on `wes_api_fixes_26_0` at `adf14a0006a`.
