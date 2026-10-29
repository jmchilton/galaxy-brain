---
upstream_base_branch: master
---
# Treat untyped workflow inputs as data in job templates

- [Open PR](https://github.com/galaxyproject/planemo/compare/master...jmchilton:planemo:untyped-workflow-input-templates)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/untyped-workflow-input-templates)

Found while taking over [planemo#1744](https://github.com/galaxyproject/planemo/pull/1744) ([`list-param-inputs-not-collections`](../list-param-inputs-not-collections/index.md) debrief); no GitHub issue. Debrief: [implementation_debrief.md](implementation_debrief.md).

## Status

Branch `untyped-workflow-input-templates` on `jmchilton`, `~/projects/worktrees/planemo/branch/untyped-workflow-input-templates`; based on `origin/master` `2a815808`; head `fcf41a60`.

No PR yet.

Fork CI on `fcf41a60` pending; local gate green.

## Dependencies

- Overlaps [`list-param-inputs-not-collections`](../list-param-inputs-not-collections/index.md) (#1744), whose `input_kind` also defaults untyped to data. Whichever merges second keeps one default: `input_kind(normalized_input_type(step))`, dropping `input_kind`'s own fallback.
