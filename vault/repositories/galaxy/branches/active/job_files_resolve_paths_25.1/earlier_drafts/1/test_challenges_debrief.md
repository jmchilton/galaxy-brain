Run via Claude Opus 5.5 at low effort.

# Test challenges debrief

Branch now at `21604435ae2` (2 commits, force-pushed to `jmchilton`). Test changes were amended into `3112799fb3f` (was `1c367ddeb49`). The second commit (`view.py`) is unchanged.

## Acted on

- **POST helper added.** `test_write_relative_path_rejected` was the sixth `requests.post(self._api_url(f"jobs/{job_id}/files", ...))` call in `test/integration/test_job_files.py`. Added `_post_job_files(job_id, data, files=None, use_key=False)` and used it at every POST site (`test_write_by_state` x3, `test_write_with_tus`, `test_write_protection`, the new test). The helper stays in raw `requests` because key handling is what these tests exercise. `files()` in `test_write_by_state` stays a factory because a `StringIO` can only be read once.
- **Assertion strengthened.** The new test now also asserts that the error message contains "absolute path". A bare 400 could come from any `RequestParameterInvalidException`, so this ties the test to the new path input validation.

## Challenges with no change

- **Unit tests:** the branch has none.
- **E2E:** none needed. This is an API used by job runners and has no UI.
- **Log message commit (`view.py`):** deliberately untested. Asserting on log text would be silly.
- **Red/green:** the new test fails on base at its own status assertion (200, file written under the worktree root), per the initial debrief. Base wasn't rerun after the refactor because the helper sends the same request. The added message assertion would also fail on base, since base returns 200.
- **GET helper:** `jobs/{id}/files` GET/HEAD with `use_key=True` is also repeated in the read tests. That predates this branch and has nothing to do with the fix, so it was left alone to keep the release-branch diff small.
- **Layer/helpers:** an integration test is the right layer because it needs direct DB job-state setup. No populator covers the job files API.

## Checks

- `test_write_relative_path_rejected`, `test_write_by_state`, `test_write_with_tus` and `test_write_protection` were each run alone: all pass. No `job_files_relative_*` dir was left behind.
- ruff, black and pre-commit hooks pass.
