---
upstream_base_branch: release_25.1
---

# Job files API: absolute write paths, 4xx for invalid upload sources; job ports stops logging request kwargs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_files_resolve_paths_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_files_resolve_paths_25.1)

## Status

`branches_ready_for_final_review` — polished at `c7e144050f2`: [description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [polish debrief](polish_debrief.md).

Fork CI green on `c7e144050f2`.

## Decisions

- 2026-10-29: John chose to ship as implemented (scope 1); dev's read-side/unknown-job 4xx port not taken.

## Merge-forward

From 26.2 on, the job files API lives in `JobFilesManager` (`lib/galaxy/managers/job_files.py`); the same check belongs in `authorize_write`, by hand at the 26.1→26.2 merge.
