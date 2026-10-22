# galaxy#24279 — [26.2] Keep configured tool versions, re-index local edits and refuse unindexed read-only stores in the cached toolbox

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24279) · [default review](initial_review.md) · [thermo review](thermo_review.md) ([refactor issue draft](thermo_followup_refactor_issue.md)) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [learning galaxy](learning_galaxy.md) ([follow-up issue](learning_galaxy_followup_issue.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [follow-up refactor issue](followup_refactor_issue.md) · [review branch `pr_24279_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24279_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `890d6f7ab98` delivered 2026-10-22 as approval; approved, awaiting merge. Findings: one P2 (integration test for bug 1) + seven P3s, all fixed on fork branch `pr_24279_review_0` (`4eff7fffd71`), not pushed into PR.

Open, ready for review, against `release_26.2` (milestoned 27.0). Author @mvdbeek. Fixes #24263, cached toolbox (18 files, +656/-71). Worktree `~/projects/worktrees/galaxy/pr/24279` (on `pr_24279_review_0`; no `.venv`, tests ran via main clone's venv).
