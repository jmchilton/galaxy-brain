One version-neutral refactor commit (`83aae1e26b8` Tidy ag-grid usage ahead of 36 upgrade) now sits on `origin/dev` (`0073b5e9224`) under the upgrade; final tree is byte-identical to the pre-restructure tip (`67a208d73f2` → `9a28016a0e1`).

## Refactor commit

All of these work on 31.3.4, so they move out of the upgrade commit:

- `PairedOrUnpairedListCollectionCreator.vue`: cell renderers passed as imported component objects instead of names; drops `PairedOrUnpairedComponents.ts` and the legacy Vue 2.7 second `<script>` block. `setRowData` → `setGridOption("rowData", ...)` (available since 31).
- `RuleGrid.vue`: removes dead commented `cleanUpColumnsIfNeeded`, optional-chains `autoSizeAllColumns`, drops `cell-selection` (no-op on 31, Enterprise-only on 36).
- `useAgGrid.ts`: grid API held in `shallowRef`.

Verified on the refactor commit with 31.3.4 reinstalled (`pnpm install --frozen-lockfile`): vitest (Collections, Landing, RuleBuilder, composables) 73 files / 702 tests passed, `vue-tsc` clean, eslint (only pre-existing hyphenation warnings) and prettier clean. Unit tests stub the grid, so renderer-by-object on 31 has no E2E check here; the paired list E2E tests (`test_build_paired_list_*`) would cover it in CI.

## Left in the upgrade

- Module registration, legacy theme, global `animateRows: false`, dev validations, async-loader cast: 36-only APIs.
- Row-copy write-backs (`onIdentifierChange`, `onSwap`), FetchGrid `v-model`, sample sheet string model key: only needed because 36 copies rows; on 31 they'd be unmotivated.
- `cellDataType: false`, `headerStyle`, vitest `ag-grid-vue3` transform: tied to 36 warnings/APIs.

## Thermo review ideas, evaluated

- **`GalaxyAgGrid` wrapper** (dedupe `:class`/`:style`/`@gridReady` across 5 grids): would be a valid baseline refactor, but it is new abstraction touching every grid consumer, not something the branch already contains. The process restructures existing work; not introduced here. Good separate follow-up PR.
- **Single binding style (`v-model` vs `:row-data`)**: the `v-model` adoption is driven by 36's row copying and its correctness depends on it; standardising it under 31 adds churn with no behavior reason. Not baselined.

## History

Old: `d310c6fe2da`, `8b45bce1a29`, `028805e550e`, `2d0ba60c9eb`, `67a208d73f2` (backup ref `backup/ag_grid_36_pre_baseline`). New: `83aae1e26b8` (refactor), `57300e17016` (upgrade), `231761a1d0c`, `0a16bedbb15`, `4aa51530517`, `9a28016a0e1`. Only conflict was `PairedOrUnpairedListCollectionCreator.vue` in the upgrade commit, resolved to the original commit's version. Tip with 36.2.0 reinstalled: vitest 73 files / 706 tests passed, `vue-tsc` clean. Not pushed.
