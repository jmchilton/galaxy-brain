---
upstream_base_branch: release_26.1
---
# issue_25004_mapped_job_outputs_26_1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_25004_mapped_job_outputs_26_1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_25004_mapped_job_outputs_26_1)

## Status

Implementing. Worktree: `~/projects/worktrees/galaxy/branch/issue_25004_mapped_job_outputs_26_1`.

No PR yet. CI not yet seen.

Fixes [#25004](https://github.com/galaxyproject/galaxy/issues/25004): the Job Outputs table on Dataset Details lists the implicit map-over HDCA as an output of each mapped job.

## Decisions

- Fix A from the root-cause comment: `summarize_job_outputs` skips HDCAs that are the job's own implicit map-over collection. The job-to-HDCA association itself stays (job search, caching and access checks rely on it).
- Base `release_26.1`, as John asked.
