---
upstream_base_branch: release_25.1
---

# Job files API only accepts absolute write paths; job ports stops logging request kwargs

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_files_resolve_paths_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_files_resolve_paths_25.1)

## Status

Implementation in progress.

## Merge-forward

From 26.2 on, the job files API lives in `JobFilesManager` (`lib/galaxy/managers/job_files.py`); the same check belongs in `authorize_write`, by hand at the 26.1→26.2 merge.
