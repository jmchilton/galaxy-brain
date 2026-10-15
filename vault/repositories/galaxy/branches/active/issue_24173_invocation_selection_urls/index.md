# Invocation selection URLs — issue #24173

- Issue: https://github.com/galaxyproject/galaxy/issues/24173
- Branch: `issue_24173_invocation_selection_urls`
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24173_invocation_selection_urls`
- Base: `issue_24173_invocation_selection_prep` at `60dc8ddf598`; prep is based on `dev` at `88127f42979`
- Status: READY — stacked on prep, reviewed and pushed; CI pending
- Head: `a0482b43e0c` (pushed)
- [Implementation handoff](implementation_debrief.md)
- [Prep extraction and user decision](extraction_debrief.md)
- [Prep branch](../issue_24173_invocation_selection_prep/index.md)
- [Plan](plan.md)
- [Initial implementation debrief](initial_implementation_debrief.md)
- [Phase 1 review](subagents/phase1_review.md)
- [Phase 2 review](subagents/phase2_review.md)
- [Test challenge](test_challenges_debrief.md)
- [Validation environment](validation_environment.md)
- [Strict quality review](thermo_nuclear_review.md)
- [Label-resolution follow-up review](subagents/label_resolution_review.md)
- [Scope evaluation](scope_evaluation.md)
- [E2E polish](polish_e2e_tests_debrief.md)
- [Final browser-test review](subagents/final_e2e_review.md)
- [Screenshots](screenshot_debrief.md)

The user-approved split is complete. Prep contains five independent commits (+158/-46 lines, 12 files), and the feature above it is +1398/-44 across 24 files. GenericItem stays with its feature consumers. The rebased feature has exactly the previously validated Git tree; prior 83-test/type/build/two-browser/seven-screenshot evidence remains valid. Prep independently passes 41 tests, typecheck, build, hooks and browser validation. Both branches are pushed and queued with CI pending. No PR opened.
