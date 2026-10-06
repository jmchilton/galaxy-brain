# ag_grid_36 — implementation debrief

Branch `ag_grid_36` at `18be5430e60`, stacked on `sample_sheet_vue3` (`2e3fe908530`). Pushed to `jmchilton/galaxy`. Worktree: `~/projects/worktrees/galaxy/branch/sample_sheet_vue3`.

Upgrades `ag-grid-community` and `ag-grid-vue3` from 30.2.1 to 36.2.0, both pinned exactly. This supersedes Dependabot #22916, which should be closed; nothing has been posted on it. #22916 bumps only `ag-grid-community` to 31.3.4, and `ag-grid-vue3@30.2.1` pins `ag-grid-community ~30.2.1`.

## Why 36 and not 32 LTS
- **Security:** 30.2.1 is affected by CVE-2024-38996 (GHSA-876p-c77m-x2hc, prototype pollution via `mergeDeep`, CVSS 9.8), fixed in 31.3.4.
- **LTS is stale:** 32.3.9 was the last 32 LTS release, on 2025-08-13.
- **Cost of 36 is contained:** the work 33+ needs (module registration and opting out of the new themes) sits in `useAgGrid`.
- **Bundle:** the gzipped grid chunk is about 227 KB on 32 vs 317 KB on 36 with `AllCommunityModule`, or 266 KB with only the modules Galaxy needs. The chunk is lazy-loaded.
- No migration codemod covers 36, and the codemod doesn't touch Vue templates anyway.

## Changes
- **`useAgGrid`**
  - Inside the lazy loader: `ModuleRegistry.registerModules([AllCommunityModule])`, then `provideGlobalGridOptions({ theme: "legacy" })` so the Alpine CSS and the `.ag-theme-alpine` overrides in `RuleGrid` keep working. Dev builds call `enableDevValidations()`.
  - The grid API is held in a `shallowRef`; `ColumnApi` is gone.
- **Rows are copied.** ag-grid-vue3 36 deep-copies plain-object rows before handing them to the grid (`w()` in `dist/main.mjs`), whereas 30 passed `toRaw` rows. Grid edits no longer reach the parent's objects. The review caught this; E2E passed but never checked edited values.
  - `FetchGrid` now binds `v-model` and replaces rows rather than splicing them.
  - The paired list builder writes identifier edits (`onIdentifierChange`) and swaps (`onSwap`) back to `rowData` by id.
  - Red tests for both: `FetchGrid.test.ts`, plus two in `PairedOrUnpairedListCollectionCreator.test.ts`.
  - `FetchGrid` has no E2E coverage; the vitest is the only check on its edit path.
- **API migrations**
  - `RuleGrid` uses `gridApi.autoSizeAllColumns()`.
  - The dead commented-out `columnApi` block is removed.
  - `cell-selection` is dropped; it is Enterprise-only in 36 and was a no-op in 30.
  - `setRowData` becomes `setGridOption("rowData", ...)`.
- **Cell renderers by name.** 36 no longer finds renderers registered by name in a parent's `components`. It walks internal instances; 30 walked `$parent.$options`. The paired list builder passes `CellDiscardComponent` and the other renderers as objects, which drops `PairedOrUnpairedComponents.ts` and the legacy second `<script>` block.
  - E2E caught this: the dev validation overlay blocked clicks.
  - Without dev validations, the Status and Discard columns would have rendered empty.
- **`animateRows`** defaulted to false in 30 and true in 36. It is now false globally: rows removed while animating out kept their `row-index` and broke `test_build_paired_list_manual_matched`.
- **`cellDataType: false`** on the builder's component-rendered `datasets` column silences dev warning #48.
- **Sample sheet headers** use `ColDef.headerStyle`. This removes the `:deep(.ag-grid-column-has-custom-header-description)` CSS.

## Verification
- **Unit and static checks:** vitest 153/153 on node 22.20.0 (Collections, Landing, RuleBuilder); vue-tsc clean; TypeScript 5.8.3 installed meets 36's minimum.
- **E2E under Playwright on the final commit, all passing:**
  - Both sample sheet chipseq tests.
  - `test_build_paired_list_manual_matched`, `test_build_list_of_lists`, `test_build_paired_unpaired_list`, `test_build_paired_list_show_original`.
  - `test_rules_example_3_list_pairs`.
  - `test_build_paired_list_auto_matched` passed one fix earlier.
- **Lesson:** the first E2E pass was green but didn't check edited values or click into renderer cells. The review found the row-copy issue, and the follow-up E2E found the renderer and animation issues.
- The Selenium selectors in `navigation.yml` (`row-index`, `col-id`, `.ag-cell-value`, `.ag-picker-field-icon`, `.ag-popup-child`, `.ag-list-item`) still match.

## Review suggestions not acted on
- **Register only the modules Galaxy uses (about 50 KB gzip smaller).** `AllCommunityModule` matches 30's everything-bundled behaviour, and a missed module only fails at runtime (error #200). Trim later with dev validations on.
- **Move from `theme: "legacy"` to the Theming API (`themeAlpine`).** That is a visual change, and AG Grid has deprecated legacy themes but not removed them. Follow-up.
- **Add a Dependabot group for the pair.** npm isn't in `.github/dependabot.yml` (security PRs only), so the exact pins carry the lockstep.

## Open
- Fork CI not run yet.
- Ship after or with `sample_sheet_vue3`; the PR should say it supersedes #22916.
