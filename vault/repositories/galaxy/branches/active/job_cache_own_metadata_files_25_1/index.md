---
upstream_base_branch: release_25.1
---
# Job cache copies get their own metadata files

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:job_cache_own_metadata_files_25_1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_cache_own_metadata_files_25_1)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](pr_checklist.md) · [polish debrief](polish_debrief.md)

## Status

Polished, ready for final review; polishing fixed a related CI red and replaced the cache-sync spy test ([polish_debrief.md](polish_debrief.md)).

No PR yet; the fork branch is at `cf71d5eb437`.

Fork CI on `e59d8849361` had 6 related reds, fixed in `bb9eebf798c` (5 re-run green locally under strict mode; Postgres pgcleanup waits on fork CI); CI on `cf71d5eb437` is pending.

## Decisions

- A job-cache output copies its source's metadata files into rows and files it owns, instead of referencing the source HDA's `metadata_file` rows. Sharing those rows lets pgcleanup's HDA purge remove a file the cached output still reads. mvdbeek agreed to the copy approach (per John, 2026-11-11). Changing pgcleanup to tie metadata lifetime to the Dataset was rejected as a workaround, as was reference counting (needs a migration).
- `get_replacement_dataset` skips purged HDAs, per the second scope evaluation (John, 2026-11-12).
- The `MetadataFile.update_from_file` cache-sync saving is included at John's request (2026-11-12), as its own last commit; the caching store now creates the cache directory it relied on the sync for.
- `FileParameter.make_copy` flushes the new row only under `store_by: id`; flushing under uuid wrote output HDAs before they joined a history, which CI's `GALAXY_TEST_RAISE_EXCEPTION_ON_HISTORYLESS_HDA` rejects (polish, 2026-11-12).
- Found while hardening `issue_24787_metadata_source_shared_file_26_1`; no upstream issue.
