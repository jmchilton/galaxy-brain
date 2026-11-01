# Initial review — #24634 `[26.2] Contain MetadataTempFile paths to the job metadata directory`

- Profile: `default` (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort low
- Reviewed commit: `c9ad46bdcc5` (base `release_26.2`)

## Verdict

The ordinary findings are minor follow-ups. The fix is minimal, uses the existing `in_directory` helper, puts the check at the one Galaxy-side sink (`FileParameter.from_external_value`) before any `MetadataFile` is created, and only checks JSON-sourced values, so in-process `MetadataTempFile`s are unaffected. The PR body says the tests go red-to-green; I didn't run them on base. They cover an absolute path, a job-dir sibling, a remote prefix sibling and a symlinked file. All new tests pass locally (`test_metadata.py -k "metadata_directory or regenerates"`, `test_collect_primary_datasets.py -k metadata_directory`; with the venv activated so `python metadata/set.py` resolves).

No P1s.

## Findings

### P2 1: Celery metadata + legacy (Tool Shed) datatypes now fail

`set_metadata_portable` only sets the process-global `MetadataTempFile.tmp_dir = <job>/metadata` when it is **not** a Celery task (`lib/galaxy/metadata/set_metadata.py:208-212`). The comment there says this exists for datatypes that call `param.new_file(dataset=...)` without passing `metadata_tmp_files_dir`. Under `metadata_strategy: directory_celery`, such a datatype writes its temp file to the default `database/tmp` (relative to the worker's cwd). That path is outside `<job>/metadata`, so `load_metadata` now raises `MetadataTempFilePathError` and `job_wrapper.finish` fails the whole job ("Unable to finish job"). Before this PR it worked. All in-tree datatypes pass `metadata_tmp_files_dir`, so this only hits TS datatypes with `FileParameter` elements under a Celery strategy. That is narrow, but it is a silent regression on a release branch. Found by reading the code; not reproduced.

Suggested fix: either mention it in the PR's upgrade note, or have the Celery path give legacy `new_file` callers a per-call directory (for example, a context-local tmp dir rather than the process global). If neither is worth doing, at least document it next to the "Remove if we ever remove TS datatypes" comment.

### P3 1: `MetadataTempFilePathError` sits outside the existing security-error hierarchy

`lib/galaxy/model/store/discover.py` already has `OutputCollectionSecurityError` / `InvalidDiscoveredFilePathError` and `ensure_path_in_directory()` for the same pattern ("job-provided path escapes its allowed directory"). The new error is a bare `Exception` in `model/metadata.py`. On the job-finish path it isn't caught specifically, so it surfaces as a generic "Unable to finish job" with a traceback. `OutputCollectionSecurityError`, by contrast, is turned into an `OutputCollectionSecurityJobMessage` (`jobs/__init__.py:2404`). Consider making it a `ValueError` subclass in the same family, possibly moving the base class somewhere both modules can import, and catching it where `load_metadata` is called so users get a clear message. Low priority, since only a malicious or upgraded job hits it.

### P3 2: New parameters are untyped

`_contained_metadata_temp_file_path` is annotated `str | None`, as are `JobContext.__init__` and `ModelPersistenceContext.metadata_tmp_files_dir`. The new parameters on `FileParameter.from_external_value`, `MetadataCollection.from_JSON_dict` and `Tool.discover_outputs` are not. Add `metadata_tmp_files_dir: str | None = None` to all three for consistency.

### P3 3: `<job working dir>/metadata` is now spelled out in five places

The path appears as `os.path.join(working_directory, "metadata")` in `metadata/__init__.py` twice (the `path_rewriter` target and the new kwarg), plus `jobs/__init__.py`, `set_metadata.py:206` and `PortableDirectoryMetadataGenerator` (`metadata_dir`). The containment check is only as good as these strings agreeing. A tiny helper (e.g. `galaxy.metadata.metadata_directory(working_directory)`) used by both the writer and the checkers would turn that agreement into a single definition. Optional.

## Notes (no action)

- The `path_rewriter` `else: target_directory = working_directory` branch is dead (only portable strategies remain). It is pre-existing and untouched; mentioned only because it reads as if non-portable paths could legitimately land outside `metadata/`.
- `SetMetadataToolAction.exec_after_process` calls `load_metadata` without `remote_metadata_directory`. With Pulsar `remote_metadata`, remote paths are therefore never rewritten and are now rejected rather than "file not found". Same outcome as before in practice; pre-existing.
- `set_datasets_metadata` going from `@staticmethod` to an instance method has no static callers in `lib/` or `test/`.
- The upgrade note (in-flight set-metadata jobs end `failed_metadata`) is called out explicitly in the PR body, so it isn't re-litigated here.
