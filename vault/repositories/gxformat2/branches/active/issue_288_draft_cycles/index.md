---
upstream_base_branch: main
pr: 294
blocking: galaxy-tool-util-ts/branches/issue_288_draft_cycles
related_records: galaxy-tool-util-ts/branches/issue_288_draft_cycles
---

# validate_draft: reject step cycles (#288)

- [PR #294](https://github.com/galaxyproject/gxformat2/pull/294)
- [View on GitHub](https://github.com/jmchilton/gxformat2/tree/issue_288_draft_cycles)

## Status

Polished at `6cc1d0a` on the `jmchilton` fork, branched from `origin/main` `4e245c2`.

PR #294 opened at John's request on 2026-11-10 against `main`, labelled `bug`; it merges before the paired galaxy-tool-util-ts#228.

Fork CI green at `6cc1d0a`; PR CI running.

## Polish

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md); [polish debrief](../../../../galaxy-tool-util-ts/branches/active/issue_288_draft_cycles/polish_debrief.md) (holds the questions for John).

## Notes

- Issue: [gxformat2#288](https://github.com/galaxyproject/gxformat2/issues/288), record [issues/wip/288](../../../issues/wip/288/index.md).
- Worktree: `~/projects/worktrees/gxformat2/branch/issue_288_draft_cycles`.
- Owns the shared fixture and expectations; the TS branch syncs them, so this one lands first.
- Rationale, checks and review live in the [TS branch's debrief](../../../../galaxy-tool-util-ts/branches/active/issue_288_draft_cycles/implementation_debrief.md).
- Local gate: AGENTS.md's lint list misses tox `lintdocstrings` (`flake8-docstrings`); run it too.
