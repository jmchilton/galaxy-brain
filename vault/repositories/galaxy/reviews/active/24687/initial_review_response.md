<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24687_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_24687_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24687_review_0)

This branch sits on the reviewed commit [`82550bcf062`](https://github.com/jmchilton/galaxy/commit/82550bcf062). It fixes two pre-existing bugs next to the swap: `usePagination` not clamping when its list shrinks, and `ToolExecutionJobs` keeping the job index across executions. It extracts `JobPager` from the two job pagers, names the pager landmarks that share a page, and adds the first browser tests that reach a migrated pager, one through the zip wizard and one through the history graph's tool executions tab. The rest is spec cleanup: shared pager helpers, fewer mocks, a stronger row assertion, and removal of the jsdom paging specs that the zip browser test replaces.

- [`3ecb1e21406`](https://github.com/jmchilton/galaxy/commit/3ecb1e21406) Share GPagination spec helpers: moves the copied selectors and click steps in nine specs into `tests/vitest/helpers.js`.
- [`5d6396293dc`](https://github.com/jmchilton/galaxy/commit/5d6396293dc) Run UploadProgress spec on real upload state: drops the three module mocks and the hand-copied list shape.
- [`cc43c49f922`](https://github.com/jmchilton/galaxy/commit/cc43c49f922) Clamp usePagination when its list shrinks: adds a watcher on the total, with composable cases and a real Clear Completed case, red first.
- [`634af3ab280`](https://github.com/jmchilton/galaxy/commit/634af3ab280) Reset job pager when ToolExecutionJobs switches execution: adds a watcher on `toolExecutionId`, with a spec for fewer and equal job counts, red first.
- [`1337e11bc0e`](https://github.com/jmchilton/galaxy/commit/1337e11bc0e) Extract JobPager from the two job pagers: adds `JobInformation/JobPager.vue` and removes the bridge, pager block and scoped styles from both parents.
- [`ef34cca0094`](https://github.com/jmchilton/galaxy/commit/ef34cca0094) Show GPagination in the usePagination docstring: corrects the `@example`.
- [`809da7251f6`](https://github.com/jmchilton/galaxy/commit/809da7251f6) Name the pager landmarks that share a page: gives the storage runs tables and tool execution pagers their own `aria-label`.
- [`f2ada02a421`](https://github.com/jmchilton/galaxy/commit/f2ada02a421) Use MSW in the storage operation specs: replaces the API and store mocks, keeping only `useStorageRunWatcher`.
- [`eee5ef9da55`](https://github.com/jmchilton/galaxy/commit/eee5ef9da55) Assert which rows the storage runs table shows: checks that page 2 shows runs 3 and 4.
- [`a168a71bd6c`](https://github.com/jmchilton/galaxy/commit/a168a71bd6c) Share zip spec fixtures, drop getImportableFiles mock: uses a fake explorer and one parameterized view spec.
- [`edf04ff130e`](https://github.com/jmchilton/galaxy/commit/edf04ff130e) Drop the ZipImportSummary no-pager spec: removes a test that restates `showPagination`.
- [`8aa3060b670`](https://github.com/jmchilton/galaxy/commit/8aa3060b670) Page a large archive through the zip wizard in Selenium: adds the test, a 30-file fixture, helpers and selectors, removes the three replaced paging specs, and folds the zip fixtures back into `GalaxyZipView.test.ts`.
- [`4fd1a06ee6c`](https://github.com/jmchilton/galaxy/commit/4fd1a06ee6c) Page tool execution jobs in the history graph in Selenium: adds `test_history_graph.py` and a `history_graph` navigation component.

</details>

</details>

### P2 1: `usePagination` doesn't clamp, so Clear Completed can strand the upload page on an empty list (implementation verified)

The description says these sites page a list or total "that they already clamp themselves". The storage views do, but the five `usePagination` sites don't, and `UploadProgress` can shrink its list while mounted, through Clear Completed and dismissing a row. With 30 uploads on page 2, Clear Completed leaving 10 shows no rows and no pager to leave with. This predates the PR and isn't a regression, but the description's reason for one-way binding rests on it.

<details><summary>Details</summary>

- When the remaining rows fit on one page, `showPagination` is false, so the pager unmounts and `currentPage` stays past the end. The pager doesn't matter in this case.
- When the pager stays but the page is gone, the list is empty and `GPagination` highlights the last page. Clicking the highlighted page does nothing, because `goTo` ignores the current page. `v-model` wouldn't fix the first case.
- The upload page is the only reachable site I found. `ZipImportSummary` and `ZipFileSelector` are only mounted on their wizard steps, the selector resets on search, and the two zip views page a fixed archive.

</details>

<details><summary>Evidence</summary>

A new `UploadProgress.test.ts` case uses real upload state and clicks the real Clear Completed button. Before the fix it fails with `expected [] to have a length of 10`.

</details>

Clamp `currentPage` once in `usePagination`, which covers all five sites and the case where the pager is unmounted. See commit `cc43c49f922`.

Fixed on the review branch in [`cc43c49f922`](https://github.com/jmchilton/galaxy/commit/cc43c49f922).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: `ToolExecutionJobs` keeps the job index when another tool execution is selected (implementation verified)

The description calls this site the same shape as the tool success page, but `ToolSuccess` resets its index on a new response and `ToolExecutionJobs` doesn't. `HistoryGraphOverview` reuses the component when the selection moves from one execution to another. On page 3 of an execution, selecting one with 2 jobs blanks the details panel, pager included, and selecting one with 3 or more opens on its third job. This also predates the PR.

<details><summary>Evidence</summary>

I mounted the real `HistoryGraphOverview`, `HistoryGraphNodeDetails` and `HistoryGraphNodeBody` chain with `GraphView` stubbed. `GraphView` emits only the new node when the selection moves directly between nodes, so nothing remounts. After paging to job 3 of execution A and selecting 2-job execution B, the details pane holds only an empty `<!--v-if-->`. With the fix, it shows job `b1` on page 1.

</details>

Reset `currentIndex` when `toolExecutionId` changes. See commit `634af3ab280`, which adds a spec for both cases.

Fixed on the review branch in [`634af3ab280`](https://github.com/jmchilton/galaxy/commit/634af3ab280).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 3: No browser test renders a migrated zip pager (implementation verified)

The Playwright runs cited in the description don't reach a pager. Pagers appear above 24 files, and the archives `test_archive_explorer` uses have 8 and 17 files. Selection across pages isn't covered at any layer.

Add `test_paginate_large_archive` with a small 30-file fixture. It pages the archive preview, selects files on two pages, checks that search resets to page 1, then pages the import summary with all 30 files selected. It replaces the jsdom paging specs for `ZipFileSelector`, `ZipImportSummary` and `RegularZipView`; `GalaxyZipView` keeps its spec because it needs an export archive. See commit `8aa3060b670`.

<details><summary>Details</summary>

The fixture is `test-data/zip_with_30_files.zip`, about 3 KB. The commit also adds `go_to_page`, `expect_current_page` and `get_visible_summary_cards` to `ExploreZipContext`, with three new `zip_import_wizard` selectors. The test passes in headless Playwright against a client built from this branch.

</details>

Fixed on the review branch in [`8aa3060b670`](https://github.com/jmchilton/galaxy/commit/8aa3060b670).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Pager selectors and click steps are copied into every spec (implementation verified)

All eight new specs and `ToolSuccess.test.ts` define the same `nav[aria-label='Pagination']` selectors and the same click steps. 14 `.vue` files still use `BPagination` under #23812, so this will keep growing, and any `GPagination` markup change touches all of them.

Add `pagerPages`, `currentPagerPage` and `goToPage` to `tests/vitest/helpers.js`, selecting by the `Go to page N` label as `GPagination.test.ts` does. See commit `3ecb1e21406`.

Fixed on the review branch in [`3ecb1e21406`](https://github.com/jmchilton/galaxy/commit/3ecb1e21406).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: The job pager is duplicated between `ToolExecutionJobs` and `ToolSuccess` (implementation verified)

Both files have the same 1-indexed bridge computed, comment and `GPagination` block, and this PR adds a second `.job-pagination` style. They are the only two users of `JobHeader`'s `pagination` slot.

Extract `JobInformation/JobPager.vue`, with a 0-indexed `v-model` and a job count. The bridge, the block and both style blocks go away. `ToolExecutionJobs` passes `class="mr-2"` for the one margin that differs, which works because `GPagination`'s margin has zero specificity. The index stays in each parent, so the reset in P2 2 isn't part of this. See commit `1337e11bc0e`.

Fixed on the review branch in [`1337e11bc0e`](https://github.com/jmchilton/galaxy/commit/1337e11bc0e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Pagers on one page share the landmark name "Pagination" (implementation verified)

`GPagination` renders a `<nav>` landmark labelled "Pagination" by default, so screen readers list identically named landmarks in two migrated views: `StorageOperationHistoryView` with its two runs tables, and `HistoryGraphToolExecutions` with one pager per expanded execution.

Pass `aria-label`, built from the table's localized title in the runs table and from the node label for tool executions. A temporary probe rendered "Tool a jobs", "Tool b jobs" and "Finished pagination". Two expanded executions of the same tool still share a name. See commit `809da7251f6`.

Fixed on the review branch in [`809da7251f6`](https://github.com/jmchilton/galaxy/commit/809da7251f6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: `usePagination` docstring still shows `BPagination` (implementation verified)

This PR moves the last `usePagination` consumers off `BPagination`, so the `@example` is now wrong. See commit `ef34cca0094`.

Fixed on the review branch in [`ef34cca0094`](https://github.com/jmchilton/galaxy/commit/ef34cca0094).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: `UploadProgress.test.ts` mocks can all go (implementation verified)

The spec mocks `./uploadState`, `useUploadBatchOperations` and `useUploadDatasetMonitorStore`, and hand-copies the `orderedUploadItems` shape, so it would still pass if that shape changed. Real state seeded with `makePastedItem` works with no mocks, and it's what lets the P2 1 case click the real button. See commit `5d6396293dc`.

Fixed on the review branch in [`5d6396293dc`](https://github.com/jmchilton/galaxy/commit/5d6396293dc).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 6: Storage operation specs mock what MSW can serve (implementation verified)

`client/README.md` prefers MSW, and `ToolExecutionJobs.test.ts` in this PR already uses it. In `StorageOperationRunView.test.ts`, MSW handlers replace the `@/api/histories`, `objectStoreStore` and `storageOperationsStore` mocks, and the offsets are read from the request's query string. Only the `useStorageRunWatcher` mock stays. The `objectStoreStore` mock in `StorageOperationRunsTable.test.ts` goes the same way. See commit `f2ada02a421`.

Fixed on the review branch in [`f2ada02a421`](https://github.com/jmchilton/galaxy/commit/f2ada02a421).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 7: `StorageOperationRunsTable.test.ts` never shows rows changing (implementation verified)

The description says this view is covered by unit specs only, yet the spec stops at the pager's current page and the emitted event. `GTable` is real in that spec, so assert that page 2 shows runs 3 and 4. See commit `eee5ef9da55`.

Fixed on the review branch in [`eee5ef9da55`](https://github.com/jmchilton/galaxy/commit/eee5ef9da55).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 8: Zip view specs mock a pure function and repeat their fixtures (implementation verified)

`GalaxyZipView.test.ts` and `RegularZipView.test.ts` are nearly the same file. Both mock `getImportableFiles` and pass `explorer: {}`, though that function only reads `explorer.entries` and `getFileEntryMetadata`. A small fake explorer replaces the mock.

Commit `a168a71bd6c` does this and shares the fixtures. Commit `8aa3060b670` (P2 3) then removes the specs the browser test replaces, so the shared module folds back into `GalaxyZipView.test.ts` and what remains is the fake explorer.

Fixed on the review branch in [`a168a71bd6c`](https://github.com/jmchilton/galaxy/commit/a168a71bd6c) and [`8aa3060b670`](https://github.com/jmchilton/galaxy/commit/8aa3060b670).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md), [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 9: The `ZipImportSummary` "no pager" spec restates `showPagination` (implementation verified)

`composables/pagination.test.ts` already covers it ("should show pagination only when items exceed page size"). See commit `edf04ff130e`.

Fixed on the review branch in [`edf04ff130e`](https://github.com/jmchilton/galaxy/commit/edf04ff130e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 10: No browser test opens the history graph job pager (implementation verified)

No Selenium test opens `/histories/:id/graph`, and the unit spec stubs `JobHeader`, so its `pagination` slot is only exercised through the stub. `test_tool_execution_job_pager` runs `cat1` over a batch of three datasets, opens the tool executions tab, expands the execution and pages to job 3. It passes in headless Playwright. It uses the tab rather than the graph canvas, so it doesn't catch P2 2. See commit `4fd1a06ee6c`.

Fixed on the review branch in [`4fd1a06ee6c`](https://github.com/jmchilton/galaxy/commit/4fd1a06ee6c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
