# Component - Dataset Metadata and MetadataFile

Document how a dataset's metadata and its metadata files work: `MetadataCollection` and `MetadataParameter` subclasses in `lib/galaxy/model/metadata.py`, especially `FileParameter` (`wrap`, `make_copy`, `marshal`, `new_file`, `from_external_value`), the `MetadataFile` model (uuid vs id addressing under `store_by: id|uuid`, `get_file_name`, `update_from_file`, `object_store_id` inheritance), and `DatasetInstance.init_meta(copy_from=...)` / `set_meta` / `set_metadata` as called by upload, output discovery (`discover.py`), `metadata_source`, HDA copies and the `set_metadata` tool. Cover where each runs (handler session vs sessionless job-side under `metadata_strategy: extended`, versus `directory`), how the sessionless case differs (`MetadataFile` objects without an id), the uniqueness of `metadata_file.uuid` in existing databases, and every remover of metadata files (`Dataset.full_delete`, pgcleanup `RemovesMetadataFiles`). Leave out the model store import trust model (see the Model Store Import and Export request), object store caching (see `Component - Object Store Cache and Direct Access`) and per-datatype index generation beyond one example (BAM).

## Why

#24787 (discovered `metadata_source` outputs sharing an input's metadata file) and #24745 (purging metadata files) both turn on `FileParameter.make_copy`, the id-less `MetadataFile` shortcut and uuid uniqueness, and no research note covers dataset metadata as a model facet. `Component - Job Completion Lifecycle` and `Component - Object Store Cache and Direct Access` touch `MetadataFile` only in passing.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24787_metadata_source_shared_file_26_1: needed the handler vs in-job `make_copy` behaviour and how copies, discovery and set_metadata create or share `MetadataFile` rows.
- vault/repositories/galaxy/reviews/active/24745: purge paths needed to know which rows can share a file.
