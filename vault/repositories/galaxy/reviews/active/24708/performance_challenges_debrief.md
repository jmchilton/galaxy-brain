# Performance challenge debrief: #24708

Profile `gx_performance_challenger`, Opus 5.5 (claude-opus-5-5), medium effort. Reviewed commit `86a724b7bf5e37461797d823287e193afe61fff7`. No PR code was edited.

## Verdict

The server's multi-value filter is sound. The cost is client fan-out: one counts request per listed workflow, and name filters re-resolved through three index lookups per kind on every grid fetch. Nothing polls, so all of it is driven by user actions.

## What was measured and what wasn't

Measured:

- SQL statement counts, using PR code against the Galaxy unit-test harness on in-memory SQLite. These are counts, not timings. Script (not in the repo): session scratchpad `perf/count_queries.py`.
- Request-line limits, using gunicorn 26.2.0 and uvicorn 0.54.0, the pinned versions, with trivial WSGI and ASGI apps.

Read from code, not run:

- Browser request counts. The worktree has no `client/node_modules`, so they come from tracing the code.

Not measured:

- Postgres plans and any latency. The Docker daemon is down and no local Postgres is installed. Statements below about plan quality are reasoning, and the measurement plan covers them.

| Path | Result |
|---|---|
| `get_accessible` loop, n=1 / 10 / 50 / 150 histories | 1 / 10 / 50 / 150 statements |
| `by_ids` + `error_unless_accessible`, same n | 1 / 1 / 1 / 1 statements |
| Workflow index, `name:rna`, `skip_step_counts`, 50 rows | 102 statements (50 tag loads, 50 menu-entry counts, 2 base); 25 KB JSON |
| History index, `name:rna`, `summary` + `username`, 50 rows | 102 statements (50 annotation loads, 50 tag loads, 2 base); 18 KB JSON |

The JSON sizes are floors, because the fixtures have no annotations, tags or source metadata. Workflows owned by different users would add a user load per owner.

## Client request accounting

Traced from code, for a session with an empty cache:

| Action | Index requests | `/counts` requests | `/api/invocations` |
|---|---|---|---|
| Grid load, no filter | 0 | 0 | 1 |
| Open Workflow dropdown | 1 | up to 20 | 0 |
| Type in Workflow dropdown (each debounced query) | 3 | one per new id, up to 150 | 0 |
| Open or type in History dropdown | 1 / 3 | 0 | 0 |
| Pick an item | 0 | 0 | 1 |
| Grid page flip or sort with `workflow:x` | 3 | 0 | 1 |
| Grid page flip or sort with `workflow:x history:y` | 6 | 0 | 1 |
| Each debounced (500 ms) grid search edit, unkeyed text | 3 | 0 | 1 |

The 150 is the theoretical ceiling. A broad term on a large server realistically fills the visible lookup (50) and adds a few deleted or hidden workflows.

## Challenges

### Per-option run counts

`workflowOption.detail()` (`invocationFilters.ts:157`) calls `getInvocationCountByWorkflowId`. `getItemById` in `useKeyedCache` fetches on a miss, so rendering an option issues `GET /api/workflows/{id}/counts`. The template calls `detail()` for every option with no virtualization, although the list shows only about six rows in its 20rem box.

- `LastQueue` keys per id, so it deduplicates but doesn't throttle across ids. The only global gate is the 100-per-3s client limiter, which every other `GalaxyApi()` call shares. A burst past 100 holds back the rest of the app, including the grid fetch, until the window resets.
- `StoredWorkflow.invocation_counts()` (`model/__init__.py:9142`) groups by state across every user's invocations. Results are not scoped to the requesting user. For a popular published workflow this is the most expensive per-option query, and "N runs" then reports everyone's runs in a menu about the user's own invocations.
- `useWorkflowCardBadges.ts` already handles this: it skips counts for workflows the user doesn't own, under the comment "only fetch counts for cards that can display them". The dropdown diverges from that path.

Options, cheapest first:

1. Apply the ownership gate, reusing the `matchesCurrentUsername` check `workflowOption` already makes.
2. Fetch counts only for options the user reaches, for example with a per-row child component and an intersection observer.
3. Add a bulk counts endpoint: one `GROUP BY stored_workflow_id` for the whole result set. This is the reusable option, since the workflow cards pay the same per-item cost.

Keep the rest of the entry's detail text either way. Run count is a stated feature of the PR, so this changes how it is fetched and not whether it exists.

The render path also re-renders the whole dropdown on each response, because options are inlined in one component. Vue batches this, so it is likely minor. Speculative, not measured.

### Name filter re-resolution

`getData` awaits `resolveInvocationFilters` (`invocations.ts:38`), and `watch([currentPage, filterText, sortDesc, sortBy])` (`GridList.vue:394`) calls it for every change. Page and sort changes can't alter the name resolution, but each repeats it.

The 102-statement index cost predates this PR and isn't the target here. The PR's change is that the grid becomes a new caller of those endpoints, three per name kind, and uses only the ids from those responses. At full lookups that is roughly 300-600 statements and 75-130 KB per page flip.

Options:

