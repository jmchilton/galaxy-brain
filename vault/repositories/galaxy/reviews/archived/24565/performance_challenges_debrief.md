# Performance challenges debrief: PR #24565

Reviewed commit: `fc477492afec572160601cd5d60e8d2d0f5b1be6` (base `dev`).

## What changes on the request path

The My workflows tab now calls `GET /api/workflows` with `show_shared=false`; the Published and Shared with me tabs are unchanged. No new requests, polling, or watchers are added, and request count per page view is the same (one `loadWorkflows` per filter/sort/page change).

## Effect on the generated query (`WorkflowsManager.index_query`, `lib/galaxy/managers/workflows.py`)

Before (My tab, `show_shared` defaulted to true by the API):

- `WHERE (stored_workflow.user_id = :me OR stored_workflow_user_share_connection.user_id = :me)`
- `JOIN galaxy_user` (deleted-owner filter) and `LEFT OUTER JOIN stored_workflow_user_share_connection`
- `DISTINCT`, then a separate `get_count` over the same statement for `Total_matches`.

After:

- `WHERE stored_workflow.user_id = :me` only; no `galaxy_user` join and no share-association outer join.

Both the page query and the count query get strictly simpler: the `OR` across two tables (which prevents a plain index lookup on `stored_workflow.user_id`) goes away, and the share join no longer fans rows out before `DISTINCT`. Response payloads also shrink, since rows the client was discarding by owner are no longer serialized. For users with many workflows shared with them, this is a net improvement on both server work and bytes transferred.

## Patterns checked

- Unbounded query / Python slicing: not applicable; `LIMIT`/`OFFSET` stay in SQL.
- Expensive field on a shared list endpoint: none added; `skip_step_counts` stays true.
- Avoidable requests: none added. Invalid `is:shared_with_me` on the My tab now short-circuits on the client (existing invalid-filter path), so no request is sent.
- Pre-existing `LEFT OUTER JOIN stored_workflow_tag_association` + `DISTINCT` is untouched by this PR and out of scope.

## Leftover client work from #23777

`workflowsLoaded` still filters the My tab by `userStore.matchesCurrentUsername(w.owner)`, and `loading` still waits for `userStore.currentUser` on the My tab. With `show_shared=false` and `show_published` false, the server can only return the caller's own workflows, so both are now redundant. Their cost is small (an O(page) filter and a display gate until the user store loads), so this is a simplification, not a measured performance problem.

## Measurement plan (not run)

These claims come from reading `index_query`; I did not run a Galaxy or Postgres instance. To confirm on production-sized data:

1. Seed a user with ~50 own workflows and ~5,000 workflows shared with them (plus tags).
2. Capture SQL for `GET /api/workflows?limit=24&offset=0&skip_step_counts=true` with and without `show_shared=false` (e.g. `sqlalchemy.engine` logging).
3. Run `EXPLAIN (ANALYZE, BUFFERS)` on both the page query and the `get_count` wrapper, and compare response size.

Expected: the `show_shared=false` variant uses an index on `stored_workflow.user_id` with no share-table scan, and its count reflects only owned rows.

## Recommendations

- None required for performance.
- Optional (P3): drop the now-redundant My-tab owner filter and user-loaded gate added in #23777, or note why they're kept.
