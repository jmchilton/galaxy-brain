---
upstream_base_branch: release_25.1
pr: 24564
---

# Job files API: absolute write paths, 4xx for invalid upload sources; job ports stops logging request kwargs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_files_resolve_paths_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_files_resolve_paths_25.1)

## Status

PR [#24564](https://github.com/galaxyproject/galaxy/pull/24564) opened 2026-10-29 at `c7e144050f2f744136a2a959ecf0f2caf75e9067`, approved by John.

Fork CI green on `c7e144050f2f744136a2a959ecf0f2caf75e9067`.

## Decisions

- 2026-10-29: John chose to ship as implemented (scope 1); dev's read-side/unknown-job 4xx port not taken.

## Merge-forward

From 26.2 on, the job files API lives in `JobFilesManager` (`lib/galaxy/managers/job_files.py`); the same check belongs in `authorize_write`, by hand at the 26.1→26.2 merge.
