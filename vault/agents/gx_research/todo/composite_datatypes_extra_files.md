# Component - Composite Datatypes and Extra Files

How datasets with extra files work end to end: `Dataset.extra_files_path` / `extra_files_path_name` and how they resolve through the object store (`dir_only` / `extra_dir`), composite datatypes and `composite_files`, `files_path` vs `extra_files_path` in tool templates, the `Directory` datatype and `content_path`, how extra files are written (uploads, data fetch, `from_work_dir`, `discover_datasets`, data-manager bundles), and how they reach remote runners (Pulsar `INPUT_EXTRA_FILES_PATH`, outputs collection). Leave out object-store cache internals (`Component - Object Store Cache and Direct Access`) and Pulsar file actions (`Component - Pulsar Input Staging`) except to link them.

## Why

Extra-file behavior is spread across datatypes, wrappers, the object store and runners, and each note touches only a slice; the Pulsar `none` extra-files fix needed all of those slices and found no single reference.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24600_pulsar_none_extra_files_25.1/brain_research.md: needed an overview of composite/Directory extra-files semantics to judge fix scope and tests.
