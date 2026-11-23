---
upstream_base_branch: release_26.1
---
# issue_25004_mapped_job_outputs_26_1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_25004_mapped_job_outputs_26_1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_25004_mapped_job_outputs_26_1)

## Status

Status: `branches_ready_for_final_review`. Polished; no code changed since hardening. Base `release_26.1`; head `b72810c2028` (3 commits), pushed to the fork. Worktree: `~/projects/worktrees/galaxy/branch/issue_25004_mapped_job_outputs_26_1`.

No PR yet. Fork CI: one unrelated Converter-tests flake (rerun); long jobs pending at polish time.

Fixes [#25004](https://github.com/galaxyproject/galaxy/issues/25004): the Job Outputs table on Dataset Details listed the implicit map-over HDCA as an output of each mapped job.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Tags](pr_tags.md) · [Checklist](pr_checklist.md) · [Polish debrief](polish_debrief.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Performance](performance_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md)

## Decisions

- Fix A from the root-cause comment: `summarize_job_outputs` skips HDCAs that are the job's own implicit map-over collection. The job-to-HDCA association itself stays (job search, caching and access checks rely on it).
- Base `release_26.1`, as John asked.
- History export/import now keeps `HDCA.implicit_collection_jobs` (Codex finding), so the fix also covers imported histories. That's its own commit and can be split out.
- `/api/jobs/{id}/outputs`, `Job.to_dict` and `Job.io_dicts` are unchanged on purpose; see the scope evaluation for why `io_dicts` stays.
- Baseline tests commit `8432a4fb470` comes first and can be split out.
