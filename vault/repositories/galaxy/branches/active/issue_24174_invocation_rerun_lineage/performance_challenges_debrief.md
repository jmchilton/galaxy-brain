Run via claude-opus-5-5 at high effort.

# Performance challenges debrief

**Acted on one real problem.** Element-view serialization resolved rerun lineage one invocation and one rerun at a time. The Python access check on each rerun loaded its history, owner and shares. A published invocation rerun by 200 other users cost **611 SQL statements** to show, against 8 without lineage. Commit `8d8d0f7698d` resolves lineage for a whole batch in **at most two queries**: one for accessible sources, one ranked query for the latest accessible rerun per invocation. The history access rule now runs in SQL. The same page now costs **10 statements**. A 50-invocation element-view list dropped from **+101** lineage statements to **+2**. Collection views, which every client list uses, were already free and stay that way.

The index serves the reverse lookup. On PostgreSQL 16 with 3M invocations, the lineage queries for a show or a 50-row page run in **0.1–0.3 ms**. The extreme case, one source with 20,000 reruns, takes **~75 ms**. The migration's DDL took **~1.4 s** on 3M rows. The client adds no requests and no polling.

## Not acted on

- **Composite `(rerun_of_invocation_id, create_time)` index.** The planner already uses the single-column index and sorts the few matching rows. Only a source with thousands of reruns would benefit, at ~75 ms per 20,000. That doesn't justify widening the migration.
- **`CREATE INDEX` without `CONCURRENTLY`.** The index build blocks writes to `workflow_invocation` for its duration (~0.8 s per 3M rows locally). That is the normal Galaxy migration pattern. Very large servers should expect a short write pause.
- **3-second invocation detail poll.** While scheduling is non-terminal, each poll now runs one or two indexed lineage queries (~0.1 ms each). That cost is negligible, so no change.
- **A "newer rerun" hint doesn't appear on an already-open terminal invocation.** This is behavior, not performance: adding polling for it would cost more than it's worth.
- **Pre-existing per-invocation `messages` and element-view `to_dict` loads.** These N+1 patterns are on `dev` and out of this branch's scope.

<details><summary>Details</summary>

## What the branch touches, performance-wise

- **Model and migration.** `workflow_invocation.rerun_of_invocation_id` is a nullable self-FK with `ON DELETE SET NULL` and the btree index `ix_workflow_invocation_rerun_of_invocation_id`.
- **Collection view** (`GET /api/invocations`, the grid, the scroll list and `fetchInvocationForJob`). It adds only `is_rerun`, a property over the loaded column: no query and ~17 bytes per row.
- **Element view** (`GET /api/invocations/{id}`, cancel, `?view=element` lists, `create_from_store`). It adds `rerun_of_invocation_id` and `latest_rerun_invocation_id`, filtered by the viewer's access.
- **Invoke response.** It uses the collection `to_dict()`, so it adds no lineage queries, even for batch invocations.
- **Client.** It renders `is_rerun` from the list payload and lineage links from the detail payload already in the store. The run forms add one field to the existing invoke POST. No new endpoint, request or poll.

## Measurement method

I wrote a scratch harness (outside the repo). It builds a `MockApp` against a throwaway `postgres:16` container on a free port and counts `before_cursor_execute` statements around `InvocationsService.serialize_workflow_invocation(s)`. The invocations are preloaded first, as the index query would load them. "to_dict only" is the `dev` serialization path without lineage. The serializer also loads `messages` once per invocation, as it does on `dev`.

| Scenario | to_dict only | Branch before fix | After `8d8d0f7698d` |
| --- | --- | --- | --- |
| Show a published source with 1 owner rerun + 200 newer reruns by other users (private histories) | 8 | 611 | 10 |
| Element-view list, 50 invocations each with a source and a rerun | 400 | 551 | 452 |
| Collection-view list, 50 invocations | 50 | 100 | 100 |

Before the fix, element lists cost about two extra statements per invocation: the lazy source load and the reruns query, plus history loads for the access check. Each inaccessible newer rerun cost about three more: its history (with its correlated `history_audit` max subquery), the history's user and the share association. The loop broke at the first accessible rerun. So the cost grew with the number of *newer foreign* reruns, which is exactly the shape of a popular published invocation rerun from a GTN-style shared history.

## The fix

