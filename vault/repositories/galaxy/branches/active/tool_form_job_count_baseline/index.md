# tool_form_job_count_baseline

- [#24217](https://github.com/galaxyproject/galaxy/pull/24217)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tool_form_job_count_baseline)

The leading baseline tests and refactor commits of [`tool_form_job_count`](../tool_form_job_count/index.md), cut at its 6th commit for a PR that lands first. Base: `dev`.

## Status

`attention`: rebased 2026-10-20 onto dev `93b3c85e532` at `005d75ad95d`, still an exact prefix of `tool_form_job_count`. mvdbeek nits 1–3 were folded into commit 3 the same day. To resolve the commit 6 conflict, `tool_form_select_collection` now builds on dev's `tool_form_select_data`. John approved `bd218fccaef` on 2026-10-17 with the title "Branch refactoring and tests to enable tool form job counts".

PR [#24217](https://github.com/galaxyproject/galaxy/pull/24217) was approved by mvdbeek 2026-10-20 with one question and three nits ([response](pr_review_response.md)); it is mergeable.

PR CI on `005d75ad95d`: mypy `lib/galaxy/tools/parameters/meta.py:257` "Returning Any from function" (`_is_async_batch`, added by this branch) fails Python linting + package jobs; needs a fix (2026-10-23). `test_rerun_dataset_collection_element` hasn't been run locally since the conflict resolution.

## Polish

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md). The process and checklist findings are in the main branch's [polish debrief](../tool_form_job_count/polish_debrief.md); the commits are described in its [baseline refactor](../tool_form_job_count/baseline_refactor.md) report (pre-rebase hashes).

## Standing instructions

Keep this branch an exact prefix of `tool_form_job_count`. If polishing the main branch changes any of the first six commits, re-cut this branch at the new 6th commit.
