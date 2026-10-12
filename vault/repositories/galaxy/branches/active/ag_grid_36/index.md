# ag_grid_36

Status: `branches_implemented`. Base: `dev`.

Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations.

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

The upgrade is optional now that #23938 fixes the CVE; the recorded stack and CI details remain in the tracking history.

## TICK — 2026-10-12

Current fork tip `10df5b747af90bf0aa5b43ce8d6f02a9797b1ff9` is still stacked on the old sample-sheet parent. Checked against the actual current sample_sheet_vue3 parent `9474de6d78b123e35ab144883e189fd7e4cffad3`, rather than assuming dev: nine production/test conflicts span grid adapters, SampleSheetGrid/useSampleSheetGrid, DisplayCollectionAsSheet and FetchGrid (including add/add test files). A safe restack requires reconciling parent editing/validation fixes with ag-grid 36 API adaptations; this is substantial. Left branch intact and retained the parent dependency and optional-upgrade decision.
