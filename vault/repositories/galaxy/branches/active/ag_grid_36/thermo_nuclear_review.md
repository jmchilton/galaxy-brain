# Thermo-nuclear review — ag_grid_36

2026-10-22. Scope `origin/dev...HEAD` at `2d0ba60c9eb`. Prompt: `agents/_shared/prompts/thermo-nuclear-code-quality-review.md`.

## Verdict

No structural blockers. The diff is net-deleting: legacy Vue 2.7 component registry (`PairedOrUnpairedComponents.ts`, second `<script>` block), duplicated header-underline CSS in two grids, dead commented code in `RuleGrid.vue`, and per-grid `animate-rows` all go away. Global v36 setup (modules, legacy theme, no animation, dev validations) sits in the canonical `useAgGrid.ts`. No file crosses 1k lines (`PairedOrUnpairedListCollectionCreator.vue` 992, was 982).

## Findings

1. **Row-copy workarounds live in three places (main structural point).** ag-grid-vue3 36 copies plain-object rows. Each consumer copes on its own: FetchGrid copies rows and binds `v-model`; SampleSheetGrid swaps a Symbol key for a string key `"@model_object"`; PairedOrUnpaired writes edits/swaps back to `rowData` by id. Each fix is small and local, and they solve different problems (in-place mutation, symbol loss, renderer mutating a copy), so one shared helper wouldn't remove much code. Recommendation, not changed: document the copy contract once in `useAgGrid.ts`. Longer term, standardize on `v-model` vs `:row-data`. Today it's split 2/3.
2. **`onSwap` looks rows up by `datasets.forward.id` and then casts.** That works, but it's a second identity scheme next to `getRowId`. A cleaner path would have the renderer pass the row id through `context`. That widens scope, so declined.
3. **`as unknown as typeof AgGridVue` in `useAgGrid.ts`.** The double cast replaced a single cast because the v36 spread type doesn't line up. It's confined to the one wrapper, so acceptable.
4. **Misleading comment** in `useAgGrid.ts` ("30's unanimated rows"). **Fixed** in `67a208d73f2`.
5. **Duplicated grid plumbing** (`:class="theme"`, `:style`, `@gridReady="onGridReady"` repeated in 5 components). This predates the branch. Recommendation: a `GalaxyAgGrid` wrapper component around `useAgGrid`. Out of scope.
6. Pre-existing nit: FetchGrid's `handleDataUpdated(event: any)` has an unused param. Not touched.

## Changes

- `67a208d73f2` Clarify useAgGrid global grid options comment.

## Verification

- vitest (Collections, Landing, RuleBuilder, composables): 73 files / 706 tests passed.
- `vue-tsc --noEmit`: clean. eslint + prettier on the touched file: clean.
