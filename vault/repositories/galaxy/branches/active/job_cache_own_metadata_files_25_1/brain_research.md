```yaml
documents:
  - path: vault/repositories/galaxy/reviews/active/24745/initial_review_response.md
    why: Section on `HDA.copy_from(include_metadata=True)` shows this exact bug reproduced on dev with a real job-cache hit (purge_deleted_hdas on the source removed the live copy's index), and that a PR 24745-style uuid guard can't see it (one row, no duplicate uuid).
    load_when: Writing the repro test or deciding how pgcleanup behaviour should be asserted.
  - path: vault/repositories/galaxy/branches/active/issue_24787_metadata_source_shared_file_26_1/scope_evaluation.md
    why: Where this bug was found; has the trace (copy_from shares `_metadata`, pgcleanup selects by `hda_id`), the `make_copy` fix on a sibling path, and the rejected alternatives (pgcleanup guards).
    load_when: Choosing the design and checking it against what the sibling branch already changed in `FileParameter.make_copy`.
  - path: vault/repositories/galaxy/branches/active/issue_24787_metadata_source_shared_file_26_1/implementation_debrief.md
    why: Final shape of the sibling `make_copy` change (returns None for an id-less file owned by another Dataset instead of copying, because the copy path calls `object_store.exists()` on a Dataset with no id); a different base (release_26.1), so check what is and isn't on release_25.1.
    load_when: Touching `FileParameter.make_copy`, or hitting merge conflicts between the two branches.
  - path: vault/research/Component - Jobs API and Job Cache.md
    why: Both cache-hit paths: the early search (`tools/actions` copies `completed_data._metadata` onto a fresh output) and the handler/late path (`Job.copy_from_job` -> `copy_from(out_data, include_metadata=True)`), plus `copied_from_job_id` semantics and existing tests.
    load_when: Enumerating every place a cached output picks up the source's `_metadata`.
  - path: vault/research/Component - Object Store Cache and Direct Access.md
    why: How a `MetadataFile` is addressed (extra_dir `_metadata_files`, alt_name `metadata_<id|uuid>.dat`), inherits `object_store_id`, and how input staging reads every `MetadataFile`.
    load_when: Writing tests that assert distinct files or paths, or reasoning about `object_store.exists(target_dataset)`.
  - path: vault/repositories/galaxy/reviews/active/24745/verified_review.md
    why: P1 1 end-to-end repro and the full account of how purge paths (`full_delete`, pgcleanup `RemovesMetadataFiles`) treat shared rows.
    load_when: Deciding which remover paths the new test must cover.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: Where outputs and metadata are committed at job finish, and how the cache hit skips it.
    load_when: Checking when the copied rows and files get committed relative to the handler's cache-hit path.
  - path: vault/repositories/galaxy/branches/active/issue_24264_library_metadata_file_name_25.1/index.md
    why: Prior release_25.1 branch in `MetadataFile.get_file_name`; shows test choices and base handling in this area.
    load_when: Touching `MetadataFile.get_file_name` or object-store swapping in unit tests.
  - path: vault/agents/gx_research/todo/dataset_metadata_files.md
    why: Pending request for a note on `FileParameter.make_copy`, the id-less `MetadataFile` shortcut, and every metadata file remover; this branch is listed under Requested by. Not a published note yet.
    load_when: Understanding make_copy's id-less shortcut before the note exists.
  - path: vault/agents/gx_research/todo/hda_copies_and_dataset_sharing.md
    why: Pending request for a note on `copy` / `copy_from` and what they share with the source; this branch is listed under Requested by. Not a published note yet.
research_requests:
  - vault/agents/gx_research/todo/dataset_metadata_files.md
  - vault/agents/gx_research/todo/hda_copies_and_dataset_sharing.md
```

## Code observations for implementers (not from the brain)

Read at `e631e8fb37e` on `release_25.1`; verify before relying on them.

- `HistoryDatasetAssociation.copy_from` (`lib/galaxy/model/__init__.py:5889`) assigns `self._metadata = other_hda._metadata` **before** `self.dataset = new_dataset or other_hda.dataset`. `FileParameter.make_copy` (`lib/galaxy/model/metadata.py:652`) only copies a file when `target_dataset.object_store.exists(target_dataset)`, using `target_context.parent.dataset`. At that point the parent's dataset is the cached job's empty output dataset, not the source's, so a naive swap to the `metadata` setter would return `None` and drop the index. The copy likely needs to happen after the dataset swap.
- A second site shares the same way: the early cache search at `lib/galaxy/tools/actions/__init__.py:628` sets `data._metadata = completed_data._metadata` on a freshly created output. The handler path later overwrites it via `copy_from_job`, but a cache hit decided in the early search may never reach `copy_from`.
- Other `copy_from(..., include_metadata=True)` callers: `Job.copy_from_job` (`model/__init__.py:1779`), `DatasetCollection.copy_from` elements (`:7536`), the tool `copy_object` path (`tools/__init__.py:3320`), and the recursive loop over `copies` inside `copy_from` itself (`:5913`). Scope the change deliberately.
- `PurgesHDAs` removes metadata files via `_purge_hda_dependencies_sql` (`scripts/cleanup_datasets/pgcleanup.py:317`, join on `metadata_file.hda_id`), consumed by actions with the `RemovesMetadataFiles` mixin (e.g. `PurgeDeletedUsers`, line 554).
- Existing tests nearby: `test/integration/test_job_cache.py` (cache hits via `use_cached_job=True`), `test/integration/test_dataset_copy_metadata_files.py` (directory strategy, metadata copied to copied outputs), `test/integration/test_scripts_pgcleanup.py`. There is no existing test combining a cache hit with a pgcleanup purge of the source.
