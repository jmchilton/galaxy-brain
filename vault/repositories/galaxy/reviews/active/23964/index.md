# galaxy#23964 — Add semantic design tokens to galaxy-ui, generated from one source

- [View on GitHub](https://github.com/galaxyproject/galaxy/pull/23964) · [default review](initial_review.md) · [test challenges](test_challenges_review.md) ([debrief](test_challenges_debrief.md)) · [learning galaxy](learning_galaxy.md) ([follow-up issue](learning_galaxy_followup_issue.md)) · [risks](risks.md) · [verified review](verified_review.md) · [filtered](filtered_findings.md) · [review branch `pr_23964_review_0`](https://github.com/jmchilton/galaxy/tree/pr_23964_review_0) ([details](review_0_branch_details.md)) · [response](initial_review_response.md) · [response action](initial_response_action.md) · [agents](initial_review_agents.md)

## Status

Initial review of `9b8df5aa76e` delivered 2026-10-22 as approval; John trimmed the response to P3 4–6 (verified P2 + P3 1–3 left out). Fixes for all on fork branch `pr_23964_review_0`, not pushed into PR. galaxy-brain follow-up issue opened: https://github.com/jmchilton/galaxy-brain/issues/34. Awaiting merge.

Merged current `dev` (`6ebef15681f`) into the author branch and pushed merge commit [`a8842b1dc06`](https://github.com/galaxyproject/galaxy/commit/a8842b1dc068793f1ba7bf2e3a58ba648425aefe) on 2026-10-29. Resolved the token conflicts by preserving the PR's single source in `theme.css` and carrying forward `dev`'s new grey-250 token and alias. Verified generated CSS, no redeclarations, and `git diff --check`; full Vitest was unavailable in the isolated checkout. GitHub reports the PR mergeable, with checks pending (`UNSTABLE`).

`9b8df5aa76e` is John's merge of `dev` into the PR, pushed to the author's branch 2026-10-22 (conflict with dev's form-field tokens resolved by moving them into galaxy-ui `theme.css` and regenerating `tokens.css`).

Open, ready for review, against `dev`. Author @dannon. Worktree `~/projects/worktrees/galaxy/pr/23964` (client deps installed; no `.venv`).
