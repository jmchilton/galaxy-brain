---
upstream_base_branch: dev
---
# ag_grid_36

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ag_grid_36?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/ag_grid_36)

## Status

Status: `branches_ready_for_final_review`; polished at `7c58e3c3f63` on `dev` (`a9a68082414f`), awaiting John's human read-through.

Not opened as a PR.

Fork CI checked 2026-10-27: pending on this head, with no failed jobs; local client and Playwright checks passed (mypy matches baseline).

## Review

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist and strengthening reviews](subagents/polish_reviews.md)

[Implementation](implementation_debrief.md) · [Tracking history](tracking_history.md)

## Decisions

- The upgrade is optional now that #23938 fixes the CVE.
- 2026-10-22: John approved the scope expansion (E2E coverage for the row-copy paths). The original scope is on `ag_grid_36_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- John asked for this branch to be polished after hardening.
