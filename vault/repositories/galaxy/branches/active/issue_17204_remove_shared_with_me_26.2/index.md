---
upstream_base_branch: release_26.2
---
# issue_17204_remove_shared_with_me_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_17204_remove_shared_with_me_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2)

## Status

Status: `branches_ready_for_final_review` (2026-10-26): polished and pushed at `6b2ad0b2dbeb`; awaits John's human read-through.

No PR yet.

Fresh fork CI is queued/in progress; both original bookmark API failures are fixed and all 14 strict-warning workflow-sharing tests pass locally.

## What

Share recipients remove histories, workflows and visualizations shared with them individually or in bulk (#17204); pages API-only. Unsharing drops recipient workflow bookmarks. Existing owner bulk messages now use correct singular/plural forms.

## Decisions

- Base `release_26.2`: restores lost functionality, additive, no migration; issue labeled `release-testing-26.2`.
- John approved the second scope expansion on 2026-10-26; fresh scope evaluation recommends no further change.
- Baseline tests remain first; standalone plural-helper refactor precedes the feature. Alternatives are preserved in `alts/`.
- Worktree: `~/projects/worktrees/galaxy/branch/issue_17204_remove_shared_with_me_26.2`. Issue assignment left unchanged.

## Final review

- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Recommended labels](pr_tags.md)
- [Polishing debrief and verification](polish_debrief.md)
- [Checklist review](subagents/polish_checklist.md) and [one strengthening round](subagents/polish_strengthening.md)
- [Screenshots and browser evidence](screenshot_debrief.md)