`InvocationsService._invocation_lineage(trans, invocations)` resolves both links for the whole batch:

1. `SELECT id FROM workflow_invocation WHERE id IN (:source_ids) AND <accessible>`. It is skipped when no invocation in the batch is a rerun.
2. `row_number() OVER (PARTITION BY rerun_of_invocation_id ORDER BY create_time DESC, id DESC)` over the invocations with `rerun_of_invocation_id IN (:batch_ids) AND <accessible>`, keeping rank 1.

`<accessible>` is `_accessible_invocation_clause(trans)`, the SQL form of `security_check` on the invocation's history. Admins get no filter. Other users see histories they own, importable histories and histories shared with them, through a correlated `EXISTS` on `history` plus a nested `EXISTS` on `history_user_share_association`. Anonymous users cannot invoke workflows, so they only see importable histories. `serialize_workflow_invocation` now delegates to `serialize_workflow_invocations`, so show, cancel, index and store import share one path.

Tests are in `test/unit/webapps/galaxy/services/test_invocations_lineage.py`:

- **`test_latest_rerun_is_latest_accessible`.** It covers owner, foreign private, shared, importable, admin and anonymous viewers. It passes against both the previous `check_security`-based implementation and the new SQL one, which shows the access semantics didn't change.
- **`test_lineage_query_count_is_independent_of_batch_size_and_fanout`** (admin and non-admin). It asserts exactly two lineage statements for a batch of 1 and a batch of 10, each with six reruns.

## PostgreSQL plans (3M invocations, 500k histories, 50k users)

The synthetic data had 448k reruns, 15% of rows, spread across sources. One source had 20,000 reruns by other users. Results were measured with `EXPLAIN (ANALYZE, BUFFERS)`, with JIT off unless noted.

- **Single show, non-admin (the poll path).** The source query is a `workflow_invocation_pkey` lookup plus a `history_pkey` filter: 0.17–0.2 ms. The latest-rerun query takes 0.12 ms.
- **50-row page, non-admin.** The source query is a pkey scan plus nested-loop history lookups: 0.28 ms. The latest-rerun query is an `ix_workflow_invocation_rerun_of_invocation_id` scan, then an incremental sort, then `WindowAgg`: 0.21 ms. The admin variant skips the history join: 0.13 / 0.19 ms.
- **Popular source with 20,000 reruns, non-admin viewer.** An index scan returned 20k rows, then a nested loop through 20k memoized `history_pkey` probes, a sort and `WindowAgg` with a run condition: ~74 ms, or 95 ms with JIT. That is ~3.7 µs per rerun, inside the database, in one round trip. The old per-row approach would have needed ~60k round trips here.
- **Migration DDL on 3M rows.** `ADD COLUMN` (nullable, no default) took 2 ms because it only changes metadata. `ADD CONSTRAINT ... FOREIGN KEY` took 576 ms to validate the all-NULL column. `CREATE INDEX` took 819 ms.

## Checklist against past-lesson patterns

- **Unbounded query.** The reruns query is bounded by the batch's direct reruns and filtered in SQL; nothing is sliced in Python. The page itself still uses the existing `limit`/`offset`.
- **Per-row round trips on a shared list endpoint.** This was the problem fixed above. The collection view, the default for every caller, has no lineage cost. Element view is opt-in.
- **Fan-out joins from the historical side.** The history join is driven from the requested rerun rows and probed by primary key, so it doesn't fan out.
- **Recursive or transitive work.** None: links stay direct, by design (see the [scope evaluation](scope_evaluation.md)).
- **Flush/commit hygiene.** The invoke path assigns the already-loaded source to each run config, so it adds no flushes or queries per batch member.
- **Client polling.** No new requests. The existing 3 s detail poll picks up two sub-millisecond queries.

## Tests run

- `test/unit/webapps/galaxy/services/test_invocations_lineage.py`: 3 passed.
- Branch model-store and migration tests (`test_model_store.py -k "rerun or lineage or invocation"`, `test_invocation_rerun_migration.py`): 7 passed, 1 xfailed (pre-existing).
- `lib/galaxy_test/api/test_workflows.py -k "rerun_lineage or rerun_access"`: 2 passed.
- ruff, black and isort are clean on the changed files. The quick mypy error count on `services/invocations.py` is unchanged from the previous head: 28, all pre-existing.

The commit is not pushed.

</details>
