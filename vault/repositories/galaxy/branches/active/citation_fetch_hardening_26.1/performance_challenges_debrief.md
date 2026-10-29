Run via Claude Opus 5.5 at high effort.

# citation_fetch_hardening_26.1: performance challenge debrief

Process: `GX_PROCESS_CHALLENGE_PERFORMANCE.md`, run on tip `3e5b464eb7b`. New tip: `618e17bb669`.

## Change made

**Per-request deadline on DOI lookups.** This went in as standalone commit `618e17bb669`, "Stop starting DOI lookups after a per-request deadline". The fixup into `42cc8b4ca71` conflicted with `3e5b464eb7b`, so the autosquash was aborted.
- Before: the budget limited only how many lookups ran. With the defaults (10 fetches × 10s timeout) a sync citations request could spend about 100s in sequential lookups. Raising `citation_max_fetches_per_request` raised that linearly.
- Now: `DoiFetchBudget.take()` also refuses once `DOI_FETCH_REQUEST_DEADLINE` (30s, a constant, no new config) has passed. DOIs left over get the existing stub, so the response shape is unchanged.
- Worst case is now about 30s plus one fetch timeout, because a lookup already in flight keeps its own bound.
- Test: `test_citations_to_bibtex_stops_fetching_after_deadline`. It patches only the clock the budget reads, not `bounded_get`'s. It was red before the change, and all 60 touched unit tests pass at the tip. mypy shows only the 3 errors that were already there in `citations.py`.

## Reviewed, no change

- **Beaker creation lock dropped (`e2e4c49cf00`).** This was a deliberate trade-off, and normal review 2 already covered it. I re-checked it in the beaker source.
  - The base `get(key, createfunc=)` held the creation lock while fetching.
  - On `ext:database` that lock is namespace-wide (`databasecontainer/funclock/doi`), so it serialized every DOI fetch across processes. Restoring it would be worse.
  - On the default `file` backend the lock was per key, so concurrent cold misses on the same DOI now fetch more than once.
  - Those duplicates are harmless: each request has a fetch budget, timeouts are short, and failures are cached for 10 minutes.
  - Optional follow-up: an in-process lock per key. It isn't worth the complexity on release_26.1.
- **History citations N+1 (pre-existing; based on reading code, not measured).** `HistoriesService.citations` iterates over `history.datasets`.
  - That loads every HDA, including deleted ones. Each HDA's `creating_job` then lazy-loads its job associations and the job, and copied HDAs also walk `source_dataset_chain`.
  - That is roughly 2–3 queries per dataset, which matters for histories with hundreds of thousands of datasets.
  - The branch doesn't make it worse; it only changes the return line. Replacing it with a single distinct-`tool_id` query changes the semantics for copied datasets, so it belongs on a separate branch targeting dev, with a query-count test.
- **bio.tools namespace rename (`39322243b13`).** After upgrade the cache starts cold. With `biotools_use_api` on, each tool that has a bio.tools xref and no local content refetches once, serially, during toolbox load.
  - Each fetch is now capped at 15s; base allowed 600s.
  - A failed lookup caches `None` under `createfunc`, which is base behavior. A flaky bio.tools during that first restart therefore pins misses for those tools until the cache expires.
  - The initial debrief already lists the refetch. Mention the cold-start cost in the PR body as well.
- **`CitationCollection.add` is O(n²) (pre-existing; measured).** Microbenchmark on mixed DOI and 1KB BibTeX citations, with no fetches:

  | Citations | Time |
  |---|---|
  | 500 | 0.01s |
  | 2000 | 0.14s |
  | 5000 | 0.96s |

  - The branch makes this better: mixed comparisons no longer fetch, and each tool is capped at 50 citations.
  - Realistic histories (a few citations per tool) are far below the range where this matters.
  - Since the branch, `equals` matches keying on `("doi", doi)` / `("bibtex", raw)`, so a set-based dedupe would be easy as a follow-up.
- **`bounded_get` opens a new `Session` per call (no connection pooling).** The base did the same. Note only.
- **Client.** `Citation/services.ts` fetches once per mount and doesn't poll. The branch doesn't change the client.
- **DB.** The branch adds no new queries. The `ext:database` beaker get/put path is the same as base, minus the lock.
