---
upstream_base_branch: main
---

# Cast pattern MOCs with the leaf pages they link

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-570-cast-moc-leaf-patterns?expand=1)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-570-cast-moc-leaf-patterns)

## Status

Implemented and pushed to `jmchilton` at `40fdcbe0`, from `origin/main` `eb2de3f1`. It depends on foundry-lib branch [`cast-expand-refs`](https://github.com/jmchilton/foundry-lib/tree/cast-expand-refs), which has to be released as `@galaxy-foundry/cast` 0.13.0.

No PR yet.

No CI yet. The local gate is green apart from the machine-only `check-vendored`; CI can't install until the lib is published.

## Notes

- [Implementation debrief](implementation_debrief.md)
- Decision (John, 2026-10-31): implement the cast-lib hook and the Foundry side together, rather than explicit leaf refs or an inline `tool_id`.
