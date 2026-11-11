# Implementation re-scope debrief

The first scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended one small expansion. In-place deferred materialization (`lib/galaxy/model/deferred.py`, `elif replacement_dataset:`) still gave the materialized instance the replacement HDA's `_metadata` raw. That is the same row sharing the branch removes elsewhere, reached when workflow scheduling materializes a deferred input and finds an existing dataset to reuse.

- **Original scope:** kept as `job_cache_own_metadata_files_25_1_alt_original_scope` at `da18684880d` on the fork, described in `alts/original_scope.md`.
- **Change:** `b20d1d56a4f` copies the replacement's metadata through the `metadata` setter, after the dataset is set. Only attached materialization finds a replacement, so there's always a session. New unit test: `test_in_place_materialization_from_replacement_owns_metadata_files`. It fails without the fix, at the ownership assert.
- **Review:** `subagents/rescope_review_debrief.md`. Nothing serious. The test was extended in `62a9cb88b0a`. A pre-existing gap was noted for follow-up: `get_replacement_dataset` doesn't filter on HDA purged/deleted.
- **Kept out, per the evaluation:**
  - repairing rows already shared by past cache hits;
  - the `MetadataFile.update_from_file` cache-sync saving, which belongs in its own PR on `dev`;
  - moving cache-hit copies off the request path.
- **Tests:**
  - `test_dataset_materialization.py`: 23 passed.
  - `test_materialize_dataset_instance_tasks.py` with `test_job_cache_metadata_files.py`: 14 passed.
- **Process:** the first round's `baseline_refactor.md` produced a local branch, `job_cache_own_metadata_files_25_1_refactor_baseline`, at the pre-re-scope tip. It's stale now, and the refactor reruns during re-hardening.
