# #24409 — [26.1] Add repeat instances for input connections on import without fill_defaults

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/24409) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_24409_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24409_review_0) ([details](review_0_branch_details.md)) · [PR description](initial_pr_description.md) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [findings checklist](verified_findings_checklist.md) · [agents](initial_review_agents.md)

## Status

Initial review of `234b345ca41` delivered 2026-10-23: [PR #2 on author's fork](https://github.com/richard-burhans/galaxy/pull/2) from `pr_24409_review_0` + [comment](https://github.com/galaxyproject/galaxy/pull/24409#issuecomment-6376180656) on #24409. Findings: one P2 (KeyError on `<x>_<N>` section/conditional names, reproduced) + two P3s, all fixed on `pr_24409_review_0` (`333ee95ffce`, pushed to fork; added/edited API tests pass, unedited `test_repeat_connection_without_fill_defaults` not run locally).

Open, ready for review, against `release_26.1`. Author richard-burhans. 2 files, +71/-1. Mypy lint failure fixed by author in `234b345ca41` (our identical fix dropped). Worktree `~/projects/worktrees/galaxy/pr/24409` (bootstrapped `.venv`).
