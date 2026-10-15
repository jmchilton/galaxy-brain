# Invocation selection URLs — issue #24173

- Issue: https://github.com/galaxyproject/galaxy/issues/24173
- Branch: `issue_24173_invocation_selection_urls`
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24173_invocation_selection_urls`
- Base: `88127f42979` (`origin/dev`; corrected ghwt's initial stale checkout base before implementation)
- Status: final validation and handoff reviews in progress
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

Both implementation phases, normal reviews, strict quality review, fresh test challenge, and scope evaluation are complete. The fresh challenge passes 83 tests across 11 suites; full TypeScript checking and the production client build pass. Browser validation confirms all three URL selectors restore the intended mapped job; final navigation and screenshot verification remain in progress. No PR requested or opened.
