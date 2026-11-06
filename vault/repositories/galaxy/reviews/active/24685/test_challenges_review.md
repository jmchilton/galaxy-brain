# Test challenges review — #24685

Profile `gx_test_challenger`, Opus 5.5 (claude-opus-5-5), medium effort. Reviewed commit `150cb834122`.

**Verdict:** tests are good for a migration: real `GLink`, behavior-focused. One coverage gap, three small test cleanups, no blockers. Vitest and E2E were not run here (`client/node_modules` absent); CI `client-unit-test` passes. Details and the test plan are in [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1: No browser test clicks a `BreadcrumbHeading` link

Nothing under `lib/galaxy_test` or in `navigation.yml` targets `BreadcrumbHeading` (the admin `#breadcrumb` selectors are `BBreadcrumb`). The dbkey and download links have E2E coverage, and the collection creator's click-only buttons are well served by their unit tests, but the breadcrumb is the one with changed wiring: named locations are now resolved to a string and passed to `RouterLink`. The unit test pins `href`, not navigation.

Automate manual step 1 by extending `test_history_storage_accessibility`, which already lands on `StorageManager` and then goes back through the masthead. Add `breadcrumb_link: '.breadcrumb-heading-header-active'` under `storage_dashboard.selectors`, and replace the second `navigate_to_storage_dashboard()`:

```python
self.components.storage_dashboard.breadcrumb_link.wait_for_and_click()
self.components.storage_dashboard.free_space_link.wait_for_visible()
```

## P3 1: `CollectionCreatorIndex.test.ts` mocks the API module instead of using `useServerMock`

The README prefers MSW, and sibling specs `ListCollectionCreator.test.ts` and `PairCollectionCreator.test.ts` use it. The mock also fakes the failure shape: it rejects with a string, while the real path throws `Error(...)` from `rethrowSimple`. Use `server.use(http.post("/api/dataset_collections", ...))` for both outcomes. Keep the `useHistoryDatasets` mock.

## P3 2: `DatasetDetails` test harness can shrink to what only it covers

`test_dataset_change_dbkey` already clicks `.dbkey .value` and waits for the edit form, so the `tagName`, `.value` and `text` assertions duplicate it. The unique check is that `.stop` keeps the click from reaching the history item. That doesn't need the inline template wrapper: use the file's `shallowMount` with `stubs: { GLink: false }` and `wrapper.element.addEventListener("click", outerClick)` on the root. Sketch in the debrief; not run.

## P3 3: Drop assertions on GLink's internals

`toContain("g-link")` (`BreadcrumbHeading.test.ts` twice, `PersistentTaskProgressMonitorAlert.test.ts`) and `tagName` checks (`CollectionCreatorIndex.test.ts` twice, `PersistentTaskProgressMonitorAlert.test.ts`) pin GLink's class and element choice, which `GLink.test.ts` owns. They fail on a GLink refactor with no behavior change here, and sit next to `href` and click assertions that already cover the behavior. `findLinkByText` should find `button` by text instead of `.g-link`.
