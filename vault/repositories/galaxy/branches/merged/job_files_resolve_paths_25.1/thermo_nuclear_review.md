Run via Claude Opus 5.5 at low effort.

# Thermo-nuclear code quality review

Verdict: approve after one local refactor, which has been applied. No structural regressions. Both touched source files stay well under 1k lines: `job_files.py` is about 260 lines and the test file about 325.

Acted on: the nginx and tus validation blocks that the rescope added made `create` noticeably busier. They now live in private helpers, `__nginx_upload_path` and `__tus_upload_path`. Each helper returns a validated path, and the names mirror dev's `JobFilesManager.nginx_upload_path` / `tus_upload_path`. `create` is back to a three-line dispatch over the upload source. Behavior is unchanged: same messages, same exception classes, and `open()` is still at the call site. The change was amended into `8e864486532` "Return 4xx for invalid job files upload sources" (was `da80ba145ad`). There are still 3 commits, pushed to `jmchilton`.

Not acted on, recommended only:

- **Code judo in dev's shape.** Each branch would resolve a `source_path: str`, and a single `write(path, source_path)` would move it, or append it for `tool_stdout`/`tool_stderr`. That deletes the open-only-to-read-`.name` pattern for nginx/tus and the swallowed `OSError` on `close()`. It is out of scope on 25.1 because it changes how the multipart tempfile gets cleaned up on a release branch. The 26.2 merge takes dev's manager anyway.
- **Absolute-path check in the wrong layer for 26.2+.** On dev it belongs in `JobFilesManager.authorize_write`. `index.md` already records this as a hand port at the 26.1→26.2 merge.

<details>
<summary>Details</summary>

## Findings

1. **`create` spaghetti growth (acted on).** The rescope put roughly 20 lines of upload-source validation inline in the middle of an already long handler: 3 nested checks for nginx and 2 for tus, each with its own exception. Moving them into path-returning helpers keeps the handler's flow (authorize → check path → pick source → write) readable in one screen. It also lines the 25.1 helpers up one-to-one with dev's manager methods, so the next reader can diff them directly.

2. **`isinstance(..., str)` guards are justified, not optionality churn.** `legacy_expose_api` JSON-decodes every form value (`lib/galaxy/web/framework/decorators.py:227-236`), so `"null"` arrives as `None` and `"123"` arrives as `int`. Without the guards, those inputs become 500s. Codex review round 1 confirmed this, and the tests pin it. In the moved nginx helper, the reason is now a one-line comment.

3. **Missed simplification: source-path model (recommend only).** See the top-line note. Today the nginx and tus branches `open()` a file only so the shared tail can read `input_file.name`. The multipart branch's tempfile is then moved out from under its handle, which is why `close()` swallows `OSError`. Dev deletes this whole pattern. Not worth doing on 25.1.

4. **`test_write_invalid_upload_sources_rejected` bundles about 7 cases.** This is acceptable. Every case needs a running job, so splitting them multiplies integration setup. Each case still asserts both status and message. Dev splits these cases, and the 26.2 merge takes dev's tests.

5. **Runtime config mutation in a test** (`nginx_upload_job_files_store = None` in try/finally) is acceptable. The server is in-process, and the config is read on each request.

6. **`ports/view.py` log change** is a clean one-liner. No notes.

7. **Test helpers** (`_post_job_files`, `_assert_nginx_upload_rejected`, `_write_file`) do real work, and the last two match dev's helpers. They are not thin wrappers.

## Checks after refactor

Each run on its own: the 3 nginx tests, `test_write_invalid_upload_sources_rejected`, `test_write_with_tus`, `test_write_protection` and `test_write_relative_path_rejected` all pass. ruff, black and pre-commit are clean.

</details>
