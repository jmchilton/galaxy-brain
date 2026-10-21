# Test Challenges Debrief — PR #24283

- Profile: gx_test_challenger (GX_PROCESS_CHALLENGE_TESTS, review mode; no PR edits)
- Model: Opus 5.5 (claude-opus-5-5), low effort
- Reviewed commit: 27544cf8f0c03faf105453c16c78c39ab54149e2

## Challenge of each new test

| Test | Verdict |
|---|---|
| `test_multi_store_search.py::test_rebuild_keeps_the_panel_searches_of_unchanged_views` | Keep. Pins pool retention across `build_index`; not observable via API. Only covers the reuse branch (see plan item 1). |
| `test_whoosh_build.py::test_long_lived_index_sees_a_later_build[same-schema, schema-change]` | Keep. Behavioral, public API, covers the subtle generation-reset case. Best test in the PR. |
| `test_whoosh_build.py::test_search_before_the_index_exists` | Keep. Behavioral, public API. |
| `test_whoosh_build.py::test_searchers_are_reused_but_never_shared` | Rewrite (optional). Tests private `_searcher()` identity directly, i.e. implementation. Prefer a public-API concurrency test (plan item 3); keep only if a public variant proves impractical. |

No mocks or SimpleNamespace beyond the existing `_FakeToolbox` fixture; nothing to replace. No redundant coverage with API tests: pooling is invisible at the HTTP layer, so unit level is right. No API/integration helper issues (none added). No E2E warranted: no UI change, search results unchanged.

## Test plan (recommendations)

1. Add inverse of the retention test: rebuild with changed tuning (`replace(_TUNING, help_bm25f_k1=...)`) and assert `cached_panel_searches["default"] is not panel_search`. Guards against stale weighting in pooled searchers.
2. Add an exception-path test: raise inside a search/`_searcher` use, then assert the failed searcher is not re-pooled (next acquire returns a fresh searcher).
3. Replace or supplement `test_searchers_are_reused_but_never_shared` with a threaded test calling public `search` from several threads concurrently against one `ToolWhooshIndex`, asserting correct results each time.

Tests were read, not run.
