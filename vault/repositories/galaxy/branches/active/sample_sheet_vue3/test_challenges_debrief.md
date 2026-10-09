# sample_sheet_vue3 — test challenges debrief

**Verdict: not blocked.** Kept the grid and parser unit tests. Dropped the mock-heavy `DisplayCollectionAsSheet.test.ts` and replaced it with a new E2E file covering both the sheet view's happy path (which had no coverage anywhere) and its load-error branch. Collapsed one duplicate grid case. Commit `a0a45ce7795` (fast-forward on `ed2a6de8339`), pushed to `jmchilton/sample_sheet_vue3`.

## Unit test challenges

### `useSampleSheetGrid.test.ts`: kept as is
Pure input/output tables for `parseSampleSheetValue`. It has no mocks and doesn't test the implementation. This is the right layer for the job.

### `SampleSheetGrid.test.ts`: kept; one case collapsed
- **Rebuild on `initialElements` change** (workbook drop): kept. Dropping a workbook file onto the grid isn't practical in E2E.
- **Duplicate identifier rejected**: kept. It's cheap and checks both the toast and the unchanged row. The chipseq E2E never renames identifiers.
- **Boolean edit accepted**: kept. It's the only grid-level "valid edit writes to the row" check, and no E2E has a boolean column.
- **Required int cleared**: collapsed `it.each(["", null])` to the `null` case only, which is what ag-grid's inferred number editor actually hands over.
  - Both inputs are already rows in the parser table.
  - At grid level, one "invalid edit leaves the row unchanged" case is enough.
- **Renamed identifiers offered in `element_identifier` dropdowns**: kept.
  - It's the component-level proof that `v-model` reactivity reaches the computed choices.
  - Considered moving it to E2E (rename, then open the Control picker). Didn't, because the existing grid tests already go red without the compat opt-in, and an E2E would need a new workflow-run flow for one assertion.
- **Four create-payload tests**: kept.
  - They cover a flat URL sheet, workbook hash `type_index`, `paired_or_unpaired` unpaired, and a flat sheet from an existing collection.
  - The chipseq E2Es cover only `sample_sheet:paired` (URIs and an existing list:paired), so these aren't redundant.
  - `attemptCreate` is the exposed API the wizard calls.
- **Mocks**:
  - Only `ag-grid-vue3` is stubbed, which keeps the real `useAgGrid` async wrapper in play. No shared stub exists to reuse.
  - The `ValueSetterParams` cast in `setCell` stays: it builds the minimum surface the grid passes, and a dataclass wouldn't read any better in TS.

### `DisplayCollectionAsSheet.test.ts`: dropped, rewritten as E2E
- It `vi.mock`ed both `useDetailedCollection` and `useAgGrid`. Mocking `useAgGrid` is the pattern the initial debrief says hid the compat bug.
- The error branch is easy to reach in E2E by visiting the sheet route with a bogus id, so per the criteria it moved to that layer.

## E2E added: `lib/galaxy_test/selenium/test_collection_sheet.py`
- **The gap:** `DisplayCollectionAsSheet` (`/collection/:id/sheet`, the history panel's "View Sheet") was heavily rewritten on this branch: rows come from `useSampleSheetGrid`, there are shared column builders, and the grid renders through the MODE 3 wrapper. Yet nothing rendered it with data.
- `test_view_sample_sheet` creates a flat sample sheet through the API (`create_sample_sheet`, one int column and one string column), opens the sheet, and asserts every cell, identifier column included.
- `test_view_sample_sheet_load_error` opens a bogus id, then asserts the error alert shows and no spinner does.
  - **Red-to-green:** with dev's branch order put back temporarily (spinner checked first), it timed out waiting for the error alert. With the branch's order it passes.
- Supporting changes:
  - `data-description="collection sheet"` / `"collection sheet error"` hooks in `DisplayCollectionAsSheet.vue`.
  - A `collection_sheet` component in `navigation.yml`, with explicit selectors. `${_}` children don't resolve on a top-level component.
  - A `go_to_collection_sheet()` helper in `NavigatesGalaxy`.
- The happy-path test isn't red-first: it's new coverage of behaviour that wasn't broken.

## Results
- Vitest (node 22.20.0), Collections/Landing/RuleBuilder: all passing.
- vue-tsc clean. eslint has one warning, the pre-existing `@gridReady` hyphenation. Prettier and black are clean.
- E2E, Playwright headless: both new tests pass. They ran against this worktree's own Galaxy (8081) and Vite (5174). The Galaxy on 8080 belongs to another session and its worktree is gone, so `/` returns 500 there.
- E2E, Selenium (chromedriver, same servers): both new tests pass.

## Not done
- `FetchGrid` (also behind the MODE 3 wrapper) still has no E2E or component test. That predates this branch; flagged, not blocking.
