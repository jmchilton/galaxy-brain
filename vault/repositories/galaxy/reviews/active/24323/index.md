# #24323 — [26.1] Preserve data table rows and collapse duplicate choices

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24323) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24323_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24323_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `306cec00874` ready, unposted (2026-10-21): two P2s + three P3s, all implementation verified; five fixes (incl. unit red test + new API test, passed) on fork branch `pr_24323_review_0` (`8c179de4aac`), not pushed into PR. Awaiting John's pick in [response action](initial_response_action.md).

Open, ready for review, against `release_26.1`. Author @mvdbeek. Fixes #24278. Backend + unit tests (7 files, ~+240/-41). Worktree `~/projects/worktrees/galaxy/pr/24323` (on `pr_24323_review_0`; no `.venv`, tests ran via main clone's venv).
