# Thermo review: galaxy#25023

- Profile: thermo_review
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: ff96b8bb47c49cd0886b04747bc1825bc8e25601 (diff vs merge-base 4d02c778c4c7)

## Verdict

Structurally sound for a release-branch fix. `RemoteComputeEnvironment` + `remote_evaluation_paths()` is a good reusable abstraction (it replaces the object-store dependency in the evaluator rather than special-casing around it), and widening `input_metadata_rewrite` to take the metadata name/file is a reasonable interface change. Main maintainability concerns: the remote-evaluation export files are written by two separate code paths, the paths payload is an untyped stringly dict, and one model property becomes dead. No refactor needs a follow-up issue.

## Findings

### P2 1 — Remote-eval export (`job_io.json` / `compute_environment.json`) written in two places with duplicated path logic

`MinimalJobWrapper` (lib/galaxy/jobs/__init__.py ~1476) writes `metadata/outputs_new/job_io.json` and `compute_environment.json`; `PulsarJobRunner._setup_remote_tool_evaluation` (lib/galaxy/jobs/runners/pulsar.py ~755) then overwrites both, re-deriving the `metadata/outputs_new` path by hand and patching `job_io.to_dict()` field by field (`working_directory`, `outputs_directory`, `tool_directory`, `version_path`, ...) from the compute environment. The filenames and directory are now string literals in three files (jobs, pulsar runner, remote_tool_eval reading `compute_environment.json` from the import store). Any future runner that stages elsewhere has to copy the Pulsar override.

Fix: one helper (e.g. in `galaxy.job_execution.compute_environment` or `galaxy.metadata`) such as `write_remote_evaluation_files(export_directory, job_io_dict, paths)` plus constants for the two filenames, and have the job wrapper call it with a compute-environment-derived `JobIO` dict (`job_io.to_dict()` rewritten via the compute environment's `working_directory()/tool_directory()/...`). Pulsar then only supplies its compute environment instead of re-writing the files. Small enough for this PR; if not, at least share the filename constants and the export-dir helper.

### P3 1 — `RemoteEvaluationPaths` should be a `TypedDict`

`RemoteEvaluationPaths = dict[str, dict[str, str]]` is accessed as `self.paths["datasets"]`, `["extra_files"]`, `["metadata_files"]`, `["unstructured"]`. A `TypedDict` with those four keys documents the JSON contract between Galaxy and the remote evaluator and lets mypy catch key typos. Also the alias is defined after its first (string-quoted) use in `RemoteComputeEnvironment.__init__`; move it above the class.

### P3 2 — `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` and `get_metadata_file_paths_and_extensions` in model are now dead

`DatasetCollectionWrapper.element_identifiers_extensions_paths_and_metadata_files` (lib/galaxy/tools/wrappers.py ~798) no longer delegates to the model property at lib/galaxy/model/__init__.py:8276; grep finds no other caller. Remove it together with `DatasetInstance.get_metadata_file_paths_and_extensions` (model:6062), whose only callers are inside it, so there aren't two divergent implementations of the same flattening, one of which ignores compute-environment rewrites.

### P3 3 — `remote_command_line` eligibility rules hardcoded as tool-type strings; property re-queries DB on each access

`remote_command_line` now excludes `tool_type in ("interactive", "set_metadata")` inline. Galaxy already models such per-class traits as class attributes (`tool_type_local`, and this PR's own `job_directory_files`); a `supports_remote_evaluation = False` attribute on `InteractiveTool`/`SetMetadataTool` would keep the knowledge with the tool classes. Separately the property runs a `JobExportHistoryArchive` select every access, and this PR adds five more accesses in the Pulsar queue path; caching it per wrapper (it can't change once the job is prepared) is cheap. Optional on a release branch.

## Notes (not findings)

- Wrapping the tool command in `{ ...; }` and switching Pulsar's separator to `&&` is a clean fix for the evaluation-failure-runs-tool hazard.
- `_galaxy_file_name` in wrapped_json.py correctly separates "Galaxy-side path" from "compute path"; fine as a private helper.
