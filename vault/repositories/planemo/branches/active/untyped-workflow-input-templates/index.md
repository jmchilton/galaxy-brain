---
upstream_base_branch: master
pr: 1774
---
# Treat untyped workflow inputs as data in job templates

- [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:untyped-workflow-input-templates)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/untyped-workflow-input-templates)

Found while taking over [planemo#1744](https://github.com/galaxyproject/planemo/pull/1744) ([`list-param-inputs-not-collections`](../list-param-inputs-not-collections/index.md) debrief); no GitHub issue. Debriefs: [implementation](implementation_debrief.md), [review](subagents/review_1.md), [Codex](codex_review.md), [polish](polish_debrief.md). PR: [description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).

## Status

Branch `untyped-workflow-input-templates` on `jmchilton`, `~/projects/worktrees/planemo/branch/untyped-workflow-input-templates`; based on `origin/master` `2a815808`; head `fcf41a60`.

Draft PR [#1774](https://github.com/galaxyproject/planemo/pull/1774) opened 2026-10-29 at John's request.

Fork CI on `fcf41a60` pending; local gate green.

## Dependencies

- Overlaps [`list-param-inputs-not-collections`](../list-param-inputs-not-collections/index.md) (#1744), whose `input_kind` also defaults untyped to data. Whichever merges second keeps one default: `input_kind(normalized_input_type(step))`, dropping `input_kind`'s own fallback.
