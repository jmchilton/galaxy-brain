# ag_grid_36

Status: `branches_implemented`. Base: `dev`.

Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations.

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

The upgrade is optional now that #23938 fixes the CVE; the recorded stack and CI details remain in the tracking history.

## TICK — 2026-10-12

Current fork tip `10df5b747af90bf0aa5b43ce8d6f02a9797b1ff9` is still stacked on the old sample-sheet parent. Checked against the actual current sample_sheet_vue3 parent `9474de6d78b123e35ab144883e189fd7e4cffad3`, rather than assuming dev: nine production/test conflicts span grid adapters, SampleSheetGrid/useSampleSheetGrid, DisplayCollectionAsSheet and FetchGrid (including add/add test files). A safe restack requires reconciling parent editing/validation fixes with ag-grid 36 API adaptations; this is substantial. Left branch intact and retained the parent dependency and optional-upgrade decision.

## GOOD_MORNING — 2026-10-13

Current fork head `10df5b747af90bf0aa5b43ce8d6f02a9797b1ff9` conflicts with `9474de6d78b123e35ab144883e189fd7e4cffad3` in 9 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue` · `client/src/components/Collections/common/DisplayCollectionAsSheet.vue` · `client/src/components/Collections/sheet/SampleSheetGrid.test.ts` · `client/src/components/Collections/sheet/SampleSheetGrid.vue` · `client/src/components/Collections/sheet/useSampleSheetGrid.test.ts` · `client/src/components/Collections/sheet/useSampleSheetGrid.ts` · `client/src/components/Landing/FetchGrid.test.ts` · `client/src/components/Landing/FetchGrid.vue` · `client/src/composables/useAgGrid.ts`

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `10df5b747af90bf0aa5b43ce8d6f02a9797b1ff9` found overlapping changes in 9 paths (`client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue`, `client/src/components/Collections/common/DisplayCollectionAsSheet.vue`, `client/src/components/Collections/sheet/SampleSheetGrid.test.ts`, `client/src/components/Collections/sheet/SampleSheetGrid.vue`, `client/src/components/Collections/sheet/useSampleSheetGrid.test.ts`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
