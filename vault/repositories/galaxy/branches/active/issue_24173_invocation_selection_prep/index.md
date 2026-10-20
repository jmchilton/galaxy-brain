# Invocation selection preparation

- Branch: `issue_24173_invocation_selection_prep`
- Base: `88127f42979` (`dev`)
- Status: `branches_ready_for_final_review` (refreshed 2026-10-16).
- Head: `195bbc6c7e0f73a1dd11720ee40aaaa78628d96e`
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

## Morning refresh — 2026-10-16

Rebased onto `origin/dev` and published `13e92c00bc0ab1014c4a722b72cab29623237e0c` only to jmchilton with an exact old-head lease. Kept the base Vue import and dropped the metrics-mock commit already supplied by the base, avoiding duplicate declarations. Three changed component suites pass (22 tests); WorkflowInvocationState cannot collect because the shared UI GRadio export is undefined. No fully green local suite claimed. Fresh human review is required. Fresh fork CI is pending. Existing local development worktrees were left at their original heads; use the new fork head when resuming.

## Graph VTU test dropped — 2026-10-20

Removed `WorkflowGraph.test.ts` (it faked jsdom layout) from the graph-centering commit, so that fix now ships without a dedicated test. Centering is asserted end-to-end in the feature branch's browser test. Published `195bbc6c7e0` with an exact old-head lease; old local head kept as `backup/issue_24173_prep_60dc8ddf598`. Fresh human read required; fork CI pending.
