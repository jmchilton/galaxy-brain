Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1: performance challenge debrief (pass 2, after re-scope)

Process: `GX_PROCESS_CHALLENGE_PERFORMANCE.md`, run fresh on tip `c096e6ce883`. New tip: `c05b250203b`. No production code changed. First pass: [earlier_drafts/1/performance_challenges_debrief.md](earlier_drafts/1/performance_challenges_debrief.md).

## Change made

**Test pinning that cache hits don't spend the fetch budget.** Folded as a fixup into "Share cached_fetch between DOI and bio.tools lookups" (now `9d950f82ad6`); autosquash was clean.
- `test_cached_fetch_hits_do_not_ask_may_fetch`: cached successes, cached failure markers and cached 404 markers return without calling `may_fetch`. So a request full of cached or recently-failed DOIs never burns `DoiFetchBudget` slots or its deadline.
- Already true in code (`may_fetch` is only consulted on `KeyError`); previously only covered indirectly for successes by `test_citations_to_bibtex_limits_fetches`. This pins it, so the test was green from the start.
- Touched unit tests pass: 59 at `9d950f82ad6`, 60 at tip.

## Measured, no change

**bio.tools failure TTL at tool load (the cost the re-scope added).** With `biotools_use_api` on, a failing lookup is now retried after 1h instead of pinned as `None` forever. Timed with `bounded_get` from a scratch script on macOS:

| Failure mode | Branch (`bounded_get`) | Base (`requests.get`, timeout=600) |
|---|---|---|
| Connection refused | 0.01s | similar |
| NXDOMAIN | 0.05s | similar |
| Blackholed host | 15.0s | 75.0s (OS connect timeout) |

- The only expensive case is a blackholed bio.tools. Base paid about 75s per xref once and never recovered. The branch pays 15s per xref, and pays it again only on restarts more than 1h apart while the outage lasts. It reaches base's cost only after about 5 such restarts inside one outage.
- Typical outages (5xx, refused, DNS) fail in milliseconds. `biotools_use_api` defaults to false.
- Not adding back-off on release_26.1: tools loaded during a back-off window would silently lose bio.tools EDAM data, and that is an author decision. Optional follow-up: a per-process back-off after a transport failure, which would be small via the existing `may_fetch` hook.

**Beaker namespace I/O is quadratic (pre-existing).** Beaker's `file` backend keeps a whole namespace in one pickle file, so each get unpickles all of it and each put rewrites it. `ext:database` likewise stores one row per namespace. Microbenchmark, 10KB values, `file` backend:

| Entries | Base cold fill (`get(createfunc=)`) | Branch cold fill (`cached_fetch`) | Branch warm reads |
|---|---|---|---|
| 200 | 0.92s | 0.80s | 0.07s |
| 1000 | 9.84s | 9.34s | 2.12s |

- The branch is slightly faster than base (no creation-lock re-read).
- The `biotools` namespace rename forces one cold refill after upgrade, the costly case above. On the other hand, splitting bio.tools out of `doi` shrinks both pickles.
- DOI failure-marker puts are capped by the per-request budget, so they're negligible.
- Follow-up only (dev): a per-key backend or `cache.type` guidance for large toolboxes with `biotools_use_api`.

## Reviewed, no change

- **All fetch callers are budgeted.** The only `to_bibtex` fetch paths are the tool and history citations endpoints, both through `CitationsManager.citations_to_bibtex`. `agents/operations.py:get_tool_citations` doesn't fetch. `equals` no longer fetches for mixed types.
- **Endpoints run off the event loop.** `/api/histories/{id}/citations` is a sync `def` (threadpool) and the tool citations endpoint is a legacy controller, so the 30s DOI deadline blocks a worker thread, not the loop.
- **`DEFAULT_CACHE` shared module dict.** Unbounded, but keyed by bio.tools IDs from xrefs (bounded by the tools linted). Base's class-level `backend` dict was shared the same way. Galaxy itself uses the beaker cache, not this.
- **`bounded_get` opens a `Session` per call** (one TLS handshake per cold lookup). Same as base `requests.get`. Note only.
- **Carried from pass 1, unchanged by the re-scope, not re-measured:** history citations N+1 over `history.datasets` (pre-existing, read not measured, dev follow-up); `CitationCollection.add` O(n²) (pre-existing, measured 0.96s at 5000 citations, branch improves it); beaker creation lock dropped (deliberate, duplicates on concurrent cold misses are budget-bounded).
- **DB / client.** No new queries; no client changes or polling.
