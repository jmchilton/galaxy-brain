Run via Claude Opus at high effort.

# Test challenges debrief: tes_native_staging

I acted on every security-relevant gap and most of the test-design findings: 5 commits on `tes_native_staging` (not pushed). Things I left alone are listed below. Nothing went into the private security report. The one bug I found is a server error on a malformed token, which is a robustness bug, not something exploitable.

Commits, oldest first:

- `253b5cdc2de` Reject job files tokens with an overlong expiry.
- `92750ffbefa` Pin the raw PUT routes' checks in the job files integration tests.
- `214eadab4a3` Share the fake TES server and job fakes between TES runner tests.
- `2c72ae62453` Test the TES-native runner against the fake TES server.
- `4c7f419ad43` Run jobs end to end through the TES-native runner in an integration test.

Tests, all passing after the last commit:

- Unit: 100 passed, run together. That is `test_tes_runner.py` (20), `test_pulsar_tes_task_checks.py` (52, unchanged, now on the shared fakes), `test_JobFilesManager.py` (9) and `test_job_files_tokens.py` (19).
- `test/integration/test_job_files.py`: 39 passed.
- `test/integration/test_tes_runner.py` (new): 5 passed, in about 46 s.
- ruff, black and isort are clean on every changed file.

## Not acted on

- **Input staging isn't checked end to end.** The task shares Galaxy's disk, so a file the runner forgets to stage in is still there. The fake only checks that each staged input URL returns Galaxy's bytes. Outputs are checked: the fake deletes everything the task wrote that wasn't uploaded. For inputs, `test_staged_input_paths` remains the only check.
- **`queue_job` / `_build_task` have no unit test.** That would need a real job wrapper. The new integration test now covers them: the `outputs_to_working_directory` and container requirements, output paths, tokens and task JSON. The error branches are still untested: no container, outputs outside the job directory, and `outputs_to_working_directory` unset.
- **The wrapper script unit tests stay.** They run the real shell. They also cover cases the integration test doesn't reach: missing outputs created empty, a job script that writes no exit code file, and symlinks removed from DIRECTORY outputs.
- **`test_build_tes_task` stays, as one test.** It is the only check of the resources → `GALAXY_SLOTS`/`GALAXY_MEMORY_MB` mapping.
- **Pre-existing, outside these tests:** `JobFilesManager.write` uses `shutil.move`. A PUT to a path that is an existing directory therefore lands as `<dir>/body` and doesn't replace anything. It can't leave the job's write locations, and POST already behaves this way. Worth a follow-up, but not part of this branch.
- **Rebase risk:** `214eadab4a3` moves the fakes out of the parent branch's `test_pulsar_tes_task_checks.py`. If `tes_task_state_polling` edits those fakes later, rebasing this branch will conflict there.
- Selenium/E2E: not applicable. This is a backend runner with no UI.

<details>
<summary>Full review</summary>

## Security behavior: what pins it now

| Behavior | Pinned by |
| --- | --- |
| Token bound to job id | `test_token_is_bound_to_the_job_and_the_secret` (unit); `test_signed_per_file_tokens` now also uses another job's token on this job's URL, for both read and write (new). |
| Token bound to exact path | Unit path variants (`..`, case, suffix); integration other-path cases. |
| Token bound to scope | Unit scope tests; integration: write token on GET, read token on PUT/POST, file token on the directory route; also a file token for a directory refused before the body (new). |
| Expiry | Unit: expiry, tampered expiry, and an overlong expiry (new: it used to raise `ValueError`, which made the API return a 500); integration: expired tokens. |
| A bad token isn't rescued by a valid `job_key` | Was a manager unit test; now in the integration test (`job_token=garbage` plus a valid `job_key` → 403). |
| Raw PUT authorizes before reading the body | New `test_put_rejected_before_body_is_read`: headers only, a 100 MB Content-Length and no body. A read token, a finished job's write token, a file token on the directory route and a `..%2F` escape are each answered with 403. I checked it fails by reading the body before `authorize_write` (the test then times out). |
| Raw PUT re-checks the job after a long upload | New `test_job_completes_during_put`, for both PUT routes: the job finishes while the body streams. I checked it fails with `assert_job_active` removed from `_finish_replace`. |
| Job state checked on PUT | `test_write_with_put` (finished job → 403), the before-body test, and the end-of-upload test. |
| DIRECTORY containment | `test_directory_put` now also covers an absolute (`%2F`-escaped) relative path, an empty relative path, and a relative path through a symlink in the directory that points outside. That's on top of the existing `..%2F`, `sub/..%2F..%2F` and `.` cases and an outside directory with a valid token. |

