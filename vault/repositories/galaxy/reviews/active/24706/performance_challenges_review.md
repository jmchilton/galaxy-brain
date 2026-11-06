# Performance challenges review: #24706

Profile gx_performance_challenger, model claude-opus-5-5, medium effort, reviewed commit `5006c8fbfe3a91c7f12f628fdd543c478f1854fa`.

Verdict: no P1. SQL plan is sound, and the PR's "rewrites and covering indexes don't help" claim reproduced. The open issue is scale above the PR's profiled user. Measurements, setup and limits: [performance_challenges_debrief.md](performance_challenges_debrief.md). All numbers come from a synthetic 9.3M-HDA PostgreSQL 16 dataset with hand-transcribed SQL on a laptop, not production. The heavy users are hypothetical.

### P2 1: Heavy users pay a full size recompute on every sort click and page

The PR profiles one own-histories case (400 histories / 27k datasets, 60 ms, warm) and concludes the restriction bounds the cost. It bounds who pays, not how much. Galaxy targets histories with hundreds of thousands of datasets, and cost keeps scaling with the user's datasets.

The total is not new: the storage overview (`fetchAllHistoriesSizeSummary` in `client/src/components/User/DiskUsage/Visualizations/service.ts`) already sums every non-purged history once per visit, with one query per history. What this PR adds is paying it repeatedly from the main history list. `limit` and `offset` don't reduce it, so each toggle and each page re-sums all of the user's histories.

| user datasets | update_time sort | size sort, warm (clustered layout) | size sort, slowest of 3-5 runs (clustered / interleaved layout) |
|---|---|---|---|
| 27k | 0.2 ms | 57 ms | 1.6 s / 5.0 s |
| 250k | 2.6 ms | 835 ms | 1.2 s / 29 s |
| 1M | 0.3 ms | 5.2 s | 5.8 s / 28 s |
| 3M | 0.2 ms | not run (17 s warm, interleaved) | not run / 18 s |

The warm clustered column is the firm result: it rises steadily and its 27k row reproduces the PR's 60 ms. Per-dataset cost grew from 2.1 µs to 5.2 µs at 1M, with no reads in the measured plan, so that growth isn't I/O; the cause is not established. Page accesses also rise steadily (105k, 971k, 3.9M), independent of this machine.

The slowest-run column is only an upper bracket and isn't monotonic (29 s at 250k, 18 s at 3M), which points to cache state rather than scale. Run order wasn't recorded and the OS cache couldn't be dropped, so true cold cost is unmeasured. It is still worth measuring, because the PR's table is warm only and an occasional cleanup feature will often start cold.

Before merge, run the query on a usegalaxy.* replica for p50, p99 and top users, cold and warm. The debrief has the SQL. Add the results to the PR. If top users reach tens of seconds, add a guard: reject with a clear 400 above a budget estimated from `sum(history.hid_counter)` over the listing. This matches the PR's existing refusal of published and admin listings. The guard is not prototyped. Whether a guard is needed depends on production data I don't have; if few users are in that range, this drops to P3.

### P3 1: Size-sort requests stack up because nothing stops or cancels them

`load()` in `client/src/components/History/HistoryList.vue` uses `loadGeneration` to ignore stale responses, but the abandoned query still runs to completion on the server. The sort buttons in `client/src/components/Common/ListHeader.vue` have no disabled state while loading. Toggling direction or paging while a many-second query runs adds another full recomputation, since every request re-sums every history regardless of `limit` and `offset`. Galaxy sets no `statement_timeout`. From reading code; concurrent load not measured.

Disable the sort buttons while a load is in flight, for example by passing `loading || overlay` to `ListHeader`, as `FilterMenu` already receives.

### P3 2: Sorting by size points the per-card badge fan-out at the largest histories

Each card's `HistoryDatasetsBadge` already requests `nice_size,contents_active,contents_states` on mount, which is pre-existing, but this sort makes those the user's biggest histories, and re-sums the size the list query just computed and `scalars()` discarded. Approximate serial SQL for 24 badges at the 1M user: 1.6 s for the largest 24 (263k HDAs) against 9 ms for the most recent 24. At 27k: 17 ms against 7 ms, so this only matters for heavy users.

Fetch badges only for visible cards, or carry the computed size to the card when sorting by size. The count keys would still need a request.

### P3 3: The 400 for admin listings diverges from the legacy path

`GET /api/histories?order=size-dsc` without `search` reaches `HistoryManager.parse_order_by`, which orders by `disk_size`, with no default limit. With `all=true`, an admin gets the same all-histories sort this PR refuses as too expensive (10.4 s in its table). Read from code, not run. The restriction still protects non-admins from published listings, so it stands; only the admin rationale is inconsistent.

Mention this in the PR, or apply the same refusal to `order=size*` with `all=true`.
