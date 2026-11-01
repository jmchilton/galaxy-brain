# Rescope debrief

The first scope evaluation recommended a modest expansion, and John approved it. The added second commit (`be1f46b9688`) renames `kind` to `src` on `OutputLabelHint` and `StepLabelHint`. These are the only other wire names in extraction that are new in 26.2, and they now follow Galaxy's `(src, id)` convention.

- The original scope is kept as `pages_extraction_summary_rename_26.2_alt_original_scope` (see [alts/original_scope.md](alts/original_scope.md)).
- Commit 1 (`d4a265d39c3`) is unchanged and still byte-identical to `c076821e882`.
- Commit 2 is independent of `extract_next_followups`, which still uses `kind`. That branch was not touched. It must either pick up commit 2 or apply the same rename, and resolve the conflict with its `7dd3f9c161f` (`kind: ContentKind`) on rebase.
- Tests: tests were edited first. Vitest went red (3 failing), then green (46 passed). `test_workflow_extraction.py -k label`: 21 passed. Schema regenerated; vue-tsc is clean after rebuilding the api-client dist.
- Review: approved. The internal local rename was folded in ([subagents/rescope_review.md](subagents/rescope_review.md)).
