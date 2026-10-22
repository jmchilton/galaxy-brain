# extract_next_followups_baseline

- [#24368](https://github.com/galaxyproject/galaxy/pull/24368)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups_baseline)

The first seven commits of [`extract_next_followups`](../extract_next_followups/index.md) (#24225): three baseline-test commits and four refactors, cut at `602cf07cb37`. The cut is meant to land first. Base: `release_26.2`.

## Status

`ci_wait`: cut 2026-10-22 at `bb9c9ad754a`, re-cut at `602cf07cb37` after fixing an isort ordering error in the 5th commit (on both branches); pushed to `jmchilton`. It isn't rebased; it merges cleanly into `release_26.2` `cd04fbc2dcd`.

Draft PR [#24368](https://github.com/galaxyproject/galaxy/pull/24368) opened 2026-10-22 at John's request, titled "[26.2] Branch refactoring and tests to enable notebook extraction fixes"; undraft once CI is greenish.

Local: unit 130 passed; extraction + pages API 139 passed, 1 skipped (not a baseline test). First PR CI run failed isort (format) only, fixed. On `602cf07cb37`, framework tools (`never` legacy API) failed `output_filter/1.0.0-3` with 5 outputs instead of 3. That is unrelated: a race in `resolve_tool_submission`, where `job_outputs` can include discovered `__new_primary_file_*` element datasets. Failed job rerun 2026-10-22.

## Polish

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Debrief](polish_debrief.md). The commits are described in the main branch's [baseline refactor](../extract_next_followups/baseline_refactor.md) report (pre-rebase hashes).

## Standing instructions

Keep this branch an exact prefix of `extract_next_followups`, so #24225's diff shrinks once it merges. If the main branch changes any of its first seven commits, re-cut this branch at the new 7th commit.
