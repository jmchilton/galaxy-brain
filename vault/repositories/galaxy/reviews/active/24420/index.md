# #24420 — Add exact to GET /api/tools/{tool_id}

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24420) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24420_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24420_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `8faff364290` complete 2026-10-23, unposted: P1 (`exact=true` with short/versionless shed id always 404s; red-to-green unit test), one P2 + two P3s, all fixed on `pr_24420_review_0` (`0c10060d87f`, pushed to fork; check moved into ToolsService/toolbox). Unit 9/9 + edited API test pass.

Open, ready for review, against `dev`. Author richard-burhans. 2 files, +20/-0. Worktree `~/projects/worktrees/galaxy/pr/24420`.
