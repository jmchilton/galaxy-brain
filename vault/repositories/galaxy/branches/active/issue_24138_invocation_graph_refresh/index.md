# issue_24138_invocation_graph_refresh

Status: draft PR [#24165](https://github.com/galaxyproject/galaxy/pull/24165), waiting for CI. Opened 2026-10-15 at John's request on `cd820238598`, title "[26.2] Keep invocation step states current while the invocation runs"; screenshots hosted on the fork's `pr-assets-issue_24138_invocation_graph_refresh`. Base: `release_26.2` (regression since 25.1; merges cleanly into `dev`).

Fixes [#24138](https://github.com/galaxyproject/galaxy/issues/24138) (Steps tab headers freeze while an invocation runs) and the refresh-cost part of [#22745](https://github.com/galaxyproject/galaxy/issues/22745) (O(n²) graph refresh). Doesn't claim to fix #22745's zoom/pan freeze, which hasn't been browser-profiled. The PR shouldn't auto-close #22745.

Issue research: [24138](../../../issues/queued/24138/index.md) · [22745](../../../issues/queued/22745/index.md)

Worktree: `~/projects/worktrees/galaxy/branch/issue_24138_invocation_graph_refresh` · Branch: `jmchilton/issue_24138_invocation_graph_refresh`

[Implementation debrief](implementation_debrief.md) · [Initial debrief](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

**[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist](checklist_evaluation.md)**

Head `cd820238598` (10 commits, rebased onto `release_26.2` 2026-10-15). PR text should say `Fixes #24138` and reference #22745 as "part of" only.

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
