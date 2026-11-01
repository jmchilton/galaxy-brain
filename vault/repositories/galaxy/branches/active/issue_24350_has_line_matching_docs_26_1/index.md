---
upstream_base_branch: release_26.1
---
# `has_line_matching` anchoring docs (#24350)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24350_has_line_matching_docs_26_1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24350_has_line_matching_docs_26_1)

## Status

Re-scoped and re-hardened at `c566eeb1d53`; BLOCKED on a scope decision (see [implementation_debrief.md](implementation_debrief.md)).

No PR yet.

CI not yet run.

## Decisions

- Target `release_26.1`: oldest release whose generated client artifacts (`schema.ts`, `ToolSourceSchema.json`) carry the assertion docs, so the PR is self-contained and forward-merges cleanly; `release_25.1` also has the bug if John prefers it.
- Re-scoped to also group the wrap as `^(?:e)$` (a behavior change); the docs-only take is kept as alt `issue_24350_has_line_matching_docs_26_1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- Open: fold in the `element_text_is`/`attribute_is` missing-`^` fix (second scope eval), or ship as is / contract to the alt.
