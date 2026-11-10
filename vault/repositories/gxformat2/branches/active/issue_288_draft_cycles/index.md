---
upstream_base_branch: main
blocking: galaxy-tool-util-ts/branches/issue_288_draft_cycles
related_records: galaxy-tool-util-ts/branches/issue_288_draft_cycles
---

# validate_draft: reject step cycles (#288)

- [Open PR](https://github.com/galaxyproject/gxformat2/compare/main...jmchilton:gxformat2:issue_288_draft_cycles)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/issue_288_draft_cycles)

## Status

Implemented at `7118519` on the `jmchilton` fork, branched from `origin/main` `4e245c2`.

No PR yet.

Fork CI pending at `7118519`; the first push (`960bcce`) failed `lintdocstrings` (D401), fixed by amend.

## Notes

- Issue: [gxformat2#288](https://github.com/galaxyproject/gxformat2/issues/288), record [issues/wip/288](../../../issues/wip/288/index.md).
- Worktree: `~/projects/worktrees/gxformat2/branch/issue_288_draft_cycles`.
- Owns the shared fixture and expectations; the TS branch syncs them, so this one lands first.
- Rationale, checks and review live in the [TS branch's debrief](../../../../galaxy-tool-util-ts/branches/active/issue_288_draft_cycles/implementation_debrief.md).
- Local gate: AGENTS.md's lint list misses tox `lintdocstrings` (`flake8-docstrings`); run it too.
