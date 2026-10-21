# Initial review — galaxy#24283 "[26.2] Pool Whoosh searchers in cached toolbox search"

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `27544cf8f0c03faf105453c16c78c39ab54149e2` (base `release_26.2`)
- Tests: `pytest test/unit/app/tools/source_store` passes locally (126 passed). CI green or skipped at review time.

## Summary

Small, well-targeted perf change. `ToolWhooshIndex` keeps a lock-protected LIFO pool of idle Whoosh searchers, and checks before each reuse that the searcher still reads the latest commit: TOC generation plus surviving segment ids. That covers the schema-rebuild case, where generations restart at 0 and `Searcher.refresh()` would serve the deleted index. `CachedToolboxSearch._sync_panel_searches` now keeps the `ToolWhooshIndex` of a panel view whose directory and tuning are unchanged, so the pool outlives `build_index`. `ToolSearchTuning` is a frozen dataclass, so the `!=` comparison is sound. Splitting `search_whoosh_index` into `search_weighting` and `search_whoosh_searcher` keeps the eager `ToolPanelViewSearch` path (`search/__init__.py:410`) and the cached path on one parser and one scoring policy. That's good reuse.

Correctness looks right. Exclusive checkout protects the thread-unsafe searchers. A searcher that raises is closed and not returned to the pool. A searcher that is one commit behind, because a commit landed between `listdir` and use, is harmless. The `rmtree` race during a schema rebuild (TOC listed, then `open_dir` fails) already existed with the old `exists_in` + `open_dir` code, so this PR doesn't introduce it. The findings below are about resource cleanup and minor polish.

## Findings

### P3 1: Stale pooled searchers are only closed when popped, and the LIFO pool can keep them open indefinitely

`_searcher()` pops one idle searcher, and if it is stale closes it and opens a fresh one, which then goes back on top of the stack. The other stale searchers below it are never examined unless concurrency rises again to that depth. Until then they keep the replaced index's segment files open: mmaps or file handles on files that `rmtree` (schema rebuild) or segment merges have deleted. The disk space and descriptors stay held for the life of the process. The cost is bounded by peak concurrency × panel views × processes, and the tool index is small, so it's minor. But the pool exists to hold resources, and this is the one path where it leaks them.

<details><summary>Evidence</summary>

Reproduced against the PR head: build an index, check out three searchers concurrently so the pool holds 3, rebuild with a schema change, then run 100 sequential searches:

```
pool 3
[(False, False), (False, False), (True, False)]   # (_reads_latest_commit, is_closed) per pooled searcher
```

The two bottom searchers are stale and still open after 100 searches.

</details>

Suggested fix: when a popped searcher fails `_reads_latest_commit`, drain and close every idle searcher. They are all at least as old, because each was checked against an older or equal listing. An alternative is to stamp each pooled searcher with its generation and segment set and drop all mismatches at once.

### P3 2: Replaced or dropped `ToolWhooshIndex` instances don't close their pools

`_sync_panel_searches` now discards a `ToolWhooshIndex` when its panel view disappears, its `index_dir` changes, or its tuning changes, and the discarded pool's searchers are never closed. CPython refcounting will probably release them, but nothing closes them explicitly. The pool now lives on `ToolWhooshIndex`, so a `close()` method there (close all idle searchers) would be the reusable abstraction. `_sync_panel_searches` would call it on instances it doesn't carry forward. It would also give P3 1 a natural home: "close stale/idle searchers".

### P3 3: Whoosh filename conventions are re-encoded rather than reused

`_TOC_FILENAME` hard-codes `_MAIN_<gen>.toc`, and `_reads_latest_commit` infers segment ids by splitting filenames on the first `.`. Whoosh already encodes both in `whoosh.index.TOC._pattern(indexname)` / `TOC._segment_pattern(indexname)`, and `FileIndex.latest_generation()` → `TOC._latest_generation(storage, indexname)`. They're underscore-private, and Whoosh is effectively frozen at 2.7.4, so duplicating them is defensible. If the duplication stays, at least derive the regex from `index._DEF_INDEX_NAME` instead of the literal `MAIN`. Then a later move to a named index can't silently disable reuse (every search would reopen) or cause stale reads.

### P3 4: Test gaps around the new reuse decision

- `test_rebuild_keeps_the_panel_searches_of_unchanged_views` covers only the "kept" branch. Nothing checks that a tuning change (for example, toggling `index_tool_help`) produces a fresh `ToolWhooshIndex`. A wrong tuning comparison there would keep a searcher whose schema and boosts are stale.
- `test_searchers_are_reused_but_never_shared` drives the private `_searcher()` context manager directly. That's acceptable for a pool invariant, but if a `close()`/drain API is added (P3 1/2), testing through it, together with an assertion that stale searchers end up `is_closed`, would pin the cleanup behavior too.
