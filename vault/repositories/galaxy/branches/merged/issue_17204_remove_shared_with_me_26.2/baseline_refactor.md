Extracted the existing Multiview singular/plural choice into a shared `pluralize` helper in a refactor commit before the recipient-removal feature; the final tree is unchanged.

## Baseline extraction

The approved second expansion made a real base caller available: HistoryList's existing Multiview toast. Commit `587abc5643b` follows the unchanged first commit, `1f15cbcd054` ("Baseline tests"), and precedes the feature. It adds the helper and its existing tests and replaces the Multiview ternary with the helper, preserving behavior for every count. The ten owner bulk grammar fixes remain in the later expansion commit because they intentionally change visible strings.

The feature commits were replayed without conflicts. The history bulk commit no longer introduces `pluralize` or its tests, and the later grammar/typing commit no longer contains the already-extracted Multiview adoption. All other replayed patches are unchanged according to `git range-diff`.

## Verification

- At the isolated refactor commit, pinned Node 22.20.0 Vitest passed both `strings.test.ts` and the baseline `HistoryList.test.ts`: **10 tests passed**. Prettier passed all three refactor files.
- `git diff --exit-code 83867951075 HEAD` passed. Both heads have tree `4ad87c97617453d2735829c629090212f7c01466`, so all full-branch validation and reviews still apply to identical source.
- Working tree is clean and the original baseline-test commit remains first.
- New head: `81e7e68d517`. No pushes were performed; the coordinator will publish with an explicit lease after review.

## Candidates not extracted

- `settleEach`/`describeFailures`: existing owner loops stop at the first failure, while this helper continues and reports each failure. Reusing it there would change behavior; parallel `Promise.allSettled` consumers have different ordering semantics.
- Typed recipient API wrappers, shared-view selection props, routes/service logic, and bookmark cleanup implement the feature itself.
- The ten owner counted-string corrections are bug fixes, not behavior-preserving refactors.
- Composable argument objects and router mixins would change more unrelated callers without simplifying this implementation.

## Commit map

A new refactor commit `587abc5643b` was inserted after the unchanged `1f15cbcd054`. The replayed commits map as follows:

| Previous | Current | Subject |
| --- | --- | --- |
| `f2d6fecd745` | `e054eef65e9` | Let share recipients remove items shared with them |
| `3553c5e238a` | `59a4cf32bb4` | Update client API schema for unshare_with_me |
| `8d834ef26b7` | `167c5a2fbc0` | Add Remove from Shared action to shared history cards (#17204) |
| `beee7eca260` | `b8c7db05590` | Add Remove from Shared action to shared workflow cards |
| `f47ffaa57f4` | `4f1432d4c62` | Add Remove from Shared operation to shared visualizations grid |
| `4032471c53e` | `b86f497e3f7` | Add E2E test for removing a history shared with me |
| `6135d9c11ba` | `030b48a160c` | Add E2E test for removing a workflow shared with me |
| `466f0802cce` | `863f574f17a` | Drop recipient's workflow bookmark when its share is removed |
| `90e00fa62c1` | `be3ff2ecba4` | Add bulk Remove from Shared to histories shared with me |
| `6d91266e1b1` | `35d51d59a3f` | Add bulk Remove from Shared to workflows shared with me |
| `68239e77c14` | `74493b15658` | Add batch Remove from Shared to shared visualizations grid |
| `7f8a10ab0e5` | `424a64da9df` | Add E2E test for removing several histories shared with me |
| `684d6e15537` | `a89f4d4e09f` | Fix bulk item plurals and annotate recipient unsharing returns |
| `d24f2a62acc` | `be312a2ad3b` | Simplify bulk helper test and narrow sharing recipient ID |
| `83867951075` | `81e7e68d517` | Use shared history navigation selector in bulk removal test |
