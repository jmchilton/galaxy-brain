# Invocation selection URLs — issue #24173

- Issue: https://github.com/galaxyproject/galaxy/issues/24173
- Branch: `issue_24173_invocation_selection_urls`
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24173_invocation_selection_urls`
- Base: `88127f42979` (`origin/dev`; corrected ghwt's initial stale checkout base before implementation)
- Status: READY — reviewed, pushed, local checks green; CI pending
- Head: `43167c36a4c`
- [Implementation handoff](implementation_debrief.md)
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

Shareable step, job and output selections are implemented. Both implementation phases and normal reviews, strict quality review, fresh test challenge, scope evaluation, E2E polish and screenshot review are complete. The final affected client run passes 83 tests across 11 suites; both real-browser checks pass. Full TypeScript checking, production client build and pre-commit checks pass. The implementation and browser commits are pushed to the fork, and the branch is queued under `branches_implemented_needs_ci`. No PR requested or opened.
