# extract_next_followups_baseline

- [#24368](https://github.com/galaxyproject/galaxy/pull/24368)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups_baseline)

The first eight commits of [`extract_next_followups`](../../active/extract_next_followups/index.md) (#24225): three baseline-test commits, four refactors and a review-nit commit, head `25edde000a5`. The cut is meant to land first. Base: `release_26.2`.

## Status

Merged: #24368 merged into `release_26.2` 2026-10-28 (`0902830bfa6`) at head `25edde000a5`; `extract_next_followups` rebased onto it.

PR [#24368](https://github.com/galaxyproject/galaxy/pull/24368), "[26.2] Branch refactoring and tests to enable notebook extraction fixes"; approved by mvdbeek, nits addressed ([review response](review_response.md)).

## Polish

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Debrief](polish_debrief.md). The commits are described in the main branch's [baseline refactor](../../active/extract_next_followups/baseline_refactor.md) report (pre-rebase hashes).

## CI diagnosis (2026-10-26, run on `e1f860da171`)

- Python linting / Test (3.10, 3.14): mypy `pages.py:434` `BasicSharedApp` has no `history_manager`. Branch-caused (`get_accessible_notebook`). Fixed in `25edde000a5`: `PageManager.__init__` stores `app.history_manager`. Same bug exists on `extract_next_followups` (needs the same fix when re-cut).
- Test Galaxy packages (3.10, 3.14): log ends mid-pytest with no failure, 18-22 min, no assertion errors; runner timeout/crash, unrelated. Superseded by the new push's CI.

## Standing instructions

Keep this branch an exact prefix of `extract_next_followups`, so #24225's diff shrinks once it merges. If the main branch changes any of its first eight commits, re-cut this branch at the new 8th commit.
