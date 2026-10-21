No refactoring of the base branch was performed.

This was a fresh pass over `origin/release_26.0..HEAD` after the re-scope. Branch history is unchanged: `3e3b6d75e8b` (Baseline tests) / `0e9a619bda4` (canMapOver fix) / `d45d2fdb3bc` (collection_type_source resolution fix) / `d29206dcd71` (`:` boundary on the compound `paired_or_unpaired` check, client and server). HEAD matches `jmchilton/issue_24218_can_map_over_parity_26.0`. Tests: Python `dataset_collections` 84 pass; client `src/components/Workflow` 32 files / 200 tests pass.

Candidates considered and why none were pulled onto the base:
- **`canMapOver` rewrite (`0e9a619bda4`):** the fix is deleting the `rank <= other.rank` pre-branch and reordering the checks to match server `has_subcollections_of_type`. The only part that doesn't change behavior is inlining the `requiredSuffix` alias. A one-line commit for that is churn, and the fix commit would rewrite those lines anyway.
- **`getCollectionTypeFromInput` (`d45d2fdb3bc`):** dropping the `"any"` special case only preserves behavior after switching to map-over-first. On base, `find(canMatch || canMapOver)` returns the `any` entry, so the special case is still needed. Any base refactor that keeps the old order would be rewritten by the fix.
- **Server `type_description.py` (`d29206dcd71`):** `endswith(f":{x}")` replacing `endswith(x) and != x` changes behavior (it rejects `paired:...:paired_or_unpaired` pseudo-matches), so it is the fix and not a refactor.
- **`_endsWith` to native `String.prototype.endsWith` (thermo-nuclear F3):** this one does preserve behavior, but it touches every caller in the file. That is churn on a release branch with a minimal-diff target, so it stays a dev follow-up.
- **Shared rank-sorted declared-type resolver and a TS/Python parity fixture (F1/F2/F4):** these change behavior or add new test infrastructure, so they belong on dev, not on a 26.0 base.
- **Merge-forward:** 26.1+ already has a different `collectionTypeDescription.test.ts`. Extra commits would only grow the add/add conflict surface.
