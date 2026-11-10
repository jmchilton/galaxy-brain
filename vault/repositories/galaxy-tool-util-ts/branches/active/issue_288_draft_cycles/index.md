---
upstream_base_branch: main
blockers: gxformat2/branches/issue_288_draft_cycles
related_records: gxformat2/branches/issue_288_draft_cycles
---

# validateDraft: reject step cycles (gxformat2#288 port)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_288_draft_cycles)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_288_draft_cycles)

## Status

Polished at `8c04726c`, branched from `origin/main` `68451c8e`; ready for John's final review.

No PR yet.

No CI yet (PR-only); local gate green at `8c04726c`: `make check`, `make test` (gxwf-web's `--output-schema` test timed out once under two concurrent suite runs, passed on rerun).

## Polish

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md) (holds the questions for John).
- Reviews: [normal](subagents/normal_review.md), [codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md).

## Notes

- Issue: [gxformat2#288](https://github.com/galaxyproject/gxformat2/issues/288), record [gxformat2 issues/wip/288](../../../../gxformat2/issues/wip/288/index.md).
- [Implementation debrief](implementation_debrief.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_288_draft_cycles`.
- Fixture and expectations are synced from the gxformat2 branch, so that one lands first.
