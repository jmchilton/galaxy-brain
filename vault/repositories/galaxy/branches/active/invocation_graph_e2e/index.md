# invocation_graph_e2e

Status: PR open, [#24164](https://github.com/galaxyproject/galaxy/pull/24164) (`ready`), opened 2026-10-15 at John's request, out of draft. Title: "Add E2E tests for the invocation graph". Screenshots hosted on `jmchilton/pr-assets-invocation_graph_e2e`. Base: `dev` (`c63ffc2ccae`). Fork branch: `jmchilton/invocation_graph_e2e` @ `7d2439be1c4`.
Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_e2e`.

Adds browser tests for the workflow invocation Overview graph (Selenium + Playwright). Source issue draft (PR-first, not filed): [proposed_invocation_graph_no_e2e_coverage](../../../../../agents/gx_issues/internally_managed/proposed_invocation_graph_no_e2e_coverage.md).

- [Implementation debrief](implementation_debrief.md) · [initial](initial_implementation_debrief.md)
- [Normal review](subagents/normal_review_1.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)
- [Live-update test parked for #24138](live_update_test_for_24138.md)
- [PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md)

## Decisions

- Live-update graph test kept off this branch: intermittently red on dev until the [#24138 fix](../issue_24138_invocation_graph_refresh/index.md) lands.
