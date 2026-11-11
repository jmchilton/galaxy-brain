---
upstream_base_branch: release_25.1
---
# Job cache copies get their own metadata files

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_cache_own_metadata_files_25_1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_cache_own_metadata_files_25_1)

## Status

Implementation in progress.

No PR yet.

No CI yet.

## Decisions

- A job-cache output copies its source's metadata files into rows and files it owns, instead of referencing the source HDA's `metadata_file` rows. Sharing those rows lets pgcleanup's HDA purge remove a file the cached output still reads. mvdbeek agreed to the copy approach (per John, 2026-11-11). Changing pgcleanup to tie metadata lifetime to the Dataset was rejected as a workaround, as was reference counting (needs a migration).
- Found while hardening `issue_24787_metadata_source_shared_file_26_1`; no upstream issue.
