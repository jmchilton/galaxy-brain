# issue_24377_history_item_buttons_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24377_history_item_buttons_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24377_history_item_buttons_26.2)

## Status

Status: `ready` (PR open). Polished; re-scoped once, hardened twice. Base: `release_26.2` (`fe7b52529a0`). Head: `379f1267d54`. Alt: `issue_24377_history_item_buttons_26.2_alt_original_scope`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24377_history_item_buttons_26.2`.

PR [#24400](https://github.com/galaxyproject/galaxy/pull/24400) opened out of draft 2026-10-23 on John's launch approval.

Fork CI on `379f1267d54` green (Pulsar packages/CWL skipped).

Implements [#24377](https://github.com/galaxyproject/galaxy/issues/24377) ([issue record](../../../issues/queued/24377/index.md)): restores the stubbed history item button tooltip checks, fixes the stale selectors, and adds a GCollapse `g-collapse-shown` marker that `history_panel_click_item_title(wait=True)` waits on.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Polish](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · Reviews: [subagents/](subagents/) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex](codex_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_26.2`: restores test coverage that has been a no-op since 2022 ("missing tests are bugs"); found in 26.2 release testing. Same stub on `release_26.1` and `dev`.
- Re-scoped to Scope E per the first scope evaluation: galaxy-ui marker class plus the shared helper wait, instead of a test-local inline-style wait.
- Disabled edit button's "not yet editable" tooltip never shows (`vGTooltip` skips `aria-disabled`). Out of scope; queued in `gx_issues/to_file/history_item_disabled_edit_tooltip.md`. The discarded test asserts `aria-disabled` instead.
