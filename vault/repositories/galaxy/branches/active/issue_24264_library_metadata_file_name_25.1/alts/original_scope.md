# original_scope

Branch: `issue_24264_library_metadata_file_name_25.1_alt_original_scope` (head `5a8081d3034`) on the `jmchilton` fork.

This alt is the branch as it stood before the scope evaluation: baseline API test, folder listing no longer calls `LibraryDataset.to_dict()`, and the `MetadataFile.get_file_name` `store_by is None` guard with the `get_file_name_if_locatable()` helper. The parent adds one commit on top. It guards `extra_files_path` serialization, which hit a `KeyError` for the same unlocatable-dataset reason, via `Dataset.get_extra_files_path_if_locatable()`.
