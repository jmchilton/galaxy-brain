---
upstream_base_branch: release_26.2
pr: 24742
---

# issue_24722_unversioned_tool_preflight_26_2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24722_unversioned_tool_preflight_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24722_unversioned_tool_preflight_26_2)

## Status

Fixes [#24722](https://github.com/galaxyproject/galaxy/issues/24722) ([issue record](../../../issues/queued/24722/index.md)); at `c9a13523c49`: mvdbeek's [jmchilton/galaxy#98](https://github.com/jmchilton/galaxy/pull/98) fast-forwarded in (merged), rebased on `release_26.2`. Safe-update pre-flight fix parked on [`…_safe_update_wip`](https://github.com/jmchilton/galaxy/tree/issue_24722_unversioned_tool_preflight_26_2_safe_update_wip) pending John's call (see Decisions). Worktree: `~/projects/worktrees/galaxy/branch/issue_24722_unversioned_tool_preflight_26_2`.

PR [#24742](https://github.com/galaxyproject/galaxy/pull/24742) open (not draft); the `752f657a172` approval is void and the PR description is stale (it's now an API change: exact invocation 400s on uninstalled pinned versions).

Fork CI pending on `c9a13523c49`.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Checklist](pr_checklist.md) · [Polish debrief](polish_debrief.md)

[Implementation](implementation_debrief.md) · [Initial](initial_implementation_debrief.md) · [Rescope](implementation_rescope_debrief.md) · [Alt: original scope](alts/original_scope.md) · [Normal review](subagents/normal_review.md) · [Rescope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Refactor baseline](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Brain research](brain_research.md) · [Earlier hardening](earlier_drafts/1/)

## Decisions

- Base `release_26.2`: the bug goes back to 25.1, but #24209 restructured `_check_workflow_tools` on 26.2, so an older base would conflict non-trivially on forward merge.
- Expanded scope per the first scope evaluation: the exact-version missing-tool 400 names the installed versions. The original scope is kept as an alt branch.
- Short ids at an installed version now pass exact-version checks on the eager toolbox, matching `CachedToolBox`.
- 2026-11-10: took mvdbeek's approach (#98): `get_tool_at_version` requires the step id to name the found tool (dev's `ToolsService._get_tool` rule) and is the only exact-version pre-flight lookup. Open: a stored step at a superseded built-in version (`__BUILD_LIST__` 1.0.0) now 400s. Accepting its `get_safe_version` update in the pre-flight isn't enough, since invocation loads stored steps with `exact_tools=False` and runs the newest (1.2.0, outside the safe range). Either invocation honors the safe version, or the 400 stands.
