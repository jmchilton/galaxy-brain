---
upstream_base_branch: release_26.2
---

# pages_extraction_summary_rename_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:pages_extraction_summary_rename_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/pages_extraction_summary_rename_26.2)

`GET /api/pages/{id}/workflow_extraction_summary` → `/api/pages/{id}/extraction_summary` (matches the histories route) and drops the unused `report_title` payload field. Split out of [`extract_next_followups`](../extract_next_followups/index.md) (#24225) because both names are new in 26.2: must merge before 26.2.0.

## Status

`branches_implemented_needs_ci`: cherry-pick of `c076821e882` onto `release_26.2` `0902830bfa6`, head `d4a265d39c3`, pushed 2026-10-28.

Pages extraction API tests 12 passed; regenerated `schema.ts` matches the committed one.

## Standing instructions

Keep the commit byte-identical to `c076821e882` on `extract_next_followups`, so the main branch's rebase drops it once this merges.
