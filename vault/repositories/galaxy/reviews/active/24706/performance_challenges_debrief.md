# Performance challenge debrief: #24706

Profile gx_performance_challenger, model claude-opus-5-5, medium effort, reviewed commit `5006c8fbfe3a91c7f12f628fdd543c478f1854fa`, compared with `origin/dev`.

## Verdict

The SQL is sound, and the PR's claim that rewrites and covering indexes don't help holds up on an independent dataset. Open question: "bounded by one user's data" is not a bound for heavy users, and the PR's table stops at 27k datasets, warm. Warm cost reaches 5 s at 1M datasets on favorable layout. The storage overview already pays a comparable total once per visit; the PR adds paying it on every sort click and page. True cold cost is unmeasured.

## What was measured

Scratch PostgreSQL 16.2 on a local NVMe laptop, not a Galaxy instance. `shared_buffers=2GB`, `work_mem=64MB`, `jit=off`, `random_page_cost=1.1`. SQL hand-transcribed from `History.disk_size` and `index_query`, not captured from a running Galaxy.

Data: 217k histories, 9.3M HDAs, 9.3M datasets, 5.6 GB. Filler users hold 200k histories / 5M HDAs, as in the PR's profile. Four target users: 400 histories / 27k HDAs (the PR's "own" row), 2k / 250k, 5k / 1M, 10k / 3M. Sizes in the larger three are skewed (largest history of the 1M user: 119k HDAs). 10% of HDAs share a dataset, 5% of each are purged.

Limits:

- HDA width is approximate (minimal metadata, four-md5 peek).
- Two physical layouts, bracketing production. Interleaved: HDAs placed randomly, so nearly every row is a new page (pessimistic). Clustered: HDAs and datasets ordered by history (optimistic).
- OS page cache could not be dropped without sudo. "Slowest run" is the maximum of 3-5 repeats per user, which followed other work or (clustered) a server restart. The script did not record run order, so taking it as the first-touch cost is an inference. It understates truly cold reads, especially for clustered, whose pages had just been rewritten.
- Warm timings were noisy under buffer pressure on the interleaved layout: a repeat of the same query at 250k gave a 7.5 s median against 1.8 s. Trust clustered warm numbers and page counts over interleaved medians.
- The 1M and 3M users are hypothetical. I have no production distribution.

### Sort by size, 24 rows, own histories

| user datasets | update_time sort | clustered, warm median | clustered, slowest run after restart | interleaved, warm median | interleaved, slowest run | pages touched |
|---|---|---|---|---|---|---|
| 27k | 0.2 ms | 57 ms | 1.6 s | 86 ms | 5.0 s | 105k-130k |
| 250k | 2.6 ms | 835 ms | 1.2 s | 1.8 s | 29 s | 1.0M-1.2M |
| 1M | 0.3 ms | 5.2 s | 5.8 s | 8.8 s | 28 s | 3.9M-4.8M |
| 3M | 0.2 ms | not run | not run | 17 s | 18 s | 14.4M |

Update-time timings are from the interleaved layout. Page counts are `EXPLAIN (ANALYZE, BUFFERS)` hit plus read, which repeat-count the same page and don't depend on this machine. The 27k clustered warm row reproduces the PR's 60 ms. Per-dataset warm cost was 2.1 µs at 27k, 3.3 µs at 250k and 5.2 µs at 1M, so the PR's 2 µs figure is not constant at larger scale. The clustered plans showed zero shared reads, so this growth isn't I/O. Cause not established; per-history `DISTINCT` sorts on skewed histories are a guess. The slowest-run columns are an upper bracket only: they aren't monotonic (29 s at 250k, 18 s at 3M), which points to cache state rather than scale.

### Claims in the PR, tested

| claim | result |
|---|---|
| Grouped aggregate saves at most 10-20% | Holds. Interleaved: 7.3 s vs 8.8 s at 1M, 17.6 s vs 17.4 s at 3M, slower at 27k and 250k, same pages touched |
| Covering index saves at most 10-20% | Holds. Index-only scans on clustered data: 5.0 s vs 5.2 s at 1M, 49 ms vs 57 ms at 27k, about 20% fewer pages. Each index 279 MB against a 199 MB dataset pkey. Measured on clustered only; a first attempt on interleaved failed to build the indexes and is discarded |
| Cost dominated by per-dataset PK lookup | Holds. At 1M: 948k dataset PK loops account for 3.8M of 4.8M pages |

