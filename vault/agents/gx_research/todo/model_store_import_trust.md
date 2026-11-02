# Component - Model Store Import and Export

Document `lib/galaxy/model/store/__init__.py` as a component: the `ModelExportStore` / `ModelImportStore` families, the on-disk and dict store formats, and especially the import trust model.

Cover:

- **Callers and their trust.** Each `ImportOptions(...)` call site and what it grants: user history/library imports (`managers/model_stores.py` `import_model_store`, `create_objects_from_store`), workflow invocation imports (`managers/workflows.py`), the in-job sessionless metadata import (`imported_store_for_metadata`), and `MinimalJobWrapper.finish()` importing `metadata/outputs_populated` under `metadata_strategy: extended`.
- **Options.** `allow_edit`, `allow_dataset_object_edit`, `allow_library_creation`, `discarded_data`, and (from #24647) `editable_objects` / `EditableObjects`: what each lets a store do to existing rows named by database id, and which paths are skipped when `sessionless`.
- **Edit paths.** Where an import resolves existing objects by id (datasets, dataset instances, collections, HDCAs, library folders, jobs) and metadata files by uuid (`replace_metadata_file`), and the dataset attribute writes (`external_filename`, `object_store_id`) that point a dataset at storage.
- **Extended metadata round trip.** `outputs_new` export by Galaxy, the compute-side `set_metadata.py` import/re-export, and the `outputs_populated` import back into Galaxy, with who controls each step.
- **Job tracking.** `ObjectImportTracker`, `job_states_by_id`, and `commit=False`.

Leave out the history export/archive UI and task plumbing beyond naming the entry points, and the job completion steps already in [[Component - Job Completion Lifecycle]].

## Why

#24647 bounds the extended-metadata import to the job's own outputs with a new `EditableObjects` allowlist. No note describes the model store import or which callers trust a store to edit existing rows. [[Component - Job Completion Lifecycle]] covers only the `finish()` call site.

## Requested by

- vault/repositories/galaxy/reviews/active/24647: learning review needed a baseline of `ImportOptions` edit semantics and the extended-metadata round trip to explain the new allowlist.
