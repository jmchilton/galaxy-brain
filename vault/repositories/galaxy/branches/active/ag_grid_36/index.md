---
upstream_base_branch: dev
---
# ag_grid_36

Status: `branches_need_polish`. Base: `dev`.

Upgrades ag-grid to 36.2.0 with grid editing and renderer adaptations.

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

The upgrade is optional now that #23938 fixes the CVE; older stack and CI details remain in the tracking history.

## Status

Polishing in progress; rebased without conflicts onto current `dev` (`a9a68082414`), tip `be137af455e`. The generic Selenium helper and both E2E commits are already upstream, leaving two commits.

Not opened as a PR.

Prior tip `3bf56e17e9b` CI checked 2026-10-27: no failed jobs; fresh CI required after rebase.

## Decisions

- 2026-10-22: John approved the scope expansion (E2E coverage for the row-copy paths). The original scope is on `ag_grid_36_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- John asked for this branch to be polished after hardening.
