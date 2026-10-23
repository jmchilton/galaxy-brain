# ag_grid_36

Status: `branches_implemented`. Base: `dev`.

Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations.

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

The upgrade is optional now that #23938 fixes the CVE; older stack and CI details remain in the tracking history.

## Status

Hardened and re-scoped. Tip `3bf56e17e9b` (5 commits on `dev`) is READY; the [implementation debrief](implementation_debrief.md) has details and links.

Not opened as a PR.

Fork CI green on `3bf56e17e9b` (2026-10-23); ready for polish.

## Decisions

- 2026-10-22: John approved the scope expansion (E2E coverage for the row-copy paths). The original scope is on `ag_grid_36_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- John asked for this branch to be polished after hardening.
