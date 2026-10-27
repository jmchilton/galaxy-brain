---
upstream_base_branch: dev
---
# issue_17204_remove_shared_with_me_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/pull/24486)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2)

## Status

Status: `ci_wait` (2026-10-26): rebased onto `dev` and Dannon's review addressed at `a1fc81d4bc2`.

PR status: Draft [#24486](https://github.com/galaxyproject/galaxy/pull/24486) retargeted to `dev`.

CI status: PR CI rerunning; focused vitest (22) and workflow-sharing bookmark API tests pass locally.

## What

Share recipients remove histories, workflows and visualizations shared with them individually or in bulk (#17204); pages API-only. Recipient removal drops their workflow bookmark; owner unshare leaves bookmarks. Existing owner bulk messages now use correct singular/plural forms.

## Decisions

- Base `dev` (2026-10-26, Dannon review, John agreed): four new endpoints + schema change. Branch name keeps `_26.2` suffix to avoid reopening the PR.
- Bookmark cleanup only on recipient path (Dannon review): owner unshare of a still-published workflow must not strip the bookmark.
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
