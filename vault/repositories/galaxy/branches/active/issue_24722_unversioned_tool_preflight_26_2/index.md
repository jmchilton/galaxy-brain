---
upstream_base_branch: release_26.2
---

# issue_24722_unversioned_tool_preflight_26_2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24722_unversioned_tool_preflight_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24722_unversioned_tool_preflight_26_2)

## Status

Polished for [#24722](https://github.com/galaxyproject/galaxy/issues/24722) ([issue record](../../../issues/queued/24722/index.md)); ready for final review at `0e76ac8e20b` (fork). Worktree: `~/projects/worktrees/galaxy/branch/issue_24722_unversioned_tool_preflight_26_2`.

No PR yet.

Fork CI on `0e76ac8e20b` green except `macOS startup`, whose 3.10 job was cancelled (unrelated).

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Checklist](pr_checklist.md) · [Polish debrief](polish_debrief.md)

[Implementation](implementation_debrief.md) · [Initial](initial_implementation_debrief.md) · [Rescope](implementation_rescope_debrief.md) · [Alt: original scope](alts/original_scope.md) · [Normal review](subagents/normal_review.md) · [Rescope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Refactor baseline](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Brain research](brain_research.md) · [Earlier hardening](earlier_drafts/1/)

## Decisions

- Base `release_26.2`: the bug goes back to 25.1, but #24209 restructured `_check_workflow_tools` on 26.2, so an older base would conflict non-trivially on forward merge.
- Expanded scope per the first scope evaluation: the exact-version missing-tool 400 names the installed versions. The original scope is kept as an alt branch.
- Short ids at an installed version now pass exact-version checks on the eager toolbox, matching `CachedToolBox`.
