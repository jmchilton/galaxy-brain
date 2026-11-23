# Performance review: #24708

- **Profile:** `gx_performance_challenger`
- **Model:** Opus 5.5 (claude-opus-5-5)
- **Effort:** medium
- **Reviewed commit:** `86a724b7bf5e37461797d823287e193afe61fff7`

The server's multi-value filter is sound: the `IN` joins don't fan out, and nothing polls. The problems are client request fan-out and one per-id server loop.

Evidence labels:

- **Measured:** SQL statement counts from PR code on the unit-test harness (SQLite).
- **Traced:** read from code. The worktree has no `client/node_modules`, so these weren't run in a browser.
- **Not measured:** latency and Postgres plans. No Postgres was available.

Details and a measurement plan are in [performance_challenges_debrief.md](performance_challenges_debrief.md).

## P1 1: Workflow dropdown sends one `/counts` request per listed workflow

`workflowOption.detail()` (`client/src/components/Grid/configs/invocationFilters.ts:157`) calls `getInvocationCountByWorkflowId`, which fetches on a cache miss, and the template renders every option. Opening the dropdown sends up to 20 `GET /api/workflows/{id}/counts` requests. Each typed search adds one per new id, up to 150 in theory and about 50 or more for a broad term on a large server. The list shows only about six rows at a time.

This goes against the guidance to limit client request counts and not risk the rate limiter:

- The keyed cache deduplicates per id but doesn't throttle across ids. A burst past 100 requests in 3 seconds holds back every other `GalaxyApi()` call, including the grid fetch.
- `StoredWorkflow.invocation_counts()` groups across all users' invocations, so other people's popular published workflows are the most expensive rows to count. The label "N runs" then reports everyone's runs in a menu about the user's own invocations.
- `useWorkflowCardBadges.ts` already skips counts for workflows the user doesn't own. This new path diverges from that.

**Fix:** only request counts for workflows the user owns, reusing the `matchesCurrentUsername` result `workflowOption` already computes. This still sends up to 20 requests per open, so the better fix is a bulk counts endpoint using one `GROUP BY stored_workflow_id`, which the workflow cards could also adopt. Run counts remain a feature either way.

Evidence: traced. Query cost on a popular workflow is not measured.

## P2 1: Name filters re-resolve on every page flip and sort

`getData` awaits `resolveInvocationFilters` (`client/src/components/Grid/configs/invocations.ts:38`), so each page or sort change repeats the name lookups even though the search text is unchanged. With `workflow:x history:y`, that is 6 index requests plus the invocations call. Unkeyed text costs 3 lookups per debounced edit.

The grid uses only the ids from those responses. Each full 50-row lookup measured 102 statements and at least 18-25 KB of JSON, so one page flip can cost roughly 300-600 statements and 75-130 KB. The index endpoints' per-row cost predates this PR, and isn't what this finding asks to change; the PR is adding repeated callers of them.

**Fix:** memoize the last resolved search text in `invocationFilters.ts`, so only a text change re-resolves.

A reusable alternative is a name filter on `/api/invocations`, implemented as a SQL join with the same `text_column_filter` the indexes use. That means one request instead of up to seven and no id list. It would also stop other users' recently updated published workflows from filling the 50-match cap and pushing out workflows the user actually ran. The PR description states the cap and the use of existing APIs, so this is an option to consider and not a request to reverse that decision.

Evidence: statement counts measured; request counts traced.

## P3 1: History access check runs one query per id

`lib/galaxy/webapps/galaxy/services/invocations.py:108` loops over `get_accessible`, which measured 1, 10, 50 and 150 statements for the same number of ids. Each statement carries `History.update_time`'s correlated subquery. The cost is small for a few picked ids and larger for name filters, where it repeats on each page flip.

**Fix:** call the existing `HistoryManager.by_ids`, then `error_unless_accessible` per item. This measured 1 statement at every size. `by_ids` omits missing ids silently, so compare lengths to keep the not-found error.

Evidence: measured.

## P3 2: Slow grid responses can overwrite newer ones

`getGridData` (`client/src/components/Grid/GridList.vue:237`) has no latest-request guard, although the new `GridColumnFilter.search` does. Name resolution makes each fetch longer and more variable, so a slow earlier search can overwrite the result of a newer one.

**Fix:** add the same request counter, or abort the earlier fetch.

Evidence: traced. Found in passing, not from a bug hunt.
