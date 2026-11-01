Run via Claude Opus 5.5 at medium effort.

- [x] What does the user see when it fails? The caller (a job runner/Pulsar posting to `POST /api/jobs/{id}/files`) gets a 400 with a specific message (`'path' parameter must be an absolute path.`, `No file uploaded.`, `Invalid session id format.`, `No upload found for session id.`, nginx path not in / missing from the upload store) or a 403 when nginx uploads arrive but `nginx_upload_job_files_store` is unset, instead of the 500s (`AssertionError`, `ValueError`, `AttributeError`, `FileNotFoundError`) base returns; no end-user UI involved.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Integration tests assert HTTP status, error message and filesystem effects (target untouched, outside file kept, relative dir not created), plus a positive nginx-upload control; the only internal hook is `patch.object` on `nginx_upload_job_files_store` for the unconfigured case.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `f9c905af345` adds the `_post_job_files` helper, nginx store config and `test_write_with_nginx_upload_module` (green on base); each later commit pairs its fix with its red-to-green tests.
- [x] Are the comments free of excess archeology? Yes. Only new comment is `# Form values are JSON-decoded, so this may not be a str.`; `# code stolen from basic.py` moved with the existing code.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
