PASS: the review's recursion simplification was applied; no remaining structural or correctness blocker was found.

Not acted on: direct TRS provisioning remains outside the local-workflow scope.

## Details

`get_tool_ids_for_workflow` now uses the existing `iter_workflow_steps` walker instead of maintaining separate native/gxformat2 recursion branches. This preserves order and deduplication while reducing branching.

Managed permission provisioning belongs in `BaseManagedGalaxyConfig`, role API details remain in `api.py`, and embedded-tool detection reuses normalization, linked-subworkflow expansion, and the canonical walker. External Galaxy permissions are unaffected. No file crosses the 1,000-line threshold; the large modules already exceeded it.

The real managed workflow run passed 1/1; final relevant suites passed 89 tests (5 skipped), and `make lint` passed.
