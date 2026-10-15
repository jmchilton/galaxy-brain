# Invocation selection preparation

- Branch: `issue_24173_invocation_selection_prep`
- Base: `88127f42979` (`dev`)
- Status: READY — independently reviewed, validated and pushed; CI pending
- Head: `60dc8ddf598`
- Consumer: [invocation selection URLs](../issue_24173_invocation_selection_urls/index.md), rebased on this branch
- [Implementation handoff](implementation_debrief.md)
- [Initial extraction debrief](initial_implementation_debrief.md)
- [Normal review](subagents/prep_review.md)
- [Strict review](thermo_nuclear_review.md)
- [Test challenge](test_challenges_debrief.md)

User requested separating independently useful fixes and baseline tests before the feature. GenericItem controlled expansion remains on the feature because the existing code does not consume its new API. Prep contains order-index lookup fixes, graph measurement readiness, real-router report coverage, metrics mocking, and the existing browser screenshot wait cleanup. No new unused API is introduced.

- [Scope evaluation](scope_evaluation.md)
- [E2E polish](polish_e2e_tests_debrief.md)
- [Screenshots](screenshot_debrief.md)

Independent checks: 41 client tests, full typecheck, production build, all commit hooks, and the real-browser job-details test pass. The inspected screenshot is local and ignored. No PR opened.