## Per-file challenges

### `test/unit/data/security/test_job_files_tokens.py`

- Kept. It tests a security primitive whose cases (other secret, tampered expiry, path normalization, malformed input) are cheaper and sharper here than through the API.
- Dropped `"secret" not in token`. It could never fail, because the token is base64 of an HMAC.
- Added an overlong-expiry malformed case. It failed with `ValueError` before `253b5cdc2de`. The fix caps the expiry at 20 digits.

### `test/unit/app/managers/test_JobFilesManager.py` (new tests)

- `test_job_token` and `test_authorize_directory_write` were dropped. Each case repeated `test_signed_per_file_tokens` / `test_directory_put`. The two cases that were unique (another job's token; bad token plus valid key; absolute and empty relative paths) moved to the integration tests, where they are checked through the real routes.

### `test/integration/test_job_files.py` (new tests)

- Helpers: `_get_job_file` and `_put_directory_file` are new, and `_put_job_file` now takes any auth. `_start_post`/`_post_without_body` became `_start_request`/`_send_headers_only` and take the method as a parameter. `_large_raw_body` replaces copies of the same body generator.
- New tests: `test_put_rejected_before_body_is_read` and `test_job_completes_during_put`. Both reuse the setup of the existing POST tests (`test_rejected_before_body_is_read`, `test_job_completes_during_upload`), which the branch had not mirrored for PUT.

### `test/unit/app/jobs/test_tes_runner.py`

- The runner tests mocked the TES client, monkeypatched `fetch_tes_task_state` and `tes_client_from_params`, bypassed `TesJobRunner.__init__` with a subclass, and built `AsynchronousJobState` through `__new__`. The parent branch already had a better harness in `test_pulsar_tes_task_checks.py`: a fake TES server over HTTP (pydantic-tes) and plain `FakeJob`/`FakeJobWrapper` classes. That harness moved to `test/unit/app/jobs/tes_fakes.py`, and the native runner tests now use the real runner, client and state check against it.
  - The two-server test now proves the runner checks each server separately: same task id, one RUNNING and one COMPLETE. Keying by bare task id fails it; I checked by reverting to that.
  - A failed task now shows it isn't cancelled: the requests are BASIC then FULL, with no POST. Before, the test inspected `job_state.stop_job`.
  - New: a task the server doesn't know fails the job; a server error doesn't fail it.
  - The fake server's 10 ms poll interval brought the two TES unit test files from about 40 s to 5 s.
- `test_job_files_url_quotes_the_path` was folded into the signer test, which now uses a path with `& = + space` and all three scopes. Token binding assertions were removed, since the token tests cover them.
- `test_build_tes_task_with_directory_outputs` was folded into `test_build_tes_task`. The `backend_parameters_strict` assertion was a pydantic-tes default and is gone.

### `test/integration/test_tes_runner.py` (new)

- Design B had no automated end-to-end test, only the live demo. A `LocalTesServer` accepts tasks over HTTP and runs each one on the host, as a worker would:
  - It GETs each input URL (checked against Galaxy's bytes).
  - It runs the executor command (`docker_default_container_id` gives every tool an image the fake ignores).
  - It PUTs each output, per file below DIRECTORY outputs with Funnel's escaping.
  - It deletes each output before uploading it, and deletes anything else the task wrote.
- Tool tests: `cat1` (input datasets), `tool_directory_docker` (tool directory file + `from_work_dir`), `multi_output_assign_primary` (discovered outputs through the working directory DIRECTORY output). There are also two explicit tests: every task URL carries `path` and `job_token` only, and a non-zero exit code (`exit_code_from_file`, 3) fails the job with that exit code.
- I checked it fails when the working directory is dropped from the DIRECTORY outputs.
- `container_resolvers: [explicit]` stops the cat1 job from looking up a mulled image over the network.

## Baseline-commit rule

The branch has no "Baseline tests" commit. The new PUT and token integration tests can only fail without the branch, since the routes and `job_token` don't exist on the parent. The checks that matter are the ones above: each new security test fails when its own behavior is removed (body read before auth, the re-check dropped, task keying by id only, working directory not staged out).

</details>
