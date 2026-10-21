### P2 1: No test that a tuning change replaces the pooled panel search (implementation verified)

`CachedToolboxSearch._sync_panel_searches` keeps a `ToolWhooshIndex`, and its searcher pool, only when the panel view's `index_dir` and `tuning` are unchanged. `test_rebuild_keeps_the_panel_searches_of_unchanged_views` covers only the "kept" branch. A weighting-only change such as `tool_help_bm25f_k1` matters most here. The corpus doesn't change, so no commit happens and `_reads_latest_commit` stays true. If the tuning comparison regressed, pooled searchers would keep serving the old weighting indefinitely, and no current test would fail.

Suggested fix: add the inverse test. Rebuild with a changed `help_bm25f_k1` and assert that `cached_panel_searches["default"]` is a new instance carrying the new tuning.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the added test passes on the PR head and fails when `or panel_search.tuning != tuning` is removed.

</details>

### P3 1: Stale idle searchers stay open after a newer commit (implementation verified)

`_searcher()` pops one idle searcher. If that searcher is stale, `_searcher()` closes it and opens a fresh one, and the fresh one goes back on top of the LIFO stack. The other stale searchers below it are not checked again until concurrency reaches that depth. Until then they keep the replaced commit's segment files open. After a schema rebuild's `rmtree`, or after segment merges, those files are already deleted, so their disk space and descriptors stay held. The cost is bounded by peak concurrency × panel views × processes, so it's minor. Still, this is the one path where a pool built to hold resources leaks them.

<details><summary>Evidence</summary>

Build an index and check out three searchers concurrently, so the pool holds three. Then rebuild with a schema change and run a search. On the PR head, the two bottom searchers stay open after 100 sequential searches. On the review branch, `test_a_newer_commit_closes_every_stale_idle_searcher` fails on the PR head and passes once the fix is applied.

</details>

Suggested fix: when a popped searcher fails `_reads_latest_commit`, check the remaining idle searchers against the same directory listing and close the ones that fail. Don't drain the whole pool. Under LIFO, a fresh searcher can sit beneath a stale one that a slower thread returned later. Run the sweep only on the stale path, so ordinary searches are unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Replaced or dropped `ToolWhooshIndex` instances don't close their pools (implementation verified)

`_sync_panel_searches` discards a `ToolWhooshIndex` in three cases: its panel view disappears, its `index_dir` changes, or its tuning changes. The same happens to every instance when `tool_search_index_dir` is unset. Nothing explicitly closes the discarded pool's searchers; the code relies on GC. There's a second gap: `CachedToolboxSearch.search` runs outside `_build_lock`, so a request can still hold a searcher from an instance that has just been dropped. When that request finishes, it returns the searcher to the dropped pool.

Suggested fix: give `ToolWhooshIndex` a `close()` that closes its idle searchers and marks the instance closed, so searchers returned later are closed instead of pooled. `_sync_panel_searches` then closes every instance it doesn't carry forward. The stale sweep (P3 1) and `close()` can share one idle-discard helper.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: new tests fail on the PR head and pass with the fix. The tests cover idle and later-returned searchers after `close()`, and assert that a searcher pooled by the replaced panel search is closed after a tuning-change rebuild.

</details>

### P3 3: Whoosh filename conventions are re-encoded rather than reused (implementation verified)

`_TOC_FILENAME` hard-codes `_MAIN_<gen>.toc`, and `_reads_latest_commit` infers segment ids by splitting filenames at the first `.`. Whoosh already encodes both, in `TOC._pattern(indexname)` and `TOC._segment_pattern(indexname)`, and defines the default name as `index._DEF_INDEX_NAME`. Both helpers are underscore-private. Whoosh is effectively frozen at 2.7.4, though, so depending on them is no riskier than copying them, and it keeps the code tied to the index name that `open_dir`/`create_in` actually use.

Suggested fix: `_TOC_FILENAME = TOC._pattern(index._DEF_INDEX_NAME)`, and collect segment ids with `TOC._segment_pattern(index._DEF_INDEX_NAME)`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort: the PR's existing `test_long_lived_index_sees_a_later_build` (same-schema and schema-change) and `test_search_before_the_index_exists` pass with the reused patterns. No dedicated test was added.

</details>

### P3 4: Exception path of `_searcher()` is untested (implementation verified)

If a search raises, `_searcher()` closes the searcher instead of returning it to the pool. That keeps a possibly broken searcher from serving later requests, but no test covers it.

Suggested fix: raise inside `with searching._searcher()`, then assert that the searcher is closed, that the next acquire returns a different searcher, and that searching still works.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort: the added test passes on the PR head, and fails if the `except` path re-pools the searcher.

</details>
