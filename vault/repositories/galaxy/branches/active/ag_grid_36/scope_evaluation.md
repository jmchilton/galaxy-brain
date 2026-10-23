# ag_grid_36 — scope evaluation (post re-scope)

**Recommendation: keep as implemented.** The first evaluation's expansion is done: FetchGrid edit E2E, paired builder rename/swap E2E assertions, and the row-copy contract comment. Each was shown red with its fix reverted. The open question was whether the existing sample-sheet E2E tests reach the model-object path. They do. `test_view_sample_sheet` renders the `model-object-identifier` column, and the chipseq from-list-pairs test edits the grid through `v-model="rowData"` and then creates the sheet through `elementsForCreateApi`'s `row[MODEL_OBJECT]` lookup. The earlier "chipseq green before the P1 fix" result doesn't contradict this. That run was on `10df5b747af`, which predates the `Symbol` key: `ea019fe4700` introduced it later, and `10df5b747af` has no `MODEL_OBJECT` at all. So no new sample-sheet E2E is needed. The remaining candidates are the `GalaxyAgGrid` wrapper, `v-model`/row-id standardization, and module trimming with the Theming API. They are larger refactors of an optional upgrade, and none fixes a bug in the touched code. This is not a second scope change, so the branch shouldn't be parked.

## Possible Decompositions

About 310 changed lines outside `pnpm-lock.yaml` across 19 files (352 total). Not a recommendation.

- **A. As now (one PR, five commits):** tidy refactor (31-compatible) → `ag_grid_edit_cell` helper (31-compatible) → 36.2.0 upgrade with row-copy fixes and legacy-theme CSS → data landing E2E → paired builder rename/swap assertions.
- **B. Two PRs:** (1) "Tidy ag-grid usage" on 31: the refactor commit plus the selenium helper. (2) The upgrade plus both E2E commits.
- **C. Three PRs, tests first:** (1) the refactor and helper; (2) the data landing E2E and paired builder assertions on 31, if they pass there, which would give version-neutral guards; (3) the upgrade, guarded by (2). This is the most review-friendly evidence that v36 keeps behaviour, but it costs three CI rounds.

## Scopes considered

### 1. As implemented (recommended)
Refactor, helper, 36.2.0 upgrade (module registration, legacy theme with an `--ag-auto-height-max-body-height` fix, global `animateRows: false`, `v-model` write-backs in FetchGrid and the paired builder, the string `"@model_object"` key), and the E2E tests for the edit paths.

| Pros | Cons |
|---|---|
| - All five grid consumers are covered by E2E that reaches the v36 row-copy paths (see details)<br>- Reverting each fix turned its test red<br>- Net-deleting client diff; v36 setup lives only in `useAgGrid.ts`<br>- The refactor commits are separable | - Optional upgrade (the CVE was fixed by #23938); reviewer appetite is Dannon's call<br>- No red run under Selenium and no production-build run yet<br>- Duplicated grid plumbing across consumers remains (predates the branch) |

<details>
E2E reach, checked by reading the tests against the `MODEL_OBJECT` readers (`useSampleSheetGrid.ts`, `SampleSheetGrid.vue`, `DisplayCollectionAsSheet.vue`):

- `test_collection_sheet.py::test_view_sample_sheet` waits for text in the `model-object-identifier` cells. With the P1 bug the identifier getter throws, so those cells never fill. This covers the display path.
- `test_workflow_run.py::test_collection_input_sample_sheet_chipseq_example_from_list_pairs` picks an existing list:paired, edits cells through `_chipseq_data_entry` (v36 then emits copied rows into `rowData`), and creates the sheet. `elementsForCreateApi` reads `row[MODEL_OBJECT]?.object` and would raise "Expected a collection row", so the test would fail at `history_panel_wait_for_hid_ok(50)`. This covers the create-from-existing path.
- The from-URIs chipseq test and the workflow editor test don't touch `MODEL_OBJECT`: URI rows go through `fetchElementForRow`. They cover rendering and editing only.
- The "Expected a dataset row" variant (a sheet built from a flat list of datasets) has no E2E. Its code path is symmetric with the pairs path, and `useSampleSheetGrid.test.ts` covers the key on a real grid. One more E2E would add little.
</details>

### 2. Small expansion: E2E for creating a sample sheet from a flat dataset list
Add a Selenium test that builds a sample sheet from an existing list and edits a column, covering `elementsForCreateApi`'s dataset branch.

| Pros | Cons |
|---|---|
| - Closes the last untested `MODEL_OBJECT` reader branch | - Same mechanism as the covered pairs branch, plus a real-grid unit test; low marginal value<br>- More E2E runtime; it would be a second re-scope, which parks the branch |

### 3. Expansion: `GalaxyAgGrid` wrapper component
Thermo finding 7: a component that owns `:class`/`:style`/`@gridReady` and the row-copy contract, used by all five grids.

| Pros | Cons |
|---|---|
| - The reusable abstraction reviewers like<br>- One home for the copy contract | - Touches every consumer of an optional upgrade<br>- The three row-copy fixes differ, so the wrapper wouldn't absorb them<br>- Better as its own PR before or after |

### 4. Expansion: standardize `v-model` and row-id identity
Thermo finding 5: the paired builder renderer passes the row id via `context` and stops matching on `datasets.forward.id`. Move the read-only grids to `v-model`.

| Pros | Cons |
|---|---|
| - Removes the second identity scheme next to `getRowId` | - Not a bug; swap now has E2E proving it works<br>- Churns read-only grids for no behaviour change |

### 5. Expansion: trim modules and adopt the Theming API
Register only the community modules in use, and replace `theme: "legacy"` with `themeAlpine`.

| Pros | Cons |
|---|---|
| - Smaller bundle; drops the legacy CSS shim | - Visual regressions across every grid; no screenshot tests guard it<br>- Independent of the upgrade's correctness; a clean follow-up |

### 6. Contraction: drop the upgrade, ship only the 31-compatible refactor and E2E tests
Shrink the branch to decomposition C's first two PRs, since the CVE is already fixed.

| Pros | Cons |
|---|---|
| - Low-risk cleanup plus new coverage<br>- Defers the upgrade decision to Dannon | - Drops the branch's purpose; 31 falls further behind<br>- The upgrade work is done and verified; decomposition C gives the same staging without dropping it |
