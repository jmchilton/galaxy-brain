# invocation_graph_e2e

Status: `merged` (refreshed 2026-10-16).
Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_e2e`.

Adds browser tests for the workflow invocation Overview graph (Selenium + Playwright). Source issue draft (PR-first, not filed): [proposed_invocation_graph_no_e2e_coverage](../../../issues_incubator/internal/invocation_graph_no_e2e_coverage/proposal.md).

- [Implementation debrief](implementation_debrief.md) · [initial](initial_implementation_debrief.md)
- [Normal review](subagents/normal_review_1.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)
- [Live-update test parked for #24138](live_update_test_for_24138.md)
- [PR description](pr_description.md) · [PR titles](pr_titles.md) · [Polish debrief](polish_debrief.md)

## Decisions

- Live-update graph test kept off this branch: intermittently red on dev until the [#24138 fix](../../merged/issue_24138_invocation_graph_refresh/index.md) lands.

## Draft pending CI — 2026-10-15

John switched [#24164](https://github.com/galaxyproject/galaxy/pull/24164) to draft and explicitly requested CI monitoring and automatic promotion out of draft when CI is green. This supersedes the earlier out-of-draft opening instruction. Track in `ci_wait`; on a later queue refresh, re-query the current head and checks, take the PR out of draft once CI is green, and move it to `ready` without asking again. No separate human decision is needed for that transition.

Live verification: open, draft, mergeable against `dev`, head `7d2439be1c44aa627c67e70cf255cd64d094c6b7`. GitHub Actions checks are queued; CircleCI is green. No GitHub draft-state change was needed during this tracking update.

## TICK — 2026-10-15

Still draft. Package jobs fail mypy at unchanged `galaxy/security/ssh_util.py:18`; installed startup fails building unchanged `packages/meta` (`egg_base`: missing `src`). Both are outside the graph/browser change; failed jobs rerun. Tool Shed standalone failure has an incomplete log ending at collection, so it is not diagnosed as unrelated. Relevant browser checks and remaining CI are still pending. Preserve automatic undraft authorization once current CI is green; no promotion now.

## Morning refresh — 2026-10-16

GitHub confirms [#24164](https://github.com/galaxyproject/galaxy/pull/24164) merged at 2026-10-16T06:04:54Z, head `7d2439be1c44aa627c67e70cf255cd64d094c6b7`. Removed from the active queue and archived this record under `merged/`. Clean worktree removed with ghwt after verifying pushed history.
