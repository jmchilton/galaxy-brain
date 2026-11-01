LGTM! Nits below look worth absorbing. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Mostly a two-way door: the containment check is a code-only backstop that can be reverted, but it removes a previously accepted input (tool-provided `MetadataTempFile` paths outside the job's `metadata/` directory), which tools or job runners may have relied on, and in-flight set-metadata jobs from before the upgrade will end in `failed_metadata`.

<details><summary>Risk Details</summary>

- Behavior narrowing for tool authors: legacy XML tools (profile ≤ 26.2) and opted-in interactive tools that emit a file-valued metadata value in `galaxy.json` pointing anywhere other than `<job_wd>/metadata` now get `failed_metadata` instead of a copied file.
- Extended metadata (compute-side discovery) passes no directory, so any `MetadataTempFile` in tool-provided metadata is always rejected there.
- Pulsar `remote_metadata` relies on `path_rewriter` mapping `remote_metadata_directory` paths into local `<job_wd>/metadata`; deployments whose staged paths don't follow that layout will fail metadata.
- `realpath` is applied before the check, so a symlinked job working directory or `metadata/` dir whose target is outside the configured path would be rejected (the directory side is not realpath-ed).
- Upgrade: set-metadata jobs queued before the upgrade on datasets with existing metadata files fail once; rerunning fixes it.
- `set_datasets_metadata` changed from `@staticmethod` to an instance method; any external caller using it on the class breaks.
- Fully reversible in code; no schema, API, or persisted-data changes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the `metadata_tmp_files_dir` comparison is robust to symlinked/relative job working directories (only the file path is `realpath`-ed, not the directory), and that every production caller of `from_JSON_dict`/`set_datasets_metadata` that legitimately reads temp files (job finish, set-metadata tool, Pulsar remote metadata, directory strategy) passes the right directory.

Release managers should weigh the tool-author-visible narrowing on a release branch and make sure the upgrade note about in-flight set-metadata jobs and remote metadata layouts reaches admins.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24634_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24634_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24634_review_0) is on `jmchilton/galaxy` and branches from [`c9ad46bdcc5`](https://github.com/jmchilton/galaxy/commit/c9ad46bdcc5). It types the new `metadata_tmp_files_dir` parameters, and adds one `galaxy.metadata.job_metadata_directory()` helper that the metadata writer, the `load_metadata` checker and the job wrapper's discovery call now share. It adds an API test, backed by a new legacy galaxy.json BAM tool, which shows the job handler accepts `bam_index` temp files that `set_metadata` wrote into `metadata/`. That test fails without the job-wrapper kwarg. The branch also changes job finish so a rejected temp file marks the output `failed_metadata` instead of failing the whole job.

- [`8bc98f9f8a3`](https://github.com/jmchilton/galaxy/commit/8bc98f9f8a3) Type new metadata_tmp_files_dir parameters: annotates `FileParameter.from_external_value` and `Tool.discover_outputs` as `str | None`.
- [`1c373fad912`](https://github.com/jmchilton/galaxy/commit/1c373fad912) Define job metadata directory in one helper: adds `job_metadata_directory()` and uses it in `metadata/__init__.py`, `set_metadata.py` and `jobs/__init__.py`.
- [`e02c8224db7`](https://github.com/jmchilton/galaxy/commit/e02c8224db7) Test job handler accepts legacy galaxy.json bam_index temp files: adds `tool_provided_metadata_13` and `test_legacy_galaxy_json_discovered_bam_gets_index`.
- [`3cefdbb928c`](https://github.com/jmchilton/galaxy/commit/3cefdbb928c) Mark failed_metadata on rejected metadata temp files at job finish: catches `MetadataTempFilePathError` (now a `ValueError`) in `_finish_dataset`, with a unit test in `test_job_wrapper_finish.py`.

</details>

</details>

### P2 1: Job-wrapper wiring of `metadata_tmp_files_dir` for galaxy.json discovery is untested (implementation verified)

The `test_collect_primary_datasets` tests pass `metadata_tmp_files_dir` to discovery themselves. Nothing checks that `MinimalJobWrapper.discover_outputs` passes `<job working directory>/metadata`, or that a real job whose legacy galaxy.json gets `bam_index` temp files from `set_metadata` still finishes `ok`. If that kwarg were dropped or pointed at the wrong directory, every such discovered dataset would end up `failed_metadata`, and the unit tests would still pass.

Add a legacy (no profile) tool that discovers a BAM through a `new_primary_dataset` galaxy.json line. Under the directory strategy, `set_metadata` writes `bam_index` as a `MetadataTempFile` in `metadata/` and rewrites galaxy.json, so the handler's containment check runs on a real path. Assert that the discovered dataset is `ok` and has `metadata_bam_index`.

<details><summary>Details</summary>

The review branch adds `test/functional/tools/tool_provided_metadata_13.xml`, registered in `sample_tool_conf.xml` and with its own framework test. It also adds `test_legacy_galaxy_json_discovered_bam_gets_index` in `lib/galaxy_test/api/test_tool_execute.py`. With `metadata_tmp_files_dir=None` in `jobs/__init__.py`, the API test fails because the discovered dataset is `failed_metadata`. With the PR's wiring it passes, and so does the framework test.

</details>

Fixed on the review branch in [`e02c8224db7`](https://github.com/jmchilton/galaxy/commit/e02c8224db7).

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

Fixed on the review branch in [`3cefdbb928c`](https://github.com/jmchilton/galaxy/commit/3cefdbb928c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: New `metadata_tmp_files_dir` parameters are untyped (implementation verified)

`_contained_metadata_temp_file_path`, `JobContext.__init__` and `ModelPersistenceContext.metadata_tmp_files_dir` are annotated `str | None`. `FileParameter.from_external_value` and `Tool.discover_outputs` are not. Annotate them as `metadata_tmp_files_dir: str | None = None`. Leave `MetadataCollection.from_JSON_dict` unannotated: annotating it makes mypy check its untyped body and reports 13 errors.

Fixed on the review branch in [`8bc98f9f8a3`](https://github.com/jmchilton/galaxy/commit/8bc98f9f8a3).

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

Fixed on the review branch in [`1c373fad912`](https://github.com/jmchilton/galaxy/commit/1c373fad912).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
