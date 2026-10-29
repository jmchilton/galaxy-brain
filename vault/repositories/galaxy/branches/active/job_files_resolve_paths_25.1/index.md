---
upstream_base_branch: release_25.1
---

# Job files API: absolute write paths, 4xx for invalid upload sources; job ports stops logging request kwargs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_files_resolve_paths_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_files_resolve_paths_25.1)

## Status

`branches_need_decision` — hardened at `c7e144050f2`; second scope eval says expand (port dev's read-side/unknown-job 4xx handling) ([debrief](implementation_debrief.md)).

## Merge-forward

From 26.2 on, the job files API lives in `JobFilesManager` (`lib/galaxy/managers/job_files.py`); the same check belongs in `authorize_write`, by hand at the 26.1→26.2 merge.
