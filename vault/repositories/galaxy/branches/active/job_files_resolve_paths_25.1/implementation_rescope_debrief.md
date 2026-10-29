# Re-scope debrief

Scope evaluation (now in `earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion: bring dev's upload-source validation into `create` on 25.1, so the 26.2 merge can take dev's version.

- Original scope kept as `job_files_resolve_paths_25.1_alt_original_scope` at `21604435ae2` ([alts/original_scope.md](alts/original_scope.md)).
- Added `5e3ee7fa213` "Return 4xx for invalid job files upload sources": missing file → 400 "No file uploaded."; bad tus session id format → 400 (was `ValueError`/500); unknown tus session → 400; nginx `__file_path` is resolved with `abspath` and checked with `in_directory` instead of `startswith`, must exist, and a missing store config is a 403 (`ConfigDoesNotAllowException`) instead of an `assert`. Messages and exception classes match dev's `JobFilesManager`.
- Tests: `test_write_invalid_upload_sources_rejected` (red on the pre-expansion controller with a 500), plus dev's nginx success / outside-store / relative-path tests ported (the latter two red on the pre-expansion controller: 200 and 500). The class now configures `nginx_upload_job_files_store`.
- Re-scope review ([subagents/normal_review_rescope.md](subagents/normal_review_rescope.md)): no bugs; test gap acted on. Real nginx deployment configs (usegalaxy.org main/test, EU) use absolute store paths and keep working.
- `test/integration/test_job_files.py`: 9/10 pass; `test_read_fails_if_input_file_purged` fails identically on base.
