# Invocation selection URLs — issue #24173

- [PR #24307](https://github.com/galaxyproject/galaxy/pull/24307)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24173_invocation_selection_urls)

## Status

Branch is polished at `d0b76746d47` (rebased onto `dev` `f1772b6775d` on 2026-10-23); John's final read-through (including the human-read checklist item) is still pending.

[#24307](https://github.com/galaxyproject/galaxy/pull/24307) against `dev` was opened by accident on 2026-10-20; prep's four commits appear in its diff until prep merges.

PR is mergeable after the force-push; CI on `d0b76746d47` not yet checked.

## Branch

- Issue: https://github.com/galaxyproject/galaxy/issues/24173
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24173_invocation_selection_urls`
- Stacked on [prep](../issue_24173_invocation_selection_prep/index.md); its four commits are carried here rebased onto `dev` `f1772b6775d` (prep's own branch still at `195bbc6c7e0` on `5bf7abf5e32`).

## Decisions

- John split independently useful fixes and baselines into prep; new APIs (GenericItem controlled expansion) stay with their consumers here.
- Graph centering and Steps-list scrolling are asserted in browser tests, not jsdom/VTU fakes.
- Accidental PR (2026-10-20): kept #24307 as draft; title is the first `pr_titles.md` option, body is `pr_description.md` (screenshots on fork branch `pr-assets-issue_24173_invocation_selection_urls`), labels from `pr_tags.md`. Not an approval; undraft only after John's read-through.
- Polish (2026-10-20): delete baseline-only `Analysis.test.ts`; strip unresolvable `job`/`output`/`step_tab` once the step or invocation is terminal; add a browser test for `output=` links.

- Rebase (2026-10-23): `1dd5eb07d8e` → `d0b76746d47` on `dev` `f1772b6775d`. Dev's `956c561c8a2` replaced `WorkflowInvocationSteps.test.ts` mocking (`useInvocationGraph` → `workflowStore.getFullWorkflowCached`), so the grouped-input selection test was ported onto dev's mocks (hoisted `steps`/`selection`), with `order_index: 0` added to dev's invocation fixture since step lookup is by order index. Selenium file: kept both new tests. Later polish edits to that test replayed by hand. Component code merged cleanly; 27 vitest files (159 tests) in Invocation/, WorkflowInvocationState/, invocationSelection, GenericItem, entry/analysis pass; selenium not run.

## Polish

- [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md)
- [Polish debrief](polish_debrief.md) · [Checklist evaluation](subagents/polish_checklist.md)
- [Screenshots](screenshot_debrief.md) (PNGs in ignored `screenshots/`)

## History

- [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Implementation handoff](implementation_debrief.md) · [Prep extraction](extraction_debrief.md)
- [Phase 1 review](subagents/phase1_review.md) · [Phase 2 review](subagents/phase2_review.md) · [Label-resolution review](subagents/label_resolution_review.md) · [Final browser-test review](subagents/final_e2e_review.md)
- [Test challenge](test_challenges_debrief.md) · [Strict quality review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [E2E polish](polish_e2e_tests_debrief.md)
- [Validation environment](validation_environment.md)
