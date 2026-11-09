---
upstream_base_branch: main
pr: 738
---

# Cast pattern MOCs with the leaf pages they link

- [Draft PR #738](https://github.com/galaxyproject/foundry/pull/738)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-570-cast-moc-leaf-patterns)

## Status

Rebased to `c2a038de` (pushed to `jmchilton`) on `origin/main` `4c747d65`, with the lockfile on `@galaxy-foundry/cast` 0.13.0 ([foundry-lib#139](https://github.com/jmchilton/foundry-lib/pull/139), released 2026-11-09), re-cast bundles and a `gxwf-foundry-note-schema` patch changeset.

Draft [#738](https://github.com/galaxyproject/foundry/pull/738), opened 2026-11-01 with John's explicit permission; mergeable.

CI at `c2a038de`: running; locally every `make check` target passes except the machine-only `check-vendored`.

## Notes

- [Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md)
- Decision (John, 2026-10-31): implement the cast-lib hook and the Foundry side together, rather than explicit leaf refs or an inline `tool_id`.
