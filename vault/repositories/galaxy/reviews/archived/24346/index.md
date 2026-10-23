# galaxy#24346 — Accept the MCP API key from an x-api-key header

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24346) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [learning galaxy](learning_galaxy.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24346_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24346_review_1) ([details](review_1_branch_details.md)) · [full-fix branch `pr_24346_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24346_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Merged 2026-10-22 (`6615d343d48`); archived 2026-10-23. Tracking ended on merge; worktree removed.

Initial review of `684e1ce9bcc` delivered as approval with response (2026-10-21, [review](https://github.com/galaxyproject/galaxy/pull/24346#pullrequestreview-5608946466)): two P3s (header constant, `_mcp_url` helper) on fork branch `pr_24346_review_1` (`6f002204f29`), not pushed into PR; `verified_review.md` keeps all five.

Open, ready for review, against `dev`. Author @dannon. MCP server auth (6 files, +187/-67). Worktree `~/projects/worktrees/galaxy/pr/24346` (on `pr_24346_review_1`; no `.venv`, tests ran via main clone's venv with `--import-mode=importlib`).

## Decisions

- 2026-10-21: John asked to post only verified P3 2 (header constant) and P3 4 (`_mcp_url` helper); renumbered P3 1/P3 2 in the response.
