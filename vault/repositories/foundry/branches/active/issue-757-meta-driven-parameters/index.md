---
upstream_base_branch: main
related_records: foundry/issues/757
---
# Meta-driven per-element parameters in the channel-shape note

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-757-meta-driven-parameters?expand=1)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-757-meta-driven-parameters)

Addresses [#757](https://github.com/galaxyproject/foundry/issues/757). Branched from `origin/main` at `e72d75cb`.

## Status

Polished at `61da1159`. Waiting for John's final review.

No PR yet.

No CI: fork branch. The local gate is green apart from `check-vendored` (local drift) and `validate-roadmap` (unrelated #768/#783 labels).

## Files

- [Implementation debrief](implementation_debrief.md)
- Reviews: [normal](subagents/normal_review.md), [Codex](codex_review.md), [domain](subagents/domain_review.md), [docs](subagents/docs_review.md). Thermo-nuclear review skipped because the branch has no implementation code, only docs and YAML fixtures.
- Polish: [debrief](polish_debrief.md), [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md)

## Open questions for John

These are listed in [polish_debrief.md](polish_debrief.md):

- Whether to file upstream issues for #661/#667.
- What to do with the untouched "Low-Confidence TODOs" and "Mold Use" sections.
- Fixtures: `state:` versus `tool_state:`.
- Whether to add a test for the Open row.
