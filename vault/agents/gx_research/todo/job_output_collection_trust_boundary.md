# Component - Job Output Collection Trust Boundary

How Galaxy keeps tool-controlled files from steering output collection outside the job directory. Cover every route a job's outputs take to the object store and where each is checked:

- Named outputs: default (direct to object store) vs `outputs_to_working_directory` `false_path`, crossed with `metadata_strategy` `directory` (`MinimalJobWrapper.finish()` move) and `extended` (`set_metadata.py` push + model-store import).
- `from_work_dir`: the job-script copy from `command_factory.__copy_if_exists_command` (runs outside the tool container), glob handling, `_files` directories.
- Dynamic outputs: `galaxy.json` / tool-provided metadata, `discover_datasets`, extra files (`safe_walk`), the metadata file, unnamed outputs and external links as tool capabilities (profile gating, UDT restrictions).
- The predicates in `lib/galaxy/model/store/discover.py` (`ensure_path_in_directory`, `safe_path_from_directory`, `ensure_job_path_in_job_directory`, the `OutputCollectionSecurityError` family) and the `output_collection_security` job message (`OutputCollectionSecurityJobMessage`, API/TS schema).
- Pulsar: what stage-out already refuses and which Galaxy-side checks don't apply.

Leave out the `finish()` transaction layout ([[Component - Job Completion Lifecycle]]) and model-store import options (queued as `model_store_import_trust.md`) except to link them.

## Why

`64360a61721` and #25005 built a realpath containment rule across all collection paths; no note describes the paths together or which ones are trusted. [[Component - Job Completion Lifecycle]] only lists the move step, and UDT notes describe tool-source validation, not collection.

## Requested by

- vault/repositories/galaxy/reviews/archived/25005: learning review needed a map of output collection routes and their containment checks to explain the named-output / `from_work_dir` hardening.
