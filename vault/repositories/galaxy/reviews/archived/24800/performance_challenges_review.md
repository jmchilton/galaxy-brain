# galaxy#24800 performance review

- Profile: gx_performance_challenger (`_shared/reviewers/gx_performance_challenger.md`)
- Model: Claude Opus 5.5
- Effort: as set by coordinator (low)
- Reviewed commit: `21620b47273fc9f76ccf632debccbe02c8badf2e`
- Details and measurements: [performance_challenges_debrief.md](performance_challenges_debrief.md)

## Summary

No performance findings.

The new `self._invalidate_tool_caches()` call at the end of `CachedToolBox.invalidate_index_cache()` clears the non-admin and admin `/api/tools` payload caches and the curated/EDAM id sets. It runs only on `reload_tool_source_cache` events: populates, `--watch` batches, shed installs, and removals. Request traffic never triggers it.

The rebuild is lazy and does not parse tools. `CachedTool.to_panel_entry` builds each payload from index fields. In a micro-benchmark with the unit-test registry fixture and 10,000 stub tools, rebuilding took about 85 ms per cache, roughly 6–9 µs per tool. That is a one-time cost on the first listing request per process after a reload. On the same reload, `invalidate_index_cache()` itself takes about 47 ms of O(N) reconciliation, and the control task then fully rebuilds the Whoosh search index for every panel view. Targeted per-id invalidation would save nothing, because every entry object is replaced on reload.

## Findings

None.

## Notes (not findings)

- An identity guard (`loaded is previous_index`) could skip the clear when an unchanged read-only SQLite store returns its cached index. The saving is one ~85 ms rebuild per process per no-op reload, and composite stores always build a new index. Not worth the code.
- For the bug reviewer: `index_tool_files()` and `_reload_tool_index()` also swap `_tool_index` and do not clear the caches. They are outside this diff.
