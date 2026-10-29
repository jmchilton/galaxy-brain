---
upstream_base_branch: release_26.2
pr: 24595
---

# pages_extraction_summary_rename_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:pages_extraction_summary_rename_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/pages_extraction_summary_rename_26.2)

`GET /api/pages/{id}/workflow_extraction_summary` → `/api/pages/{id}/extraction_summary` (matches the histories route), drops the unused `report_title` payload field, and renames the label hint `kind` → `src` (`OutputLabelHint`/`StepLabelHint`). Split out of [`extract_next_followups`](../extract_next_followups/index.md) (#24225) because both names are new in 26.2: must merge before 26.2.0.

## Status

PR #24595 opened 2026-10-29 (not draft); fork CI green on `9425d5e862b`. Polished 2026-10-28; hardened and re-scoped 2026-10-28, head `9425d5e862b` (3 commits on `release_26.2` `0902830bfa6`). See [implementation_debrief.md](implementation_debrief.md), [polish_debrief.md](polish_debrief.md), [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md).

## Standing instructions

Keep the first commit (`d4a265d39c3`) byte-identical to `c076821e882` on `extract_next_followups`, so the main branch's rebase drops it once this merges. `extract_next_followups` must absorb commits 2–3 (`kind`→`src` conflicts with its `7dd3f9c161f`).
