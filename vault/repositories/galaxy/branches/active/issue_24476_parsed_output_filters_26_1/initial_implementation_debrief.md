# Initial implementation — READY for hardening

Implemented #24476 on release_26.1 in `issue_24476_parsed_output_filters_26_1` (worktree `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24476_parsed_output_filters_26_1`).

Parsed dataset, collection, and scalar outputs expose `filters: List[str]`, defaulting to an empty list for unconditional outputs and older serialized models. Conversion preserves expression order and strips surrounding whitespace without evaluating expressions. The field lives only on a concrete parsed-output base; incoming/admin/user authoring models remain unchanged. Scalars share the same XML filtering support, so their conversion is included. Tool Shed schema-keyed caches invalidate automatically. Regenerated Tool Shed client types change only the six parsed output variants; Galaxy client has no parsed-output types to update.

Baseline commit `eb8e990c972` pins existing XML parsing and user-defined tool rejection. Implementation commit `90601b3bc4e` adds behavior and regression coverage. Eight regressions failed at missing `filters` assertions before the fix. Focused parser/output/authoring suites: 147 passed. `make format`, ruff, and all commit hooks passed. Targeted mypy reports 14 existing errors in three imported parser modules; base shadow-file output is byte-identical, with no errors in changed files. Normal subagent review found no fixes; generated diff verified afterward.

No UI or execution behavior changes. Runtime/API server tests were not needed for this library metadata conversion. External galaxy-tool-util-ts resync and deployment remain downstream follow-up after release.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24476_parsed_output_filters_26_1/differential-review/snapshots/20261026T160016Z-implementation-90601b3bc4ef.json
  implementation @ 90601b3bc4ef vs origin/release_26.1 (merge-base 4d652be1cd8b)
  first snapshot: 2 commits, 5 files, 16 hunks
```
