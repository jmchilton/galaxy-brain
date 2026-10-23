# Implementation debrief — ag_grid_36

STATUS: READY. Tip `3bf56e17e9b` on `dev` (base `0073b5e9224`). Scope: kept as implemented, after one approved expansion.

## Commits

1. `0dc06dc46d2` Tidy ag-grid usage ahead of 36 upgrade (also works on 31.3.4): renderers passed as components, `setGridOption`, `RuleGrid` cleanup, grid API held in a `shallowRef`.
2. `dda2cd86564` Generic `ag_grid_edit_cell` selenium helper.
3. `535bbb64d5c` Upgrade ag-grid-community and ag-grid-vue3 31.3.4 → 36.2.0:
   - Setup: module registration, the legacy Alpine theme, and dev validations.
   - Grid edits flow back to component state despite v36 row copying:
     - FetchGrid binds rows with `v-model`.
     - The paired builder writes edits and swaps back to its rows.
     - The sample-sheet model object uses the string key `"@model_object"`, because v36 drops Symbol keys when it copies rows.
   - `agGridLegacyTheme.css` stops the dev-mode overlay that blocked clicks.
   - Fixes for visual regressions found from screenshots:
     - `CellStatusComponent` styles are unscoped, because v36 drops scope ids from renderers.
     - Rule grid cell height is set explicitly.
     - `columnMenu: "legacy"` hides the always-visible filter icons.
4. `1042f4e632f` Data landing E2E test that edits FetchGrid cells.
5. `3bf56e17e9b` Paired builder rename and swap assertions in E2E.

## Decisions

- **Why it's optional:** the upgrade isn't urgent, because #23938 already fixed the CVE on dev. Its value is a current grid version that doesn't break existing grids.
- **Original scope kept:** it's on the alt branch `ag_grid_36_alt_original_scope` (`alts/original_scope.md`).
- **Recommended follow-ups, out of scope:**
  - a `GalaxyAgGrid` wrapper component;
  - standardizing grids on `v-model` and row-id identity;
  - module trimming and a move to the Theming API;
  - an E2E for creating a sample sheet from flat datasets.

## Evidence

- **Unit tests:** client vitest 703/703; vue-tsc and lint clean.
- **Refactor commits alone on 31.3.4:** 702 tests pass.
- **E2E:** six grid tests pass on Playwright: data landing, sample sheet view, paired builder, paired/unpaired builder, chipseq sample sheet from URIs, and the rule example.
- **Red runs:** each new E2E check failed with its fix reverted. These ran on Playwright only.
- **Screenshots:** `screenshots/` (with `dev_baseline/`), reported in `screenshot_debrief.md`.
- **Fork CI:** pending on the tip.

## Hardening

[Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · Prior round: `earlier_drafts/1/`
