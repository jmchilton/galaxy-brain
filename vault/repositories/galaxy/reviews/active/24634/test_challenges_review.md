# Test challenges review — PR #24634

Profile: gx_test_challenger. Model: Claude Opus 5.5, low effort. Reviewed commit: c9ad46bdcc5.

Tests not run: worktree has no `.venv` (bootstrap not permitted). Findings come from reading the code; the PR's "fails on release_26.2" claims were not checked.

## Summary

The unit tests are well chosen. They drive real entry points (`load_metadata` with a directory strategy, `Tool.collect_primary_datasets`) instead of calling `_contained_metadata_temp_file_path` directly. They also cover the escape cases: an absolute path, a job-dir sibling, a remote-prefix sibling (`metadata_sibling`) and a symlink. The happy path is checked as well as the rejections, and `test_directory_metadata_regenerates_existing_metadata_file` covers the `tmp_dir` → `metadata_dir` change in `_initialize_metadata_inputs`. Nothing should be dropped.

## Findings

### P2 1: Production wiring of `metadata_tmp_files_dir` for galaxy.json is untested

Both `test_collect_primary_datasets` tests pass `metadata_tmp_files_dir` to `_collect` themselves. Nothing tests that `MinimalJobWrapper` (`lib/galaxy/jobs/__init__.py`) passes `working_directory/metadata`, or that legitimate legacy galaxy.json `MetadataTempFile` values still work through a real job. A typo or a wrong directory there would make every tool-provided metadata file fail with `FAILED_METADATA`, and the unit tests would still pass. No framework tool under `test/functional/tools` uses a `MetadataTempFile` in galaxy.json. Suggestion: add a framework tool test (a `tool_provided_metadata_*` style tool) that writes a bam index under the job working directory's `metadata/` and is listed in galaxy.json, then asserts the index metadata is set. Optionally add a second tool that points outside the directory and expects failed metadata.

### P3 1: Rejection parametrization rebuilds every escape fixture per case

`test_load_metadata_rejects_temp_file_outside_metadata_directory` writes the secret, sibling, tool script and symlink for all five cases, even though each case uses only one. This is harmless but hides which fixture each case needs. Consider building only the relevant fixture per case, e.g. by parametrizing with a small setup callable.

## Debrief / test plan

- Keep all added unit tests. They are behavior-level and not duplicated at another layer.
- Add the framework test from P2 1. It is the only layer that exercises the job-wrapper wiring.
- No E2E/Selenium test is warranted, because this is backend-only.
