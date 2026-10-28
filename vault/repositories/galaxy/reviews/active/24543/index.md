# PR #24543 — [26.2] Fix plain Sign Out ending all of a user's sessions

- PR: https://github.com/galaxyproject/galaxy/pull/24543 (itisAliRH → `release_26.2`)
- Worktree: `~/projects/worktrees/galaxy/pr/24543`
- John's ask: drop unit test for multi-session E2E? Answer: API test with multiple `requests.Session`s (no multi-browser E2E helper exists); done on review branch.

## Round 0 — reviewed `41b869bc0b2`, delivered as comment 2026-10-28 (https://github.com/galaxyproject/galaxy/pull/24543#issuecomment-6480215541)

- [verified_review.md](verified_review.md) — P2 1 (multi-session API test replaces unit test, red-to-green verified), P3 1 (dead Masthead click listener)
- [initial_review_response.md](initial_review_response.md), [initial_response_action.md](initial_response_action.md), [verified_findings_checklist.md](verified_findings_checklist.md)
- Branch `pr_24543_review_0` on jmchilton fork: [review_0_branch_details.md](review_0_branch_details.md)
- Reports: [initial_review.md](initial_review.md), [test_challenges_review.md](test_challenges_review.md), [risks.md](risks.md), [filtered_findings.md](filtered_findings.md), [initial_review_agents.md](initial_review_agents.md)
