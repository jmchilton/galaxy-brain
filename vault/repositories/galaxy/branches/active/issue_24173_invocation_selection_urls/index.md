# Invocation selection URLs — issue #24173

- Issue: https://github.com/galaxyproject/galaxy/issues/24173
- Branch: `issue_24173_invocation_selection_urls`
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24173_invocation_selection_urls`
- Base: `issue_24173_invocation_selection_prep` at `195bbc6c7e0f73a1dd11720ee40aaaa78628d96e`.
Status: `branches_ready_for_final_review`. Head: `a33bfd0d049664b5f703d9ef0e23cc33754ece0a`. Fork CI pending.
- Head: `a33bfd0d049664b5f703d9ef0e23cc33754ece0a` (pushed).
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

## Morning refresh — 2026-10-16

Fork Python lint fails isort in the changed lib/galaxy_test/selenium/test_workflow_invocation_details.py. Browser checks also fail restoring the client cache before tests. Retain a CI blocker; this is not greenish coverage.

The isolated attempt to rebase onto the newly rebased prep parent conflicted in WorkflowInvocationStep.vue and was aborted. The fork and original development worktree remain unchanged; parent integration is pending.

## Stack/CI repair — 2026-10-16

Base: `issue_24173_invocation_selection_prep` at `13e92c00bc0ab1014c4a722b72cab29623237e0c`.

Integrated the feature onto its already-rebased prep parent, preserving the upstream `invocation-step-config-tab` selector and the feature's watcher that loads config for URL-selected tabs. Preserved the mapped-job URL browser test, without resurrecting the local `invocation_open_latest` helper superseded by the inherited helper. Fixed the changed browser test's isort failure. Range-diff changes are limited to those conflict resolutions and import formatting.

Validation: 5 selection/graph/state client files, **61 tests passed**. Full client typecheck passes after rebuilding the local API-client declarations (the first attempt used stale declarations and reported unrelated file-source capability types). Browser-test isort and diff whitespace checks pass. No new browser run was performed in this repair. No design or behavior choice was changed.

Published `978ff1c92536be5355c967ecbf911742b43fe0bb` to `jmchilton/issue_24173_invocation_selection_urls`. Fresh fork CI is pending. Conflict resolutions or code fixes require a fresh human read; no prior SHA approval is carried forward. No PR was opened.

## Graph centering moved to E2E — 2026-10-20

User judged prep's `WorkflowGraph.test.ts` the wrong layer: it mocked `useElementBounding`, hand-set viewport refs and asserted transform strings, so it proved only that the guard existed. Dropped it from prep. The mapped-job browser test now asserts that the URL-selected node is centered within 5px for all three selector aliases (new `invocations.graph_canvas` selector). Locally (Playwright, headless) it passed with the fix and failed at that assertion against the pre-fix `WorkflowGraph.vue` (offset `[66.5, -240]`). Rebased onto the new prep and published `4085a88fe48` with an old-head lease. Fresh human read required; fork CI pending.

## Duplicated component checks trimmed — 2026-10-20

Per user review, added `a33bfd0d049` on top (no history rewrite). New browser test `test_step_url_scrolls_steps_list` opens a 26-step invocation at `steps?step_number=26` and asserts the card is in the window. Locally it passed, and it failed at that assertion with the `scrollIntoView` call removed (top 1481px in a 1000px window). Removed the jsdom `scrollIntoView` spy assertion from `WorkflowInvocationSteps.test.ts`, the deep-link/page-2 assertions duplicated by the browser test from `JobStepSelection.test.ts`, and the opted-in query-reuse and main-tab assertions from `Analysis.test.ts`; only legacy report remounting remains there. The three Vitest files pass (5 tests); eslint/prettier/black/isort pass.
