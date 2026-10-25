

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is client-only: sorting now reorders the staged items array so uploads, collection elements and pairing follow the displayed order; no API, tool, or workflow behavior changes.

<details><summary>Risk Review Advice</summary>

Worth a glance: binding `localSorting: false` on the upload GTables also disables GTable's local filtering for those tables, and newly added items are re-sorted into the active sort rather than appended. Check no upload table relied on GTable filtering and that auto-resorting on add matches user expectations; on a release branch, also confirm the remove-by-item change covers every method that previously removed by row index.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24394_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24394_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24394_review_0) starts from the reviewed commit `c1e5f3fd6e0` and makes one behaviour fix plus test and cleanup changes. The fix makes the upload-table comparator keep missing values last when sorting descending, the same way GTable does. The tests cover the sort wiring in Paste Links and Paste Content, and a new Selenium test checks that a sorted local-file List of Pairs is built in table order; it uses a reusable `sort_by()` upload helper and a selector for sortable headers. The cleanup shares one byte-size helper between Paste Content's Size display and its sort, moves the `uploadDefaults` test mock into a shared `__mocks__` module, and drops two composable tests that repeat component tests.

- [`b24b2569f76`](https://github.com/jmchilton/galaxy/commit/b24b2569f76) Share uploadDefaults mock between upload method tests: moves the copied inline `vi.mock` factory into `client/src/composables/upload/__mocks__/uploadDefaults.ts`.
- [`94ed91ea044`](https://github.com/jmchilton/galaxy/commit/94ed91ea044) Test sorted upload order for Paste Links and Paste Content: two component tests that click a sortable header and check the order from `prepareUpload()`. Both were checked to fail with the sort wiring removed.
- [`072fa94da0a`](https://github.com/jmchilton/galaxy/commit/072fa94da0a) Share Paste Content byte size between display and sort: adds `contentByteSize()`, used by both the Size sort accessor and `getItemSize()`.
- [`6a38d65182b`](https://github.com/jmchilton/galaxy/commit/6a38d65182b) Drop composable tests that repeat LocalFileUpload component tests: removes two `uploadTableSorting.test.ts` cases covered through the real component.
- [`4a67fb628cb`](https://github.com/jmchilton/galaxy/commit/4a67fb628cb) Selenium test: list:paired upload follows sorted table order: adds `test_upload_paired_list_in_sorted_order`, `sort_by()` in the upload activity helpers, and the `upload_activity.table_sortable_header` selector. Not run locally, because it needs a running Galaxy.
- [`901cb1cbbee`](https://github.com/jmchilton/galaxy/commit/901cb1cbbee) Keep missing values last when sorting upload tables descending: `compareValues` applies the direction only after the missing-value checks, and a descending assertion is added that fails before the fix.

</details>

</details>

### P2 1: No end-to-end test that a sorted List of Pairs is built in table order

The bug is about what reaches Galaxy: request order and forward/reverse pairing. The vitest tests stop at `prepareUpload()` and the pairing preview. Nothing checks a real `list:paired` collection built after sorting.

The review branch adds `test_upload_paired_list_in_sorted_order` to `test_uploads.py`. It stages `2.tabular` then `1.tabular` as local files, sorts by Name, uploads as List of Pairs, and checks through the API that `forward` holds `1.tabular`'s content and `reverse` holds `2.tabular`'s. To support this, the branch adds a reusable `sort_by(field)` method to the upload activity helpers (`upload_activity_helpers.py`) and a `table_sortable_header` selector to `navigation.yml`. The test was written but not run, because it needs a running Galaxy. Ruff, black and flake8 pass, and `navigation.yml` loads.

Fix: [`4a67fb628cb`](https://github.com/jmchilton/galaxy/commit/4a67fb628cb)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>

### P3 1: Sorting is wired into four methods with no test (implementation verified)

Only Local Files tests that sorting reaches the upload. Paste Content also gains a new sort accessor for Size, a column that didn't sort before. Paste Links, Remote Files and Data Library only gain the same wiring.

The review branch adds two tests:

- `PasteLinksUpload.test.ts`: sorting by Name reorders `prepareUpload()`.
- `PasteContentUpload.test.ts` (new): sorting by Size reorders `prepareUpload()`.

Remote Files and Data Library are still not covered.

Fix: [`94ed91ea044`](https://github.com/jmchilton/galaxy/commit/94ed91ea044)

<details><summary>Evidence</summary>

Removing `v-bind="tableSortProps"` and `v-on="tableSortEvents"` from each component makes its new test fail. With the wiring in place, both tests pass.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `compareValues` copies GTable's comparator and has already drifted (implementation verified)

`compareValues` in `uploadTableSorting.ts` is a second copy of the comparator inline in GTable's `localItems` (`client/packages/ui/src/components/GTable.vue`), and the two already differ:

- **Missing values.** GTable returns early for missing values before it applies `sortDesc`, so they stay last in both directions. `applySort` multiplies the whole result by the direction, so a descending sort puts missing values first. The PR description says missing values go last, the same way GTable does it.
- **Formatters.** GTable applies `field.formatter` before comparing; this copy doesn't.

Today the sortable staged columns (Name, Size) are typed non-null, so users probably can't hit the descending case yet. The next optional sortable column would expose it.

The review branch passes the direction into `compareValues`, leaves the missing-value checks unflipped, and adds a descending case to the composable test. A shared `compareTableValues(a, b)` exported from `@galaxyproject/galaxy-ui` and used by both GTable and the composable would stop further drift. That changes the shared UI package, so it fits better as a `dev` follow-up, perhaps together with the GTable work for #24391.

Fix: [`901cb1cbbee`](https://github.com/jmchilton/galaxy/commit/901cb1cbbee)

<details><summary>Evidence</summary>

The new assertion (`onSortChanged("size", true)` should give `["ten", "two", "none"]`) fails on the reviewed commit with `['none', 'ten', 'two']` and passes with the fix.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Paste Content computes the byte size in two places (implementation verified)

`PasteContentUpload.vue` computes `new Blob([content]).size` in two places: the new Size sort accessor and the existing `getItemSize` display helper. If one changes and the other doesn't, the size the table shows and the size it sorts on can differ. The review branch adds a `contentByteSize(content)` helper and uses it in both places.

Fix: [`072fa94da0a`](https://github.com/jmchilton/galaxy/commit/072fa94da0a)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Two composable tests repeat the component tests (implementation verified)

Two tests in `uploadTableSorting.test.ts` repeat Local Files tests that run through the real component:

- "sorts the items in place by the selected column" matches "uploads files in the order the sorted table shows", including descending order.
- "applies the active sort to items added later" matches "keeps files added after sorting in sorted order". The component test also exercises the length watcher.

The review branch drops both. It keeps the comparator edge cases (numbers, missing values last, column accessors) and "keeps the added order until a column is sorted".

Fix: [`6a38d65182b`](https://github.com/jmchilton/galaxy/commit/6a38d65182b)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: The `uploadDefaults` mock is copied between test files (implementation verified)

`LocalFileUpload.test.ts` copies the inline `vi.mock("@/composables/upload/uploadDefaults", ...)` block from `PasteLinksUpload.test.ts`. The review branch moves it to `client/src/composables/upload/__mocks__/uploadDefaults.ts`, following the existing `composables/__mocks__` convention. The three method tests now use it with a bare `vi.mock(...)`.

Fix: [`b24b2569f76`](https://github.com/jmchilton/galaxy/commit/b24b2569f76)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