1. Memoize the last resolved search text in `invocationFilters.ts`. This is a small change with no API work, though resolved ids go stale until the text changes.
2. Add a name filter to `/api/invocations`, joining `stored_workflow` and `history` with the same `text_column_filter` the indexes use. One request replaces up to seven, and the id list and its URL growth disappear.

Option 2 also addresses a side effect of the cap. The visible lookup includes published workflows sorted newest-first, so on a large server other users' workflows can use up all 50 slots, and an older workflow the user actually ran drops out of the results without notice. The PR description states the cap and the choice of existing APIs, so present option 1 as the proposed fix and option 2 as the reusable alternative.

### History access check loop

`services/invocations.py:108` calls `get_accessible` per id, and `by_id` always issues a `SELECT`. Measured at n statements, and each one carries `History.update_time`'s correlated `max(history_audit.update_time)` subquery. `HistoryManager.by_ids` plus `error_unless_accessible` measured 1 statement at any n.

`by_ids` silently omits missing ids, so a fix must compare lengths to keep the not-found error. The instance branch at line 105 has the same per-id shape, but the client doesn't send `instance` on this path, so it matters less. Picked ids usually number a handful, so the real exposure is broad name filters repeated on each page flip.

### Stale grid responses

`getGridData` has no latest-request guard, unlike `GridColumnFilter.search`, which has `latestSearch`. Name resolution makes each fetch take longer and vary more, so a slow earlier search can overwrite a newer one. This is a bug observation found in passing, not the result of a bug hunt.

## Checked and cleared

- **Polling:** none in `GridList.vue` or `configs/invocations.ts`, so the costs above don't recur on a timer.
- **No-filter path:** `resolveInvocationFilters("")` issues no lookups, so `fetchLatestInvocations` and the unfiltered grid are unchanged.
- **Lazy dropdown:** nothing is fetched until a dropdown is first opened.
- **Join fan-out:** invocation to workflow is many-to-one, so `IN` doesn't multiply rows and no `DISTINCT` is needed.
- **Workflow existence check:** `found_ids` is one query at any n.
- **Indexes (from the model, plans not checked):** `workflow.stored_workflow_id`, `workflow_invocation.workflow_id` and `workflow_invocation.history_id` are all indexed. `create_time`, the default sort, is not, but that predates this PR and filtering shrinks the set to sort.
- **History `count`:** comes from a model property on the loaded row, with no per-row query seen in the measured statements.

## Disproved: request-line limit

Hypothesis: 3 x 50 ids per kind at 29 bytes each overruns gunicorn's `limit_request_line` (default 4094).

- With a sync worker this holds: 130 ids returned 200, 140 returned 400.
- Galaxy runs `galaxy.webapps.galaxy.workers.Worker` (gravity `state.py:331`), a uvicorn-based worker. The closest test, `uvicorn.workers.UvicornWorker`, returned 200 at 140, 150, 300, 1000 and 2500 ids.

So this isn't a server-side failure and isn't reported as a finding. Only a proxy could reject these. nginx's default 8 KB header buffer could be reached by the absolute worst case of 300 ids (about 8.7 KB), which takes two broad name filters that each fill all three lookups. This wasn't tested and is a corner case. A server-side name filter would remove it anyway.

## Measurement plan

Against a production-size Postgres snapshot, or a seeded one with about 1M invocations, one heavy user, and one published workflow with 100k+ invocations:

1. `EXPLAIN (ANALYZE, BUFFERS)` the counts query for the popular workflow, and the proposed bulk form:

   ```sql
   SELECT wi.state, count(wi.state)
   FROM stored_workflow sw
   JOIN workflow w ON w.stored_workflow_id = sw.id
   JOIN workflow_invocation wi ON wi.workflow_id = w.id
   WHERE sw.id = :id
   GROUP BY wi.state;
   ```

2. `EXPLAIN (ANALYZE, BUFFERS)` the grid query, and its count form, with 1, 50 and 150 ids in each list:

   ```sql
   SELECT wi.*
   FROM workflow_invocation wi
   JOIN workflow w ON wi.workflow_id = w.id
   JOIN history h ON wi.history_id = h.id
   WHERE w.stored_workflow_id IN (:wf_ids)
     AND h.user_id = :user
     AND wi.history_id IN (:history_ids)
     AND NOT EXISTS (
       SELECT a.id
       FROM workflow_invocation_to_subworkflow_invocation_association a
       WHERE a.subworkflow_invocation_id = wi.id
     )
   ORDER BY wi.create_time DESC
   LIMIT 25;
   ```

   Compare against the unfiltered user query. Also try ids of a popular published workflow, to see whether the planner drives from it instead of `history.user_id`.

3. Time `GET /api/workflows?search=name:rna&show_published=true&limit=50&skip_step_counts=true`, and the `/api/histories` equivalent for a user with 10k+ histories. The history index sorts on the correlated `update_time` subquery.

4. In a browser with DevTools, count requests for the actions in the accounting table on a server with many published workflows. Check whether a search delays the `/api/invocations` call.

5. Compare the `get_accessible` loop with `by_ids` for 50 ids on Postgres, to put a latency on the measured statement counts.
