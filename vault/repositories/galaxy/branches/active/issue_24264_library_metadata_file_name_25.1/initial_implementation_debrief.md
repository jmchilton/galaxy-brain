# Initial implementation debrief

Fixes [#24264](https://github.com/galaxyproject/galaxy/issues/24264) on `release_25.1`.

## Root cause

`MetadataFile.get_file_name` uses `object_store.get_store_by(da.dataset)` as an attribute name. Concrete stores always return `id`/`uuid`, but nested stores return `None` when they can't find the dataset's backend:

- distributed: `object_store_id` names a backend that's no longer configured (logs "The backend object store ID (...) ... is invalid"), or is unset and `search_for_missing` finds nothing;
- hierarchical: no backend has the file.

`getattr(self, None)` then raises the `TypeError` from the issue. Dates to `801182c3580` (2020). `Dataset.get_file_name` already handles this case by returning `""`. `MetadataFile` didn't.

## Commits

1. **Baseline tests** — the `test_index` API test now checks that a folder listing's `file_ext`, `state` and `date_uploaded` match `GET /api/libraries/datasets/{id}`. It passed before the change.
2. **Fix** — `MetadataFile.get_file_name` raises `ObjectNotFound` when `store_by is None`. A new helper, `MetadataFile.get_file_name_if_locatable()`, logs a warning and returns `None`. It's used at the three `to_dict` sites (HDA, `LibraryDataset`, LDDA). A unit test in `test_galaxy_mapping.py` uses a real `DistributedObjectStore` and an LDDA with a bam index, then points the dataset at a removed backend. Before the fix it failed with the issue's exact `TypeError`.
3. **Listing** — `_serialize_library_dataset` no longer calls `LibraryDataset.to_dict()`. That call was only used for `file_ext`, `date_uploaded` and `state`, and it resolved and created metadata files on disk for every row.

## Choices

- I chose to raise rather than return `""`. `update_from_file` passes `basename(get_file_name())` as `alt_name`, so a blank result would make the write silently go to the wrong place. A typed error keeps the existing failure on write paths, just clearer.
- Not keyed on `purged`. The reporter's exact setup is unknown, and `store_by is None` covers every nested-store cause.

## Testing

- `test/unit/data/test_galaxy_mapping.py`: 16 passed (new test red → green).
- `lib/galaxy_test/api/test_folder_contents.py`: 9 passed.
- mypy clean on the touched files.
