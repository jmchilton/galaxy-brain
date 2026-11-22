Run via claude-opus-5-5 at low effort.

No refactoring of the base branch was performed.

The branch is three small commits (baseline tests, the `summarize_job_outputs` fix in `lib/galaxy/managers/jobs.py`, the implicit-collection-jobs export/import fix in `lib/galaxy/model/__init__.py` and `lib/galaxy/model/store/__init__.py`). Each production hunk is a behavior change: the new `_own_output_dataset_collection_instances` helper exists only to filter, and the serialization and import additions are new data paths. No behavior-preserving piece could be split out ahead of the fixes, so history was left as-is.
