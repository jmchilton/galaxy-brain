Run via Claude Opus 5.5 at low effort.

Split a leading "Baseline tests" commit out of the test changes: the `_post_job_files` helper refactor of existing tests, the class-level `nginx_upload_job_files_store` config, `_write_file`, and `test_write_with_nginx_upload_module`. The three existing commits follow unchanged in content, apart from their test hunks moving. Final tree is identical to the pre-split HEAD `8e864486532`.

## New history (on `origin/release_25.1`)

- `f9c905af345` Baseline tests for job files API nginx upload writes
- `30e946c3c56` Only accept absolute paths for job files API writes
- `0e41463a856` Log job ports registration without request kwargs
- `4b91eb12100` Return 4xx for invalid job files upload sources

## What moved

- `_post_job_files` (folded into the absolute-path commit before) and the rewrites of `test_write_by_state`, `test_write_with_tus` and `test_write_protection` to use it now live in the baseline commit.
- The nginx store config, `_write_file` and `test_write_with_nginx_upload_module` (the positive control, which passes on base) moved there from the upload-sources commit.
- No controller refactor was split out. `__nginx_upload_path`/`__tus_upload_path` in commit 4 are extracted and given new validation in the same step. A behavior-neutral extraction first would only add churn.

## Verification (each test run on its own)

- At the baseline commit, with the base controller: `test_write_with_nginx_upload_module`, `test_write_by_state`, `test_write_with_tus`, `test_write_protection` and `test_read_by_state` all pass.
- `test_write_relative_path_rejected` with the commit-2 test file and the base controller: fails (200 instead of 400). With the commit-2 controller: passes. A stray `job_files_relative_*` dir left by the red run makes the green run fail, because job ids repeat across fresh test DBs. It was deleted before the green run.
- Commit-4 tests with the commit-3 controller: `test_write_invalid_upload_sources_rejected` fails (500), `..._rejects_path_outside_store` fails (200), `..._rejects_relative_path` fails (500). With the commit-4 controller all pass, as does `test_write_with_nginx_upload_module`.
- `git diff 8e864486532 HEAD` is empty. Force-pushed to `jmchilton/job_files_resolve_paths_25.1`.
