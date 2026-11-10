---
upstream_base_branch: main
related_records: foundry/issues/678
---
# Route a found wrapper that can't serve its step to repair, not authoring

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-678-capability-gap-route)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-678-capability-gap-route)

## Status

Branch on `jmchilton`, base `origin/main` at `94ce4ea2`, head `4e4df029`, reviewed and fixed ([debrief](subagents/review_debrief.md)). Worktree `~/projects/worktrees/foundry/branch/issue-678-capability-gap-route`.

No PR yet. [Implementation debrief](implementation_debrief.md).

Local `make -k check` green at `4e4df029` except `check-vendored` (machine-only) and `validate-roadmap`, which fails on `main` too: #768, opened 2026-11-10 as `roadmap/main`, isn't in the roadmap.

## Decisions

- John, 2026-11-10: the ledger route over an `unsuitable` discovery status.
- `author-galaxy-tool-wrapper` is left to contributor PR #773. Draft comment for it: [pr773_comment.md](pr773_comment.md), not posted.

Part of #678. Plan: [skunkworks_plan.md](../../../issues/needs_decision/670/skunkworks_plan.md).
