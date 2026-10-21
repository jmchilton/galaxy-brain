# Test Challenges Review — PR #24283

- Profile: gx_test_challenger
- Model: Opus 5.5 (claude-opus-5-5), low effort (release-branch fix)
- Reviewed commit: 27544cf8f0c03faf105453c16c78c39ab54149e2 (vs origin/release_26.2)

Tests are unit-level, red-to-green shaped, and cover the core risk (stale pooled searcher after a rebuild, including the schema-change generation-reset case). Unit level is appropriate: this is a caching layer with no API surface change; existing API tool-search tests cover end-to-end. No weakened tests. Tests were read, not run. Challenge details and test plan: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1: No test that a tuning change replaces the pooled panel search

`CachedToolboxSearch` keeps a `ToolWhooshIndex` only when `index_dir` and `tuning` match. `test_rebuild_keeps_the_panel_searches_of_unchanged_views` pins the reuse branch only. Add the inverse in `test_multi_store_search.py`: rebuild with altered tuning (e.g. `replace(_TUNING, help_bm25f_k1=...)`) and assert `cached_panel_searches["default"] is not panel_search`. Without it, a regression that always reuses (keeping stale weighting in pooled searchers) passes.

### P3 1: Exception path of `_searcher` untested

On exception the searcher is closed and not returned to the pool. A small test raising inside `with searching._searcher()` and asserting the next acquire yields a different searcher would pin that a possibly broken searcher is never re-pooled.

### P3 2: Pool test tests the implementation via private `_searcher`

`test_searchers_are_reused_but_never_shared` asserts identity of objects from private `_searcher()`. Rewrite as a threaded test calling public `search` concurrently on one `ToolWhooshIndex`, asserting correct results; this also covers the "one thread at a time" pool claim. Keep the private test only if the public variant proves impractical.
