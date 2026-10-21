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
