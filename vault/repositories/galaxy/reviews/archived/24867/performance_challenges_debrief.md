# Performance challenges debrief — PR #24867

- Profile: gx_performance_challenger
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: 59603c8e04222901ba5a13da34c5025e87c6be25
- Method: code reading only (no Galaxy run, no vitest; deps not installed). Request counts below are reasoned from Vue watcher semantics, not measured.

## Scope

Client-only change to `client/src/components/Workflow/Import/TrsSearch.vue`: the search watcher moves from `query` to `[query, trsServer]`, gains a monotonic `searchCount` stale-response guard, and passes `query`/`trs_server` as axios `params`. `onTrsSelection` clears the query only when switching servers. Backend `/api/trs_search` (`lib/galaxy/webapps/galaxy/api/trs_search.py`) is a synchronous proxy to the remote TRS server (Dockstore/WorkflowHub), so each request ties up a Galaxy worker on an upstream call — request count is the thing to watch.

## Request volume, case by case

| Scenario | Before | After |
| --- | --- | --- |
| Typing | 1 request per debounced `query` change (500 ms `BFormInput debounce`) | Same; debounce lives on the input, `query` still only updates post-debounce |
| Initial load, empty query | 0 | 0 (`trsServer` set, `query == ""` short-circuits) |
| Initial load, query typed before servers arrive | 1 request with `trs_server=` empty (wasted/erroring), then query wiped | 0 until server arrives, then exactly 1 correct request |
| Switch server with query | 0 (query cleared) | 0 — `query = ""` and `trsServer = id` are set in the same tick, the default `pre`-flush watcher runs once and short-circuits on empty query |
| Re-select same server | 0 (query cleared) | 0 (neither source changes; query kept) |
| Esc / clear button | 0 | 0 |

Net: no new requests in any path; one wasted request (empty `trs_server`) removed. Debounce preserved.

## Stale-response guard

Sound. `searchId` is captured synchronously before the first `await`, every watcher run (including the empty-query early return) bumps `searchCount`, and all three post-await writes (`results`, `errorMessage`, `loading`) are gated on `searchId === searchCount`. Clearing the query while a request is in flight therefore drops the late response and leaves `loading` false. Out-of-order responses can't overwrite newer results.

The guard discards superseded responses but does not cancel them; the browser and the Galaxy worker still finish the upstream TRS call. This is unchanged from before the PR (the old code also never aborted), and with the 500 ms debounce at most a couple of overlapping requests are realistic. An `AbortController` passed to axios (`signal`) would free the browser connection, but would not stop the synchronous backend proxy call, so the server-side saving is minimal. Not raised as a finding.

## Patterns checklist

- Unbounded queries / ORM / SQL / CTE patterns: not applicable (client-only).
- "Don't issue the request at all" (#18969): the PR moves in this direction — it stops the empty-`trs_server` request.
- Polling / rate limiting: no polling introduced.
- Response size: unchanged (`/api/trs_search` result passed straight through).

## Measurement plan (if wanted)

Not needed for merge. To confirm the table: open Workflow > Import > TRS search with network throttling on `/api/trs_consume/servers`, type during the delay, switch servers with a query present, and count `/api/trs_search` entries in DevTools (expect 1, then 0). The new `TrsSearch.test.ts` already asserts the first case exactly (`searches` equals one entry).

## Bugs noticed (not hunted)

None. (Pre-existing, untouched: `errorMessage` is never reset on a successful later search; out of scope.)

## Suggestions

None rising to P1/P2/P3.
