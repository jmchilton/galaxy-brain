# PR #24280 — Ignore stale user/history object store preferences

- PR: https://github.com/galaxyproject/galaxy/pull/24280 (davelopez, `release_25.1`, +96/-14, 5 files; fixes #23868)
- Status: Approved with response; awaiting merge
- Delivery: [approved](https://github.com/galaxyproject/galaxy/pull/24280#pullrequestreview-5585167313) by John, 2026-10-20T12:46:37Z, on head `ff83754163b`
- Reviewed commit: `ff83754163b26e9c19fd6d2d2fb241b69e4adf4a`
- Reviewed: 2026-10-20 (picked by John)
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24280`
- Response draft: [initial_review_response.md](initial_review_response.md); actions: [initial_response_action.md](initial_response_action.md)
- Verified review: [verified_review.md](verified_review.md) — one P3 (helper typing); [filtered](filtered_findings.md)
- Review branch: `pr_24280_review_0` on [jmchilton fork](https://github.com/jmchilton/galaxy/tree/pr_24280_review_0) ([details](review_0_branch_details.md))
- Reports: [default](initial_review.md), [test challenger](test_challenges_review.md), [risks](risks.md); [agents](initial_review_agents.md)

Main risk: silent fallback to weighted default for retired-backend preferences on a release branch (stated in PR body). Job wrapper is the only reader of stored preferences; uploads go through it. Milestone is 27.0 though base is release_25.1.

## Archived — 2026-10-20

Merged by mvdbeek into `release_25.1` at 2026-10-20T12:47:57Z on head `ff83754163b`. Tracking ended on merge. Worktree removed (clean, at pushed review branch head). Review branch `pr_24280_review_0` remains on jmchilton fork.
