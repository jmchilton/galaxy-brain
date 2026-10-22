# galaxy#24319 — [26.2] Reload a stale cached toolbox index after a populate that writes nothing

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24319) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24319_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24319_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `cffdae9b5f2` ready, not delivered (2026-10-22): four P3s, all fixed on fork branch `pr_24319_review_0` (`a9a4caa5db0`), not pushed into PR.

Open, ready for review, against `release_26.2`. Author @mvdbeek. Cached toolbox index race fix (2 files, +150/-2). Worktree `~/projects/worktrees/galaxy/pr/24319` (on `pr_24319_review_0`; no `.venv`, tests ran via main clone's venv with `--import-mode=importlib`).
