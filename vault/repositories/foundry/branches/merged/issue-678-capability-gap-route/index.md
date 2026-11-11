---
upstream_base_branch: main
related_records:
  - foundry/issues/678
  - foundry/reviews/778
  - foundry/branches/issue-723-authoring-gate
pr: 778
---
# Route a found wrapper that can't serve its step to repair, not authoring

- [PR #778](https://github.com/galaxyproject/foundry/pull/778)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-678-capability-gap-route)

## Status

Merged 2026-11-10 at head `4e4df029` (merge `31a456b8`). [Implementation debrief](implementation_debrief.md).

The round-0 review fixes on `pr_778_round_0_rev_0` (`e4e83886`, 10 commits, [review](../../../reviews/archived/778/index.md)) were not in the merged head. They need a new PR.

## Decisions

- John, 2026-11-10: the ledger route over an `unsuitable` discovery status.
- `author-galaxy-tool-wrapper` is left to contributor PR #773. Draft comment for it: [pr773_comment.md](pr773_comment.md), not posted.

Part of #678. Plan: [skunkworks_plan.md](../../../issues/needs_decision/670/skunkworks_plan.md).
