# Normal review

No blockers and no security findings. I made two changes: `DatasetAssociationSerializer.serialize_metadata` (used with `expose_dataset_path`) now uses `get_file_name_if_locatable()` like the `to_dict` sites, and the helper's warning now logs the exception message, so it carries both the dataset id and the metadata file id. Both changes are squashed into the fix commit.

Not acted on:

- The same dict mixes `file_name == ""` for the dataset with `None` for metadata files. `None` matches unset metadata, and the PR description should call it out.
- Merge-forward to dev conflicts in two places. On dev, `get_file_name` takes `auth=`, and an adjacent test was added. Both are trivial: on dev, put the `store_by is None` check after `assert object_store is not None`, and use `str | None` typing.
- Duplicate warning logs in the distributed case: the store already logs an invalid backend id. I kept the helper's warning because the hierarchical case logs nothing.

<details>
<summary>Full review</summary>

1. Low-medium. `managers/datasets.py:728` `serialize_metadata` still calls `val.get_file_name()`. With `expose_dataset_path=True` and a backend that can't be located, it now raises ObjectNotFound (404) instead of TypeError (500), which doesn't match `to_dict`. Use the helper.
2. Low. Duplicate warning logs. Distributed `__get_store_id_for` already warns on every call. Optional: lower the helper's warning to debug, or add the dataset id.
3. Nit. In `LibraryDataset.to_dict`, the dataset `file_name` is `""` while metadata files are `None`. Defensible, but say so in the PR description.
4. Nit. Merge-forward conflicts in `model/__init__.py` (`auth` kwarg) and `test_galaxy_mapping.py` (adjacent test). Trivial.

Verified fine:

- Raising instead of returning `""` is right. Write paths (`update_from_file`, `model/store/__init__.py:2098`) and the metadata download (`services/datasets.py:750`) now get a typed ObjectNotFound instead of a TypeError, and none of them is handed a bogus path.
- The raise is not swallowed by the `except AssertionError/AttributeError`.
- Root cause confirmed for both the distributed store (invalid `object_store_id`, where `search_for_missing` is skipped as an `elif`) and the hierarchical store.
- GET `/api/libraries/datasets/{id}` and LDDA `to_dict` are now safe.
- The folder listing fields are identical to the `to_dict` values. The change also removes metadata-file creation on read.
- The unit test is confirmed red-to-green with the exact reported error. It uses a real distributed store, restores the global in `finally`, and is proportionate.
- mypy is clean, imports are at the top, and there are no obvious comments.

</details>
