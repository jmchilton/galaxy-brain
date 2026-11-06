---
upstream_base_branch: main
blockers: gxformat2/branches/issue_215_draft_port_edges
related_records: gxformat2/branches/issue_215_draft_port_edges
---

# draft-next-step: report edges around TODO ports; draft-validate: reject unwired ones (#215)

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...issue_215_draft_port_edges)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_215_draft_port_edges)

## Status

Implemented; pushed to `origin`, branched from `origin/main` `f5470fe5`.

No PR yet.

Local gate: lint, format, typecheck, knip, build and sync checks green; tests green except 3 integration-tests that fail identically on `origin/main`. Makefile checksum targets fail under Node 26 (pre-existing). CI runs on PRs only.

## Notes

- Issue: [galaxy-tool-util-ts#215](https://github.com/jmchilton/galaxy-tool-util-ts/issues/215), record [issues/wip/215](../../../issues/wip/215/index.md).
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_215_draft_port_edges`.
- Expectations and fixtures are synced from the gxformat2 branch, so that one lands first.
