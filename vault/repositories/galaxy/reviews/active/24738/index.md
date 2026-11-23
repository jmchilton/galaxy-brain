# #24738 — Update the storage usage live when it changes on the server

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24738) · base `dev` · author davelopez · worktree `~/projects/worktrees/galaxy/pr/24738`
- Follows #24664 (part 2 of #24663).

## Status

Initial review (round 0) on `c55d04482f9` ready, unposted; trimmed by John 2026-11-11 to two P2s + three P3s (P2 3, P2 4, P3 1–3), all fixed on `pr_24738_round_0_rev_1` (pushed to jmchilton fork, not into PR). `rev_0` keeps the untrimmed fixes.

2026-11-23: John had a `dev` merge pushed into the PR (`dcd8410b095` → `30d71956c29`, merging `7dd58b00674`) to clear conflicts with dev's `invocation_update`/`job_update` SSE work in `lib/galaxy/app/__init__.py` and `lib/galaxy/queue_worker/__init__.py`; both sides kept. Quota, change-event and SSE entity unit tests pass. Dev's `ChangeEventPublisher` (`lib/galaxy/managers/change_events.py`) now sits beside the PR's own `send_user_quota_updates_on_commit` listener — possible shared abstraction for re-review.

## Round 0 (`c55d04482f9`)

- [verified_review.md](verified_review.md) · [initial_review_response.md](initial_review_response.md) · [initial_response_action.md](initial_response_action.md) · [verified_findings_checklist.md](verified_findings_checklist.md)
- [round_0_rev_1_branch_details.md](round_0_rev_1_branch_details.md) · [round_0_rev_0_branch_details.md](round_0_rev_0_branch_details.md) · [filtered_findings.md](filtered_findings.md) · [initial_review_agents.md](initial_review_agents.md)
- Reports: [initial_review.md](initial_review.md) · [thermo_review.md](thermo_review.md) · [test_challenges_review.md](test_challenges_review.md) · [performance_challenges_review.md](performance_challenges_review.md) · [risks.md](risks.md) · [learning_galaxy.md](learning_galaxy.md) · [learning_galaxy_followup_issue.md](learning_galaxy_followup_issue.md)
