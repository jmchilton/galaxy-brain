### P2 1: Job-wrapper wiring of `metadata_tmp_files_dir` for galaxy.json discovery is untested (implementation verified)

The `test_collect_primary_datasets` tests pass `metadata_tmp_files_dir` to discovery themselves. Nothing checks that `MinimalJobWrapper.discover_outputs` passes `<job working directory>/metadata`, or that a real job whose legacy galaxy.json gets `bam_index` temp files from `set_metadata` still finishes `ok`. If that kwarg were dropped or pointed at the wrong directory, every such discovered dataset would end up `failed_metadata`, and the unit tests would still pass.

Add a legacy (no profile) tool that discovers a BAM through a `new_primary_dataset` galaxy.json line. Under the directory strategy, `set_metadata` writes `bam_index` as a `MetadataTempFile` in `metadata/` and rewrites galaxy.json, so the handler's containment check runs on a real path. Assert that the discovered dataset is `ok` and has `metadata_bam_index`.

<details><summary>Details</summary>

The review branch adds `test/functional/tools/tool_provided_metadata_13.xml`, registered in `sample_tool_conf.xml` and with its own framework test. It also adds `test_legacy_galaxy_json_discovered_bam_gets_index` in `lib/galaxy_test/api/test_tool_execute.py`. With `metadata_tmp_files_dir=None` in `jobs/__init__.py`, the API test fails because the discovered dataset is `failed_metadata`. With the PR's wiring it passes, and so does the framework test.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: A rejected temp file fails the whole job at finish, but sibling paths mark `failed_metadata` (implementation verified)

`MetadataTempFilePathError` subclasses bare `Exception`, and the three paths that can raise it handle it differently:

- `set_datasets_metadata` (discovery) catches it and marks the dataset `failed_metadata`.
- `SetMetadataTool.exec_after_process` also catches it and marks the dataset `failed_metadata`.
- `MinimalJobWrapper._finish_dataset` calls `load_metadata` with no handler. The error escapes `finish()`, and the runner fails the job with a generic "Unable to finish job".

The neighbouring "job-provided path escapes its allowed directory" errors in `model/store/discover.py` (`OutputCollectionSecurityError` and its subclasses) are all `ValueError`s.

Catch `MetadataTempFilePathError` around `load_metadata` in `_finish_dataset`, log a warning, and set `FAILED_METADATA`, as the branch just above already does when metadata wasn't set. Also make the error a `ValueError`. Legitimate jobs don't appear to reach this, so it matters mainly for malformed or hostile `metadata_out`.

<details><summary>Details</summary>

The review branch makes this change. It adds `test_metadata_temp_file_outside_metadata_directory_fails_metadata_only` to `test/unit/app/jobs/test_job_wrapper_finish.py`, which has `load_metadata` raise and asserts that the job is `ok` and the output is `failed_metadata`. Before the fix, `finish()` raised.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: New `metadata_tmp_files_dir` parameters are untyped (implementation verified)

`_contained_metadata_temp_file_path`, `JobContext.__init__` and `ModelPersistenceContext.metadata_tmp_files_dir` are annotated `str | None`. `FileParameter.from_external_value` and `Tool.discover_outputs` are not. Annotate them as `metadata_tmp_files_dir: str | None = None`. Leave `MetadataCollection.from_JSON_dict` unannotated: annotating it makes mypy check its untyped body and reports 13 errors.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: The job metadata directory is spelled out separately by the writer and the checkers (implementation verified)

The containment check is only as good as every `os.path.join(<working dir>, "metadata")` agreeing:

- the generator's `metadata_dir`, where override copies and `params.json` go;
- `set_metadata_portable`'s `metadata_tmp_files_dir`, where temp files are written;
- the `path_rewriter` target and the new kwarg in `_load_metadata_from_path`;
- the new kwarg in `MinimalJobWrapper.discover_outputs`.

A small `galaxy.metadata.job_metadata_directory(working_directory)` helper used by all five makes that agreement a single definition.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
