# Performance challenge debrief: #24747

- Profile: gx_performance_challenger
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: f76e9ce6925d (compared against merge-base ab036aead321)

Verdict: the client cost is bounded and matches the PR description. No P1 or P2. Two P3s, in [performance_challenges_review.md](performance_challenges_review.md).

The second request itself is a stated tradeoff and is not challenged here.

## PR claims checked (by reading the code)

| Claim | Result | Evidence |
| --- | --- | --- |
| Registered users only | True for the new trigger | `hasOtherQuotaSources` requires `isRegisteredUser` (`userStore.ts:185`). The `wasRequested` path predates the PR and reloads for any page that asked. |
| Multi-source servers only | True, with one edge case | Gate is `enable_quotas && quota_source_labels.length`. A labeled source with its quota disabled passes the gate but isn't listed (P3 2). |
| At most every 5s while jobs change history size | True, per visible tab | See below. |
| Storages load only when a name is shown | True of this PR's code; rarely saves a request | See below. |

### The 5s bound

- Current history: `watchHistory.js:101` refreshes only on `didHistorySizeChange`. Other tracked histories: `watchOwnHistorySize`. Both go through one `useThrottleFn(..., 5000, trailing, leading)`.
- `refreshStorageUsageThrottled` does nothing while the tab is hidden, and refreshes once on return.
- `loadQuotaUsages(true)` keeps one request in flight and one queued, so slow responses can't stack. This also covers the unthrottled `refreshStorageUsageInBackground` callers (purges, storage operations).
- `App.vue` skips `startWatchingStorageUsage` when embedded, and `embedded` includes iframes, so window manager frames don't add a load.

Not covered by the wording, none worth a finding:

- The bound is per tab, so two visible windows double it.
- The focus refresh has its own 60s throttle and can coincide with a size-change refresh.
- In `watchOwnHistorySize` an unknown previous size counts as changed, so a stored history without `size` refreshes on each SSE event for it, still within 5s.

### Lazy storage loading

`quotaSourceName` creates `objectStoreStore` on first use, and the popover's `isShown` guard delays that until hover. Both work as described.

On pages with a history panel the store usually exists already: `ContentExpirationIndicator` creates it for each `ContentItem`, and `StorageLocationIndicator` creates it in `HistoryDetails` when `object_store_allows_id_selection` is set. So the laziness saves a request mainly on pages without those components. It adds none anywhere, so this is context and not a defect.

### Client render cost

Each reload replaces `quotaUsages` and `sourceUsageByKey`. Consumers are few and cheap: the meter, `HistoryMessages` (through computed booleans and strings), and a popover list that renders only while open. Not per-dataset, so no finding. Not profiled.

## Measured: SQL per `/api/users/current/usages`

Script: [performance_challenges/count_usage_queries.py](performance_challenges/count_usage_queries.py). It calls `UserSerializer.serialize_disk_usage` on the PR's `lib` with `MockApp` on in-memory SQLite and counts statements through SQLAlchemy events.

Limits of this data:

- Counts only. Docker was down, so there is no Postgres run and no latency figure.
- It excludes request auth and session work.

| Non-default labels | Sources (S) | Statements | `get_quota` runs | `engine.connect` calls |
| --- | --- | --- | --- | --- |
| 0 | 1 | 4 | 3 | 3 |
| 1 | 2 | 7 | 6 | 6 |
| 3 | 4 | 13 | 12 | 12 |
| 10 | 11 | 34 | 33 | 33 |

So 3S+1 statements: `quota_percent`, `quota` and `quota_bytes` each rerun the same `get_quota` query for each source, on its own `engine.connect()`, plus one lazy load of `quota_source_usages`.

At the 5s bound with S=4, that is 12 requests and 156 statements per minute per visible tab while history sizes change.

From reading the serializer (not measured), `/api/users/current` runs 3 `get_quota` calls per refresh too. So S=4 takes `get_quota` from 3 to 15 per refresh on an active tab.

Prototype in the same script, one `get_quota` per source using `get_percent`'s existing `quota` argument: output identical to the current serializer for 0, 3 and 10 labels. Statements were 3, 6 and 13, which includes one user reload caused by the script's `expire_all`, so S+1 in the serializer.

## Measured: load gate against listed sources

Script: [performance_challenges/label_gate.py](performance_challenges/label_gate.py). One default backend plus one backend with `source: scratch, enabled: false`:

```
config labels: ['scratch']
usages labels: []
```

`get_quota_source_labels` includes the disabled label, while `ids_per_quota_source` drops it. The watcher loads, but the popover and warnings have nothing extra to show.

## Measurement plan for a production-size check

Worth running only if P3 1 is contested.

1. Run against Postgres with a user holding several `user_quota_association` and group quota rows, and S of 1, 4 and 11.
2. Log statements and `pg_stat_statements` mean time for the `get_quota` query, and pool checkout wait under concurrency.
3. Replay 12 requests per minute per active user at the server's expected number of active users.
4. Compare the current serializer with the one-lookup prototype.

## Past patterns checked

- "Don't issue the request at all" (#18969): already gated for single-source servers, anonymous users, hidden tabs and unchanged sizes, except the edge case in P3 2.
- Polling and rate limiter risk: bounded as above.
- Unbounded responses: the response has one small row per source.
- The other patterns (SQL limits, ORM flushes, CTEs, joins) don't apply: the PR changes no backend code.

## Security

No security findings.
