# Readability batch 36

Four originators, one test per commit, then one range review. useElementReconciliation is a follow-through selection from batch 35; the other three were drawn with seed `2610936`. [Manifest](readability_batch_36.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| useElementReconciliation | `fakeDataset(...)` wraps `getFakeDatasetSummary`; the `as unknown as HDASummary` cast is gone. No cases or assertions changed. [Review](reviews/batch36/useElementReconciliation.md). | 11 → 11 |
| BroadcastsList | The long filter walk is split: all filters on (and no alert), each filter alone as an `it.each`, and the original all-off-then-on walk kept in order. Checks now name the broadcasts shown, not just counts. `Date` is pinned, since the component re-reads `new Date()` on each click; the ±1 s windows could flake on the real clock. Offsets are unchanged and subjects are now fixed. `withPlugins` replaces `setActivePinia` and a cast. [Review](reviews/batch36/BroadcastsList.md). | 2 → 6 |
| FormSelect | Four long cases become seven under single- and multi-select describes. `listedLabels`/`selectedLabels`/`clickOption` helpers. The deselect walk clicks the same labels by name rather than by captured position, with the same emission indexes and values. New check: an optional single select emits nothing on mount. [Review](reviews/batch36/FormSelect.md). | 6 → 9 |
| CommandPalette `refresh` | A vacuous `not.toThrow()` replaced: `refreshListWhenStale` runs `refresh` fire-and-forget inside a try/catch, so nothing can throw. The case now asserts the catch's `console.debug(message, key, error)`, and fails if that line is removed. "Tracks each list separately" uses one mock per key. [Review](reviews/batch36/refresh.md). | 5 → 5 |

## Reuse and follow-through

Closes batch 35's useElementReconciliation follow-up. Follow-up: `FormData/FormData.test.ts` has an identical `openMultiselect`. A later lane owns it, so a shared multiselect helper waits.

Guidance: none.

## Validation and review

31 cases across 4 suites pass; the baseline was 24. Each commit's tests pass at that commit, shuffled with seed `360101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch36/review.md) approved all four commits.

Commits: `405fa12b462` (useElementReconciliation), `35b03e3a9e0` (BroadcastsList), `10aedd853d7` (FormSelect), `b46d3658d3c` (refresh).
