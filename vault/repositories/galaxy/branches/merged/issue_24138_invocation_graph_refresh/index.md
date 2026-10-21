# issue_24138_invocation_graph_refresh

Status: merged into `release_26.2` 2026-10-20 ([#24165](https://github.com/galaxyproject/galaxy/pull/24165)).

Fixes [#24138](https://github.com/galaxyproject/galaxy/issues/24138) (Steps tab headers freeze while an invocation runs) and the refresh-cost part of [#22745](https://github.com/galaxyproject/galaxy/issues/22745) (O(n²) graph refresh). Doesn't claim to fix #22745's zoom/pan freeze, which hasn't been browser-profiled. The PR shouldn't auto-close #22745.

Issue research: [24138](../../../issues/queued/24138/index.md) · [22745](../../../issues/queued/22745/index.md)

Worktree: `~/projects/worktrees/galaxy/branch/issue_24138_invocation_graph_refresh` · Branch: `jmchilton/issue_24138_invocation_graph_refresh`

[Implementation debrief](implementation_debrief.md) · [Initial debrief](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

**[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist](checklist_evaluation.md)**

Head `39b5efeee1c9f14f9666673d3cc6bc98b9cd83d3` (11 commits, rebased onto `release_26.2` 2026-10-16). PR text should say `Fixes #24138` and reference #22745 as "part of" only.

## CI

Fork CI 2026-10-15. Backend workflows ran on `3498376357c`; the last two commits are client-only, so those results stand.
- Test Galaxy packages (run 38678935300), unrelated: mypy `galaxy/security/ssh_util.py:18` untyped `publickey`, outside the diff. Fixed on base by `c4a38b08eae` (#24136); cleared by a rebase.
- Integration (run 38678935272), unrelated: Launchpad `GPGKeyTemporarilyNotFoundError` (HTTP 500), infra.
- Client unit, client lint, toolshed, startup green on `27d72f8b62d`; its Playwright and Integration Selenium runs were cancelled by the polish force-push. Fresh run pending on `cd820238598` (client-only since `3498376357c`); the new E2E has local runs only so far.

## Decisions

- 2026-10-15, John: remove the dead Overview `invocationAndJobTerminal` prop (done, `854c12654bd`); keep both the Steps component test and the E2E; keep `release_26.2` as the base ("probably"); clean up the `InvocationGraph.test.ts` mock call count (done).
- 2026-10-15, John: fix the dropped rerun in `rerunWhileBusy` itself, not the composable ("I want the right fix"); approved flipping its rejection test. Done, `cd820238598`.

## Notes

- ahmedhamidawan is the #22745 assignee and the author of #20719 and #18663; no @-mention has been added anywhere.

## TICK — 2026-10-15

Current-head Python lint fails isort in unchanged `test/unit/app/tools/test_expression_basics.py`, outside this client/browser change. Failed jobs rerun; no promotion while current checks remain pending.

## Morning refresh — 2026-10-16

Current #24165 conflicts with release_26.2 in client/src/composables/useInvocationGraph.test.ts. Both sides change the workflow-store mock and setupComposable arguments and add assertions; this needs deliberate test reconciliation. Left the branch intact under the small/mechanical conflict limit; moved to `author_work`. Its lint red is unrelated isort in unchanged test/unit/app/tools/test_expression_basics.py.

Requested failed-job reruns for diagnosed unrelated failures: [run 38777479091](https://github.com/galaxyproject/galaxy/actions/runs/38777479091). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Requested rebase — 2026-10-16

John requested rebasing #24165 onto `release_26.2`. Rebased all ten commits from `cd820238598dcf06466a76cf7cf5c394c5959877` onto `579ca73440d776002b7099538cef000838687d8e`; new head `6473c7cc0178f676d5d032e661cece548110d0bc`, pushed to the jmchilton fork with an exact force-with-lease. GitHub reports MERGEABLE; remains draft while fresh CI runs.

Resolved the single conflict in `useInvocationGraph.test.ts` by preserving upstream color-versus-text parameter assertions and the branch's polling assertions, adapting the upstream setup to the branch's workflow fixture. Runtime code merged automatically; range-diff changes are the test reconciliation and upstream color-handling context. No design decision or scope change.

Validation: six affected client test files, **71 passed**; reconciled test ESLint, formatting and `git diff --check` pass. Browser E2E was not rerun for this test-only conflict resolution.

## CI diagnosis — 2026-10-19

- Client linting / client-unit-test: `src/composables/useInvocationGraph.test.ts(412,71): error TS2322: Type 'number' is not assignable to type 'string'`. Relevant. The rebase rewrote the base's color-swatch test to assign typed `input_step_parameters` directly (schema has `workflow_step_id: string`). Fixed in `39b5efeee1c` by passing it through `setupComposable`'s untyped `invocationFields`, like the other callers and as the base test did; test data unchanged. vitest file 38/38, eslint and prettier clean.

## TICK — 2026-10-20

Every workflow on `39b5efeee1c` passed, including Client lint/unit, Playwright, Integration Selenium and Python lint. No backend workflows ran because the PR diff is client-only. Draft was held only for CI after the 10-16 rebase, so undrafted #24165 and moved it to `ready`.
