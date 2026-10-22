# galaxy#24346 — Accept the MCP API key from an x-api-key header

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24346) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [learning galaxy](learning_galaxy.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24346_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24346_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `684e1ce9bcc` ready, unposted (2026-10-21): one P2 + four P3s, all implementation verified; five fixes (incl. new integration test, passed) on fork branch `pr_24346_review_0` (`e9740665028`), not pushed into PR. Awaiting John's pick in [response action](initial_response_action.md).

Open, ready for review, against `dev`. Author @dannon. MCP server auth (6 files, +187/-67). Worktree `~/projects/worktrees/galaxy/pr/24346` (on `pr_24346_review_0`; no `.venv`, tests ran via main clone's venv with `--import-mode=importlib`).
