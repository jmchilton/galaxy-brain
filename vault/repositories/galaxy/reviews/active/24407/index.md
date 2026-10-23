# #24407 — [26.1] Fail a discovered output collection when its job errors before writing any element

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24407) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24407_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24407_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `2273ae0bca5` complete 2026-10-23, unposted: one P2 (map-over: one empty failed element now fails whole invocation — behavior change, author's call) + five P3s, all addressed on `pr_24407_review_0` (`e8463cbbbb6`, pushed to fork; new/edited tests pass on SQLite).

Open, ready for review, against `release_26.1`. Author richard-burhans. 4 files, +66/-0. Worktree `~/projects/worktrees/galaxy/pr/24407` (bootstrapped `.venv`).
