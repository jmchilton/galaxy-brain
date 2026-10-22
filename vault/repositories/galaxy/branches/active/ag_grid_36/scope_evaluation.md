# ag_grid_36 — scope evaluation

**Recommendation: modest expansion.** Keep the refactor + 31.3.4 → 36.2.0 upgrade as is. Add E2E coverage for the v36 row-copy paths that only unit tests guard today: (1) a data landing `FetchGrid` test that edits a URL cell and checks the submitted fetch request, and (2) an assertion in an existing paired list builder test that renames an identifier and/or swaps forward/reverse and checks the created collection. Also add the one-paragraph row-copy contract comment in `useAgGrid.ts` that the thermo review suggested. Don't take on the `GalaxyAgGrid` wrapper, module trimming or the Theming API move here. With the CVE fixed by #23938, the upgrade's value rests on not breaking grids, so the expansion goes into proving that, not into more grid features.

## Possible Decompositions

About 200 lines of non-lockfile change across 14 files. Not a recommendation.

- **A. As now (two commits, one PR):** refactor commit `83aae1e26b8` and then the upgrade with its fixes.
- **B. Two PRs:** (1) "Tidy ag-grid usage" on 31.3.4: renderers passed as objects, `PairedOrUnpairedComponents.ts` and the legacy `<script>` block dropped, `setGridOption`, `shallowRef`, RuleGrid dead code removed. It can ship on its own, and the paired builder E2E checks it in CI. (2) The upgrade: package pins, module registration, legacy theme, global `animateRows: false`, row-copy write-backs, the sample sheet `"@model_object"` key, and the `headerStyle`/`cellDataType` tweaks, plus their tests.
- **C. B plus a third PR of E2E tests landed first, on 31.** The FetchGrid landing edit test and the paired builder rename/swap assertions go onto dev before the upgrade. They should pass on 31 and then guard the upgrade PR, which gives red-to-green style evidence that v36 keeps behaviour.

## Scopes considered

### 1. As implemented
Refactor commit, then the 36.2.0 upgrade with row-copy adaptations (FetchGrid `v-model`, paired builder write-backs, sample sheet string model key), renderer-by-object, global no-animation, legacy theme and dev validations.

| Pros | Cons |
|---|---|
| - Net-deleting diff; v36 setup sits in `useAgGrid.ts` alone<br>- Reviews found and fixed the P1 sample-sheet regression<br>- Refactor commit is separable | - FetchGrid edits and paired builder rename/swap are covered only by vitest that models copying with JSON clones<br>- Earlier E2E passed while P1 existed, so green E2E alone isn't proof of correctness<br>- Optional upgrade; reviewers may question the risk without stronger evidence |

<details>
E2E inventory on dev, checked against the grid consumers:

- **Sample sheets:** `test_collection_sheet.py::test_view_sample_sheet` reads `model-object-identifier` cells, which the P1 fix touches (`DisplayCollectionAsSheet`). The two `test_workflow_run.py` chipseq tests (from URIs, from list pairs) and the workflow editor one create sheets. The from-list-pairs test exercises the "Expected a collection row" path. The implementation debrief reports the chipseq tests green on a pre-P1-fix commit, which means either they don't reach the dropped-symbol path or that run predates the stack change. It's worth confirming that fork CI on the tip runs `test_collection_sheet` and both chipseq tests.
- **Rule builder:** `test_uploads.py::test_rules_example_1..6`. RuleGrid is display-only (no edits), so v36 row copying is low risk. These tests cover autosize and rendering.
- **Paired list builder:** `test_collection_builders.py` covers auto/manual match, paired/unpaired and show original. None renames an identifier through the grid or clicks swap, which are exactly the write-backs this branch added. `test_build_list_of_lists` edits cells, but in the list wizard grid.
- **FetchGrid (data landing):** no E2E. `test_workflow_landing.py` covers workflow landings, not data/fetch landings.
</details>

### 2. Modest expansion: E2E for the row-copy write-backs (recommended)
As implemented, plus a data landing FetchGrid E2E (edit a cell, assert the request) and paired builder rename/swap E2E assertions, plus the row-copy contract comment in `useAgGrid.ts`.

| Pros | Cons |
|---|---|
| - Closes the exact gap class that let P1 through (unit tests mock or clone around `AgGridVue`)<br>- Gives the optional upgrade the evidence a reviewer needs<br>- Tests are version-neutral; they can land first (decomposition C)<br>- Modest: test-only plus a comment | - FetchGrid E2E needs new data landing fixtures and grid-editing helpers, maybe a navigation.yml selector or two<br>- E2E runtime cost in CI |

### 3. Expansion: `GalaxyAgGrid` wrapper component
Wrap `useAgGrid` in a component that owns `:class`/`:style`/`@gridReady` and the row-copy contract, then route all 5 grids through it (thermo finding 5).

| Pros | Cons |
|---|---|
| - Builds the reusable abstraction; one place to state the copy contract and binding style<br>- Fits the reviewer preference for general pieces | - Touches every grid consumer; much bigger diff on an optional upgrade<br>- Duplication predates the branch, and the three row-copy fixes solve different problems (thermo finding 1), so the wrapper wouldn't absorb them<br>- Better as its own PR, which could land before or after |

### 4. Expansion: standardize `v-model` binding and row-id identity
Move all grids to `v-model`. Have the paired builder renderer pass the row id through `context` rather than look rows up by `datasets.forward.id` (thermo findings 1 and 2).

| Pros | Cons |
|---|---|
| - Removes the second identity scheme next to `getRowId`<br>- Consistent binding style | - Churn without behaviour reasons on the grids that are read-only<br>- Adds risk to code whose only E2E guard is weak (see 2)<br>- The `onSwap` id cleanup is small; it could ride along if John wants it |

### 5. Expansion: trim modules and move to the Theming API
Register only the community modules in use (about 50 KB gzip smaller) and replace `theme: "legacy"` with `themeAlpine`.

| Pros | Cons |
|---|---|
| - Smaller bundle; avoids the deprecated legacy theme | - A missed module only fails at runtime (error #200), and the coverage gaps above make that risky<br>- Theme move is a visual change that needs screenshot review<br>- Natural follow-ups once the upgrade is in |

### 6. Contraction: ship only the 31-compatible refactor
Land `83aae1e26b8` alone and park the upgrade until there's a reason (a new CVE, a needed feature, or 31 going EOL).

| Pros | Cons |
|---|---|
| - Keeps the cleanup with near-zero risk; the CVE is already fixed<br>- Avoids v36 behaviour changes in user-facing grids | - Leaves Galaxy on an unsupported major; the eventual jump grows<br>- Throws away the hardening work done here (row-copy, renderer, animation findings)<br>- Dannon's call on whether 36 is wanted is still open; contraction pre-empts it |
