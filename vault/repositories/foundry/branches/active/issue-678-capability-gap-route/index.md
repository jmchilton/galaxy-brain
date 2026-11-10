---
upstream_base_branch: main
related_records:
  - foundry/issues/678
  - foundry/reviews/778
pr: 778
---
# Route a found wrapper that can't serve its step to repair, not authoring

- [Draft PR #778](https://github.com/galaxyproject/foundry/pull/778)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-678-capability-gap-route)

## Status

Branch on `jmchilton`, base `origin/main` at `94ce4ea2`, head `4e4df029`, reviewed and fixed ([debrief](subagents/review_debrief.md)). Worktree `~/projects/worktrees/foundry/branch/issue-678-capability-gap-route`.

Draft PR [#778](https://github.com/galaxyproject/foundry/pull/778) opened 2026-11-10 from [pr_description.md](pr_description.md). [Implementation debrief](implementation_debrief.md).

CI pending on `4e4df029`; `validate-roadmap` is expected red, as on `main`: #768 (`roadmap/main`) isn't in the roadmap.

## Decisions

- John, 2026-11-10: the ledger route over an `unsuitable` discovery status.
- `author-galaxy-tool-wrapper` is left to contributor PR #773. Draft comment for it: [pr773_comment.md](pr773_comment.md), not posted.

Part of #678. Plan: [skunkworks_plan.md](../../../issues/needs_decision/670/skunkworks_plan.md).
