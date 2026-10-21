# Invocation selection URLs — issue #24173

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24173_invocation_selection_urls?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24173_invocation_selection_urls)

## Status

Branch is polished at `c69f43e3222` and waits in `branches_ready_for_final_review` for John's read-through, including the human-read checklist item.

No PR is open. The PR should target `dev`; the stacked base `issue_24173_invocation_selection_prep` exists only on the fork, so prep's four commits appear in the diff until prep merges.

Fork CI on `c69f43e3222` is pending; the prior head's reds were diagnosed as unrelated (see [polish debrief](polish_debrief.md#ci)).

## Branch

- Issue: https://github.com/galaxyproject/galaxy/issues/24173
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24173_invocation_selection_urls`
- Stacked on [prep](../issue_24173_invocation_selection_prep/index.md) at `195bbc6c7e0`, which sits on `dev` at `5bf7abf5e32`.

## Decisions

- John split independently useful fixes and baselines into prep; new APIs (GenericItem controlled expansion) stay with their consumers here.
- Graph centering and Steps-list scrolling are asserted in browser tests, not jsdom/VTU fakes.
- Polish (2026-10-20): delete baseline-only `Analysis.test.ts`; strip unresolvable `job`/`output`/`step_tab` once the step or invocation is terminal; add a browser test for `output=` links.

## Polish

- [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md)
- [Polish debrief](polish_debrief.md) · [Checklist evaluation](subagents/polish_checklist.md)
- [Screenshots](screenshot_debrief.md) (PNGs in ignored `screenshots/`)

## History

- [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Implementation handoff](implementation_debrief.md) · [Prep extraction](extraction_debrief.md)
- [Phase 1 review](subagents/phase1_review.md) · [Phase 2 review](subagents/phase2_review.md) · [Label-resolution review](subagents/label_resolution_review.md) · [Final browser-test review](subagents/final_e2e_review.md)
- [Test challenge](test_challenges_debrief.md) · [Strict quality review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [E2E polish](polish_e2e_tests_debrief.md)
- [Validation environment](validation_environment.md)
