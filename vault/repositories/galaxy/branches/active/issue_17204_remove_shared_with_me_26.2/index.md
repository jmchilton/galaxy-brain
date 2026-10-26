---
upstream_base_branch: release_26.2
---
# issue_17204_remove_shared_with_me_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_17204_remove_shared_with_me_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2)

## Status

Status: `branches_implemented_needs_ci` (READY, 2026-10-26): approved scope expansion complete, freshly hardened, three Playwright scenarios passed and six screenshots verified; head `81e7e68d517`.

No PR yet.

Fork CI at the final head has not yet been assessed.

## What

Share recipients remove histories, workflows and visualizations shared with them individually or in bulk (#17204); pages API-only. Unsharing drops recipient workflow bookmarks. Existing owner bulk messages now use correct singular/plural forms.

## Decisions

- Base `release_26.2`: restores lost functionality, additive, no migration; issue labeled `release-testing-26.2`.
- John approved the second scope expansion on 2026-10-26; fresh scope evaluation recommends no further change.
- Baseline tests remain first; standalone plural-helper refactor precedes the feature. Alternatives are preserved in `alts/`.
- Worktree: `~/projects/worktrees/galaxy/branch/issue_17204_remove_shared_with_me_26.2`. Issue assignment left unchanged.
