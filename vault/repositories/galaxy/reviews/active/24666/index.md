# #24666 — [26.2] Create the tool source store schema atomically and let one process populate it

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24666) (author mvdbeek, base `release_26.2`, fixes #24519)
- Worktree: `~/projects/worktrees/galaxy/pr/24666/`

## Status

Initial review ready, unposted (round 0, reviewed `7587ed8a9ff`). Two P2s + six P3s; seven fixed on [`pr_24666_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24666_review_0) (tip `8f75f2d1c59`, on John's fork, not pushed into PR). P3 1 (restart waits 120 s on own dead lease) deliberately left unfixed — pid-liveness takeover unsafe for containers sharing a hostname.

PR open, out of draft.

## Round 0 (`7587ed8a9ff`)

- Response: [initial_review_response.md](initial_review_response.md); actions: [initial_response_action.md](initial_response_action.md); findings to trim: [verified_findings_checklist.md](verified_findings_checklist.md)
- [verified_review.md](verified_review.md), [filtered_findings.md](filtered_findings.md), [review_0_branch_details.md](review_0_branch_details.md), [initial_review_agents.md](initial_review_agents.md)
- Reports: [initial_review.md](initial_review.md), [thermo_review.md](thermo_review.md), [test_challenges_review.md](test_challenges_review.md), [performance_challenges_review.md](performance_challenges_review.md), [risks.md](risks.md), [learning_galaxy.md](learning_galaxy.md)
- Verifier note: fast-panel `_populate_once` call site in `_init_tools_from_index` is unreachable (already so at base); suggested dropping on dev.