### Plan checks with no problem found

- History-id filter is pushed into the `DISTINCT` subquery: inner index scan on `history_id`, 5000 loops at the 1M user. No full HDA scan.
- `disk_size` evaluates once per history. `ORDER BY` uses the select-list label.
- `total_matches` is counted before the size column is added, so the count query doesn't pay.
- The handler is sync `def`, so the event loop isn't blocked.
- `HistoryList` has no polling; reloads come from filter, sort, paging and actions.
- Route changes remount the list (`routerViewKey` in `Analysis.vue`), so a size sort shouldn't carry into Shared and hit the 400. Read from code, not run.
- The `limit` validation is a real improvement: search mode no longer returns unbounded rows when `limit` is omitted.

### Badge fan-out

Each card's `HistoryDatasetsBadge` issues `GET /api/histories/{id}?keys=nice_size,contents_active,contents_states` on mount (pre-existing). The size sort changes which histories those are.

Approximate SQL for the three keys, run serially, HDA tables only (no HDCA side, no serialization):

| user | recent 24 histories | largest 24 histories | HDAs in largest 24 |
|---|---|---|---|
| 27k | 7 ms | 17 ms | 6.7k |
| 250k | 13 ms | 239 ms | 83k |
| 1M | 9 ms | 1.6 s | 263k |

### Existing paths with the same cost

Read from code, not run.

- Storage overview: `fetchAllHistoriesSizeSummary` requests `keys=size` for all non-purged histories with no limit, so each history runs the instance `disk_size` query. A heavy user already pays the total once per visit.
- Legacy index: `GET /api/histories?order=size-dsc` reaches `HistoryManager.parse_order_by` via `_build_order_by`. With `all=true` it gives admins the all-histories sort that search mode now refuses.
- `HistoryStorageCleanerManager` sorts by the same expression, but only over a user's discarded or archived histories, a narrower population than the main list.

## Recommendations

### 1. Get production numbers, then decide on a guard

Run on a usegalaxy.* replica, read-only:

```sql
-- datasets per user among listable histories; how many users are in the seconds range?
SELECT h.user_id, count(DISTINCT h.id) AS histories, count(*) AS hdas
FROM history h JOIN history_dataset_association a ON a.history_id = h.id
WHERE NOT h.deleted AND NOT h.purged AND NOT h.archived AND h.user_id IS NOT NULL
GROUP BY h.user_id ORDER BY hdas DESC LIMIT 100;
```

Then log the emitted SQL from the PR, and run `EXPLAIN (ANALYZE, BUFFERS)` for the p50, p99 and top user, once cold and once warm. Compare with the proxy timeout and whatever statement limits the deployment sets. Galaxy itself sets no `statement_timeout`.

If the top users land in the tens of seconds, options, cheapest first:

- Cost guard: reject with a clear 400 above a budget, estimated from `sum(history.hid_counter)` over the listing, an index-friendly upper bound on contents. This is the same "refuse rather than run it" reasoning the PR already applies to published and admin listings. Not prototyped.
- Precomputed per-history size, maintained out of band (past pattern: prefer precomputation over per-request aggregates). Larger, and shares staleness concerns with `disk_usage`. Not prototyped.

### 2. Don't stack size-sort requests

`loadGeneration` drops stale responses client-side, but the server query keeps running, with nothing aborting it. `ListHeader` sort buttons stay enabled while loading. Each toggle or page click recomputes every history's size.

### 3. Don't re-sum for badges

Fetch badges only for visible cards, or carry the already-computed size to the card when sorting by size. `index_query` computes the value and `scalars()` discards it. Modest value, and the count keys still need fetching.

## Measurement plan for a follow-up

Same replica queries as above, plus a first-page load in the browser for a top-decile user, counting requests and total DB time including badges. No Galaxy server was started for this review; client behavior comes from reading code.
