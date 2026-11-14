---
upstream_base_branch: release_25.1
pr: 24902
---
# Job cache copies get their own metadata files

- [PR #24902](https://github.com/galaxyproject/galaxy/pull/24902)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/job_cache_own_metadata_files_25_1)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [checklist](pr_checklist.md) · [polish debrief](polish_debrief.md)

## Status

Polished and approved by John at `cf71d5eb437` (human review at that SHA, 2026-11-14); title "[25.1] Give job cache outputs their own metadata files".

[#24902](https://github.com/galaxyproject/galaxy/pull/24902) opened 2026-11-14 at John's request, not draft.

Fork CI on `cf71d5eb437`: Integration (incl. pgcleanup) green; two reds diagnosed unrelated: API `test_workflows::test_parameter_substitution_sanitization` (history still empty after `wait_for_history`, an invocation-scheduling race; text-only `validation` tool, no metadata files or job cache) and macOS startup (cancelled, as on `e59d884`).

## Decisions

- A job-cache output copies its source's metadata files into rows and files it owns, instead of referencing the source HDA's `metadata_file` rows. Sharing those rows lets pgcleanup's HDA purge remove a file the cached output still reads. mvdbeek agreed to the copy approach (per John, 2026-11-11). Changing pgcleanup to tie metadata lifetime to the Dataset was rejected as a workaround, as was reference counting (needs a migration).
- `get_replacement_dataset` skips purged HDAs, per the second scope evaluation (John, 2026-11-12).
- The `MetadataFile.update_from_file` cache-sync saving is included at John's request (2026-11-12), as its own last commit; the caching store now creates the cache directory it relied on the sync for.
- `FileParameter.make_copy` flushes the new row only under `store_by: id`; flushing under uuid wrote output HDAs before they joined a history, which CI's `GALAXY_TEST_RAISE_EXCEPTION_ON_HISTORYLESS_HDA` rejects (polish, 2026-11-12).
- Found while hardening `issue_24787_metadata_source_shared_file_26_1`; no upstream issue.
