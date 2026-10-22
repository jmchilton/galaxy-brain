# ag_grid_36

Status: `branches_implemented_needs_ci`. Base: `dev`.

Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations.

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

The upgrade is optional now that #23938 fixes the CVE; older stack and CI details remain in the tracking history.

## Rebase — 2026-10-22

Parent #24050 (`sample_sheet_vue3`) merged to `release_26.2` and forward to `dev`. Restacked the single commit onto `origin/dev` as `d310c6fe2da`; 3 conflicts: dropped the legacy components script block in `PairedOrUnpairedListCollectionCreator.vue`, kept dev's row-copy comment in `FetchGrid.vue`, and merged `FetchGrid.test.ts` (dev's tests switched to the `modelValue` stub, plus the branch's v-model edit test). Local vitest (Landing, Collections, composables: 636 passed), vue-tsc and eslint clean. Fork CI pending on the new SHA.

## Hardening — 2026-10-22

Tip `9a28016a0e1`: a 31-compatible refactor commit `83aae1e26b8`, the upgrade, then the fixes from hardening. Codex found a P1 bug: sample-sheet rows lost their source element because v36 copies rows. It is fixed in `0a16bedbb15`, and a test against the real grid now covers it. Scope evaluation recommends a modest expansion: E2E tests for FetchGrid edits and for paired-builder rename/swap, plus a comment describing the row-copy behaviour. Paused for John's scope decision; screenshots and the final debrief are still to do.

[Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md)


