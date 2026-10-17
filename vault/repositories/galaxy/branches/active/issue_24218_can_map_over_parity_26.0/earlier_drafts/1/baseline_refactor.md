No refactoring of the base branch was performed.

Branch history unchanged: `3e3b6d75e8b` (Baseline tests) / `0e9a619bda4` (canMapOver fix) / `d45d2fdb3bc` (collection_type_source resolution fix).

Why nothing was pulled forward:
- `canMapOver` (0e9a619bda4): the rewrite deletes the `rank <= other.rank` pre-branch and reorders the checks to match the server's `has_subcollections_of_type`. That reorder is the fix itself. The only part that doesn't change behavior is dropping the `requiredSuffix` alias. Moving that one line into its own commit is churn with no review value.
- `getCollectionTypeFromInput` (d45d2fdb3bc): the move from `find(canMatch || canMapOver)` to map-over-first, then match, changes which declared type wins. Collapsing the `"any"` special case only looks behavior-preserving after the reorder (`ANY.canMatch(x)` is true and `ANY.canMapOver` is false). On base, any refactor that keeps the old ordering would be rewritten again by the fix.
- The larger structural cleanups from `thermo_nuclear_review.md` all change behavior or belong on dev, so they aren't base refactors for 26.0: D1 (a shared rank-sorted declared-type resolver), D2 (reshaping `effectiveMapOver`), and the colon-boundary suffix check.
- Target is release_26.0 with a minimal-diff goal. 26.1+ already has a divergent `collectionTypeDescription.test.ts`, so extra commits would only grow the merge-forward surface.
