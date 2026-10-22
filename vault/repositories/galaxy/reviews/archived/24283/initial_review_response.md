Looks good to me - these issues seem like small hygiene worth considering but they don't excite me. The pr_24283_review_0 branch has test commits I don't think are worth it and that I stripped findings for. -John 

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this is an internal caching change to tool search with no API, schema, or artifact-format impact, so it can be reverted cleanly (a two-way door).

<details><summary>Risk Details</summary>

- Pooled searchers hold open file handles; searchers in the pool of a replaced `ToolWhooshIndex` (tuning/dir change on rebuild) are never closed and rely on GC to release them.
- A stale searcher is only closed when next popped, so after an index rebuild idle searchers keep deleted segment files open until reused.
- Pool size is unbounded and grows to peak concurrent searches per panel view.
- Freshness detection depends on Whoosh's `_MAIN_<gen>.toc` and segment-file naming, an implicit coupling to Whoosh internals.
- Targets `release_26.2`; a regression would surface as stale or empty tool search results.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should check `_reads_latest_commit` against the rebuild path (especially schema changes resetting generations) and confirm the file-handle lifetime is acceptable for multi-process deployments with many panel views.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24283_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24283_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24283_review_0) builds on the PR head `27544cf8f0c`. It tightens the lifetime of pooled Whoosh searchers. When a newer commit is seen, every stale idle searcher is closed, not just the popped one. `ToolWhooshIndex` gains a `close()`, which `CachedToolboxSearch` calls on panel searches it drops or replaces; searchers returned to a closed index after that are closed rather than pooled. The freshness check now reuses Whoosh's own TOC and segment filename patterns. The branch also adds the missing tests: a tuning change replaces the panel search, and a searcher that raised is never re-pooled. Tests are red-to-green, or were mutation-checked where they pass on the PR head.

- [`33381095e3a`](https://github.com/jmchilton/galaxy/commit/33381095e3a) Test that a tuning change replaces the cached panel search. A weighting-only `help_bm25f_k1` change must yield a new `ToolWhooshIndex`, because no commit would mark the old pooled searchers stale.
- [`e5a5f1f7e30`](https://github.com/jmchilton/galaxy/commit/e5a5f1f7e30) Close every stale idle searcher once a newer commit is seen. When the popped searcher is stale, the other idle searchers are checked against the same listing and the stale ones are closed.
- [`8b85921faa3`](https://github.com/jmchilton/galaxy/commit/8b85921faa3) Close the searcher pools of dropped panel searches. Adds `ToolWhooshIndex.close()`, which closes idle searchers now and searchers in use once they're returned. `_sync_panel_searches` calls it on every instance it doesn't carry forward.
- [`288cf152264`](https://github.com/jmchilton/galaxy/commit/288cf152264) Reuse Whoosh's TOC and segment filename patterns. Derives both from `TOC._pattern` / `TOC._segment_pattern` with `index._DEF_INDEX_NAME` instead of hard-coding `_MAIN_`.
- [`c35e992bf6c`](https://github.com/jmchilton/galaxy/commit/c35e992bf6c) Test that a searcher that raised is closed, not pooled. Pins the exception path of `_searcher()`.

</details>

</details>

### P3 1: Stale idle searchers stay open after a newer commit (implementation verified)

`_searcher()` pops one idle searcher. If that searcher is stale, `_searcher()` closes it and opens a fresh one, and the fresh one goes back on top of the LIFO stack. The other stale searchers below it are not checked again until concurrency reaches that depth. Until then they keep the replaced commit's segment files open. After a schema rebuild's `rmtree`, or after segment merges, those files are already deleted, so their disk space and descriptors stay held. The cost is bounded by peak concurrency × panel views × processes, so it's minor. Still, this is the one path where a pool built to hold resources leaks them.

<details><summary>Evidence</summary>

Build an index and check out three searchers concurrently, so the pool holds three. Then rebuild with a schema change and run a search. On the PR head, the two bottom searchers stay open after 100 sequential searches. On the review branch, `test_a_newer_commit_closes_every_stale_idle_searcher` fails on the PR head and passes once the fix is applied.

</details>

Suggested fix: when a popped searcher fails `_reads_latest_commit`, check the remaining idle searchers against the same directory listing and close the ones that fail. Don't drain the whole pool. Under LIFO, a fresh searcher can sit beneath a stale one that a slower thread returned later. Run the sweep only on the stale path, so ordinary searches are unchanged. Fixed on the review branch in [e5a5f1f7e30](https://github.com/jmchilton/galaxy/commit/e5a5f1f7e30).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Replaced or dropped `ToolWhooshIndex` instances don't close their pools (implementation verified)

`_sync_panel_searches` discards a `ToolWhooshIndex` in three cases: its panel view disappears, its `index_dir` changes, or its tuning changes. The same happens to every instance when `tool_search_index_dir` is unset. Nothing explicitly closes the discarded pool's searchers; the code relies on GC. There's a second gap: `CachedToolboxSearch.search` runs outside `_build_lock`, so a request can still hold a searcher from an instance that has just been dropped. When that request finishes, it returns the searcher to the dropped pool.

Suggested fix: give `ToolWhooshIndex` a `close()` that closes its idle searchers and marks the instance closed, so searchers returned later are closed instead of pooled. `_sync_panel_searches` then closes every instance it doesn't carry forward. The stale sweep (P3 1) and `close()` can share one idle-discard helper. Fixed on the review branch in [8b85921faa3](https://github.com/jmchilton/galaxy/commit/8b85921faa3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: new tests fail on the PR head and pass with the fix. The tests cover idle and later-returned searchers after `close()`, and assert that a searcher pooled by the replaced panel search is closed after a tuning-change rebuild.

</details>

### P3 3: Whoosh filename conventions are re-encoded rather than reused (implementation verified)

`_TOC_FILENAME` hard-codes `_MAIN_<gen>.toc`, and `_reads_latest_commit` infers segment ids by splitting filenames at the first `.`. Whoosh already encodes both, in `TOC._pattern(indexname)` and `TOC._segment_pattern(indexname)`, and defines the default name as `index._DEF_INDEX_NAME`. Both helpers are underscore-private. Whoosh is effectively frozen at 2.7.4, though, so depending on them is no riskier than copying them, and it keeps the code tied to the index name that `open_dir`/`create_in` actually use.

Suggested fix: `_TOC_FILENAME = TOC._pattern(index._DEF_INDEX_NAME)`, and collect segment ids with `TOC._segment_pattern(index._DEF_INDEX_NAME)`. Fixed on the review branch in [288cf152264](https://github.com/jmchilton/galaxy/commit/288cf152264).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the PR's existing `test_long_lived_index_sees_a_later_build` (same-schema and schema-change) and `test_search_before_the_index_exists` pass with the reused patterns. No dedicated test was added.

</details>
