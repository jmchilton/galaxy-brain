---
upstream_base_branch: main
pr: 738
---

# Cast pattern MOCs with the leaf pages they link

- [Draft PR #738](https://github.com/galaxyproject/foundry/pull/738)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-570-cast-moc-leaf-patterns)

## Status

Polished at `ec4d9ca4` (pushed to `jmchilton`), from `origin/main` `eb2de3f1`. Its dependency [jmchilton/foundry-lib#139](https://github.com/jmchilton/foundry-lib/pull/139) shipped as `@galaxy-foundry/cast` 0.13.0 on 2026-11-09; the branch needs a rebase (conflicts with `main`), lockfile refresh and re-cast.

Draft [#738](https://github.com/galaxyproject/foundry/pull/738), opened 2026-11-01 with John's explicit permission; conflicting with `main`.

CI at `ec4d9ca4`: `test` and `changeset` fail at `pnpm install --frozen-lockfile` (lockfile pins `^0.12.3`, manifests ask `^0.13.0`) — related; clears once the lockfile picks up 0.13.0.

## Notes

- [Implementation debrief](implementation_debrief.md), [normal review](subagents/normal_review.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md)
- Decision (John, 2026-10-31): implement the cast-lib hook and the Foundry side together, rather than explicit leaf refs or an inline `tool_id`.
