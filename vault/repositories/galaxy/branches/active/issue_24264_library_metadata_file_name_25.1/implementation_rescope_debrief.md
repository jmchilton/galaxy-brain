# Re-scope debrief

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion (Scope C). `DatasetSerializer.serialize_extra_files_path` still returned a 500 for the same unlocatable-dataset condition. Distributed `_construct_path` indexed `backends[...]` with an invalid id or `None` and raised `KeyError`. It's reachable via the HDA API's `keys=extra_files_path` (admin, or with `expose_dataset_path` set).

- The original scope is kept as the alt branch `issue_24264_library_metadata_file_name_25.1_alt_original_scope` at `5a8081d3034` ([alts/original_scope.md](alts/original_scope.md)).
- I added commit `9a1313d67d2`. It adds `Dataset.get_extra_files_path_if_locatable()`, which returns `None` with a warning when there's no external path and `store_by is None`. The serializer now uses it. `get_extra_files_path` is unchanged, so write paths are unaffected. The unit test was renamed `test_dataset_in_unknown_backend_serialization` and gained a positive control plus the `None` assertion.
- [Re-scope review](subagents/rescope_review.md): no blockers. I added the positive control it asked for.
- Out of scope, and suggested as follow-ups: the distributed store's `elif` skips `search_for_missing` for stale backend ids; a shared metadata-serialization helper (four duplicated loops) on dev; purging `MetadataFile`s on dataset purge.
