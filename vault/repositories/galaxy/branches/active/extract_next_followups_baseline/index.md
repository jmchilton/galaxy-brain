# extract_next_followups_baseline

- [#24368](https://github.com/galaxyproject/galaxy/pull/24368)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups_baseline)

The first eight commits of [`extract_next_followups`](../extract_next_followups/index.md) (#24225): three baseline-test commits, four refactors and a review-nit commit, head `e1f860da171`. The cut is meant to land first. Base: `release_26.2`.

## Status

`ready`: approved by mvdbeek 2026-10-23 with four optional nits; all four addressed 2026-10-24 in `e1f860da171` and pushed to `jmchilton` ([review response](review_response.md)).

PR [#24368](https://github.com/galaxyproject/galaxy/pull/24368), "[26.2] Branch refactoring and tests to enable notebook extraction fixes"; base `release_26.2`.

CI re-running on `e1f860da171`; the only earlier red (Main tool tests) was runner disk quota, unrelated. Local: touched extraction API tests 7 passed.

## Polish

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Debrief](polish_debrief.md). The commits are described in the main branch's [baseline refactor](../extract_next_followups/baseline_refactor.md) report (pre-rebase hashes).

## Standing instructions

Keep this branch an exact prefix of `extract_next_followups`, so #24225's diff shrinks once it merges. If the main branch changes any of its first eight commits, re-cut this branch at the new 8th commit.
