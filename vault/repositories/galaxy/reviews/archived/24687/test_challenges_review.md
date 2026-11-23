# Test challenges review: #24687

Profile `gx_test_challenger`, model Opus 5.5 (`claude-opus-5-5`), medium effort. Reviewed commit `82550bcf0625`. Test plan and probe results: [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** no P1. The 8 new specs (13 tests) pass and do mount the real pager. The gaps: no browser test ever renders a migrated pager, the specs leave behind copied selectors and fixtures rather than a helper, and two behaviors around the pager are untested and broken (both from code this PR doesn't change).

## P2

### P2 1: No E2E test renders any migrated pager

The PR cites `test_archive_explorer`, `test_upload_activity` and `test_objectstore_selection` passing, but none of them reaches a pager. Pagers appear above 24 items (20 or 50 in storage). `test_archive_explorer` uses `example-bag.zip` (8 files) and `rocrate-test.zip` (19 archive entries), and no zip in `test-data/` has more than 24. No upload activity test loops over more than 24 items. `test_objectstore_selection` does open a storage run view (`test_storage_run_dataset_popover_fits_window`), but with a one-dataset run, far below the 50-item pager threshold, and it never opens the runs table. No Selenium test opens the history graph view. So those runs say nothing about paging, only the author's manual check and the jsdom specs do.

Add a zip paging test. One generated archive covers 3 of the 8 sites:

```python
@selenium_test
def test_paginate_large_archive(self):
    self.login()
    self.ensure_empty_history()
    ctx = (
        self.upload_context("explore-zip")
        .explore_local_zip(self.get_filename("zip_with_30_files.zip"))
        .expect_total_files(30)  # RegularZipView pager on this step
        .go_next()
    )
    assert len(ctx.get_visible_item_cards()) == 24
    ctx.select_file(file_path="file_01.txt").go_to_page(2).select_file(file_path="file_30.txt")
    assert len(ctx.get_visible_item_cards()) == 6
    ctx.search_for("file_3")
    ctx.expect_current_page(1)
    ctx.go_next().expect_files_to_import(2)
```

Use a small `test-data/` zip or one generated with `zipfile`; no existing Selenium test uploads a generated temp file, and `set_file_input` needs a path the browser driver can read, so a checked-in fixture is the safer default. `go_to_page` and `expect_current_page` are new `ExploreZipContext` helpers, backed by new `zip_import_wizard` selectors in `navigation.yml` for a page button and the current page. Selection across pages is not covered at any layer today, and this tests it. The test has not been written or run.

With this in place, drop the paging specs in `ZipFileSelector.test.ts`, `ZipImportSummary.test.ts` and `RegularZipView.test.ts` as duplicates.

### P2 2: History graph pager: switching tool executions is untested and breaks

`ToolExecutionJobs` is the one two-way site, and the PR calls it the same shape as the tool success page. That page resets on a new response, and `c784e61c0c3` pinned this in its spec; `ToolExecutionJobs` never resets `currentIndex`, so the two siblings diverge. `HistoryGraphOverview` to `HistoryGraphNodeDetails` to `HistoryGraphNodeBody` passes the selected node with no `:key`, so selecting another execution changes the prop in place.

Probed by `setProps` on the mounted component with the PR's spec setup: on page 3 of 3, switching to a 2-job execution renders a blank panel with no pager, because `currentJob` is null once `currentIndex` is past the end and `v-else-if="currentJob"` hides everything. Switching to a 5-job one opens on job 3. This happens with either pager, so it's pre-existing. The in-place reuse comes from reading the parents, not from a browser.

Add the spec, then the fix:

```ts
watch(() => props.toolExecutionId, () => { currentIndex.value = 0; });
```

### P2 3: Shrinking lists are untested, and `usePagination` sites do not clamp

The description says all one-way sites page a list or total "that they already clamp themselves". True for the storage views (`StorageOperationRunView`, `StorageOperationHistoryView`). Not true for the five `usePagination` sites, and no spec covers a shrink:

- `UploadProgress`, real `useUploadState`, on page 2, 30 items down to 10: 0 rows and no pager at all, so the user is stranded. This doesn't depend on which pager is used, because the pager is hidden once everything fits on one page. Clear Completed is a direct route to this, though the probe spliced the list rather than clicking it.
- `ZipImportSummary`, on page 3, 60 down to 30: 0 cards while the pager still shows pages. Compared directly against the `dev` version of the component: BPagination highlights 1 and clicking 2 recovers; GPagination highlights 2, clicking 2 is a no-op because `goTo` ignores the current page, and clicking 1 recovers. So the empty list is pre-existing, only the highlighted page differs, and this is not a regression.

Clamp `currentPage` once in `usePagination`, which fixes all five sites, with a red-to-green case in `composables/pagination.test.ts` and one in `UploadProgress.test.ts`. Otherwise correct the claim in the description.

### P2 4: Pager selectors and interactions are copied into every spec

Each of the 8 new specs, plus `ToolSuccess.test.ts`, defines the same `PAGE_BUTTON` and `CURRENT_PAGE` strings and the same `findAll(...).map(text)` and `find(...[data-page='3']).trigger("click")` steps. 14 `.vue` files still use `BPagination`, so under #23812 this keeps growing, and any `GPagination` markup change touches all of them.

Add a helper in `client/tests/vitest/`, for example `pagerLabels(wrapper)`, `currentPagerPage(wrapper)`, `goToPage(wrapper, n)`. Select by `button[aria-label="Go to page N"]`, which is what `GPagination.test.ts` uses, not `data-page`.

## P3

### P3 1: `UploadProgress.test.ts` mocks can all go

The spec mocks `./uploadState`, `useUploadBatchOperations` and `useUploadDatasetMonitorStore`, and hand-copies the `orderedUploadItems` shape, so a change to that shape would still pass. Probed with none of the three mocks: real state seeded through `addUploadItem` gives 24 rows, then 6 on page 2, with no console errors. Seed with `makePastedItem` from `composables/upload/testHelpers/uploadFixtures.ts` and call `clearAll()` in `beforeEach`, because the state is a module singleton.

### P3 2: `StorageOperationRunView.test.ts` should use MSW

`client/README.md` prefers MSW, and `ToolExecutionJobs.test.ts` in this same PR already uses it. Probed: an `http.get` handler on `.../storage/runs/{run_id}/items` returning a `total_matches` header, plus one for `/api/object_stores`, replaces the `@/api/histories`, `objectStoreStore` and `storageOperationsStore` mocks, and observes offsets `0,100` from the query string. Keep only the `useStorageRunWatcher` mock. The `objectStoreStore` mock in `StorageOperationRunsTable.test.ts` can go the same way.

### P3 3: Zip view specs mock a pure function and share copied fixtures

`GalaxyZipView.test.ts` and `RegularZipView.test.ts` are near-identical, mock `getImportableFiles`, and pass `explorer: {}`. That function only reads `explorer.entries` and `getFileEntryMetadata`. Probed with a small fake explorer and no module mock: 24 cards, then the last 6. Move the fake, `makeFiles` and the card stub (copied across all four zip specs) into a shared zip test util.

### P3 4: `StorageOperationRunsTable.test.ts` never shows rows changing

The PR says this view is covered by unit specs only, yet the specs stop at the pager's current page and the emitted event. `GTable` is real in that spec and renders 2 rows for `currentPage: 2` (probed). Assert which rows show. The `page-change` handling in `StorageOperationHistoryView` has no spec.

### P3 5: Drop the `ZipImportSummary` "no pager" test

It restates `showPagination` from `usePagination`, already covered at `composables/pagination.test.ts` ("should show pagination only when items exceed page size").

### P3 6: Optional E2E for the history graph job pager

No Selenium test opens `/histories/:id/graph`, and the unit spec stubs `JobHeader`, so its `pagination` slot is only exercised through the stub. A test that runs a tool over a list, selects the execution and pages would also catch P2 2. It needs new navigation components, so it's reasonable as a follow-up.
