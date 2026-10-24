# #24404 — [25.1] Lock HDCAs with FOR NO KEY UPDATE when touching update_time

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24404) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24404_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24404_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Archived 2026-10-23: PR merged by John (GitHub state MERGED, 2026-10-24T00:03Z). Review response was never posted; tracking ended on merge.

Initial review of `ede9d32e647` complete 2026-10-23, unposted: three P3s (integration-test strength + comment/docstring trim), all on `pr_24404_review_0` (`ab457b3ac9e`, pushed to fork). Edited Postgres-only integration test not run locally (no Postgres); CI must cover it.

Was open against `release_25.1`. Author mvdbeek. 2 files, +51/-3. Worktree `~/projects/worktrees/galaxy/pr/24404`.
