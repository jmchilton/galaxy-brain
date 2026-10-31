---
upstream_base_branch: main
---

# Cast pattern MOCs with the leaf pages they link

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-570-cast-moc-leaf-patterns?expand=1)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-570-cast-moc-leaf-patterns)

## Status

Polished and ready for John's final review at `ec4d9ca4` (pushed to `jmchilton`), from `origin/main` `eb2de3f1`. It depends on draft [jmchilton/foundry-lib#139](https://github.com/jmchilton/foundry-lib/pull/139), which needs releasing as `@galaxy-foundry/cast` 0.13.0.

No PR yet: the auto-mode classifier blocked opening the Foundry draft PR, so John opens it from `pr_description.md`.

No CI yet. The local gate is green apart from the machine-only `check-vendored`; CI can't install until the lib is published and the lockfile refreshed.

## Notes

- [Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md)
- Decision (John, 2026-10-31): implement the cast-lib hook and the Foundry side together, rather than explicit leaf refs or an inline `tool_id`.
