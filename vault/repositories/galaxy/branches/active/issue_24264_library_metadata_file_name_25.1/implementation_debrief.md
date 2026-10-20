# Implementation debrief

**STATUS: READY.** Fixes [#24264](https://github.com/galaxyproject/galaxy/issues/24264) on `release_25.1`. Head `654118f2dd6`. CI not yet seen.

## Final implementation (4 commits)

1. `9d3606f644b` **Baseline tests.** The `test_index` API test checks that a folder listing's `file_ext`, `state` and `date_uploaded` match `GET libraries/datasets/{id}`. The id comes from the listing item, after Codex caught an LDDA/LD id mix-up.
2. `c2cc018262d` **Listing.** `_serialize_library_dataset` reads those fields from the LDDA directly. It no longer calls `LibraryDataset.to_dict()`, which resolved and created metadata files for every row. This alone fixes the reported endpoint.
3. `7b988167e0b` **Metadata file fix.** Nested object stores return `None` from `get_store_by` when the dataset's backend is unknown. `MetadataFile.get_file_name` now raises `ObjectNotFound` in that case instead of `TypeError`. `get_file_name_if_locatable()` returns `None` and logs a warning. The HDA, LibraryDataset and LDDA `to_dict` calls and `serialize_metadata` use it. The commit also adds the test helper `global_object_store_for_models`.
4. `654118f2dd6` **Re-scope.** `Dataset.get_extra_files_path_if_locatable()` is used by `serialize_extra_files_path`, which hit a `KeyError` from distributed `_construct_path` for the same reason.

The rule throughout: read paths return `None`, write paths fail with a typed error. A blank `""` from a write path would make files land in the wrong place silently.

## Scope decision

The first scope evaluation recommended the `extra_files_path` sibling fix (Scope C), which became the re-scope. The original scope is kept as alt `issue_24264_library_metadata_file_name_25.1_alt_original_scope`. The second evaluation found nothing more to fix. The next step would change object-store error semantics that job finishing depends on.

## Tests

- Unit tests: `test_galaxy_mapping.py::test_dataset_in_unknown_backend_serialization` and `test_DatasetManager.py::test_serialize_extra_files_path_dataset_in_unknown_backend`. Both use a real `DistributedObjectStore` with a backend removed from the config. Before the fix, both failed with the reported `TypeError` and the re-scoped `KeyError`.
- API: `test_folder_contents.py`, 9 passed.
- mypy, black and flake8 are clean.

## Open for John

- Test challenges round 2 suggests dropping 2 assertions in the mapping test that call `get_extra_files_path_if_locatable()` directly, because the serializer test now covers that path. I didn't drop them, since removing assertions needs your approval.
- Suggested follow-ups, for dev: distributed store `elif` skips `search_for_missing` and raises a bare `KeyError`; one shared metadata-to-dict helper; purge `MetadataFile`s when a dataset is purged; move the other tests that swap the object store by hand onto `global_object_store_for_models`.
- The PR should note that metadata paths are `None` while the dataset `file_name` is `""`, that the two helpers differ on purpose, and that a hierarchical store returns `extra_files_path` `null` instead of a wrong path.
