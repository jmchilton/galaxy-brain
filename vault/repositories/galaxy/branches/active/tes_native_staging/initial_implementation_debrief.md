# Initial implementation debrief: tes_native_staging

The port of the design B prototype [`tes_native_staging_v26.1.2`](../tes_native_staging_v26.1.2/index.md) (`5e889591314`, on tag `v26.1.2`) to `release_26.2`, stacked on [`tes_task_state_polling`](../tes_task_state_polling/index.md). What design B is and its live evidence are in the prototype's [implementation debrief](../tes_native_staging_v26.1.2/implementation_debrief.md).

```
created .../tes_native_staging/differential-review/snapshots/20261115T124604Z-implementation-c742b7bc76df.json
  implementation @ c742b7bc76df vs tes_task_state_polling (merge-base fdb30869fa85)
  first snapshot: 5 commits, 9 files, 27 hunks
```

```
  implementation @ 9737781e4087 vs tes_task_state_polling (merge-base 54d2aa613df4)
  since 20261115T124604Z-implementation-c742b7bc76df:
    commits: 0 same, 5 rebased, 0 changed, 1 new, 0 dropped
    hunks:   25 carried, 2 changed, 5 new, 0 dropped
    new     9737781e4087 Key TES-native task checks by TES server and task id
```

## Branch

- `jmchilton/galaxy` `tes_native_staging`, on `tes_task_state_polling` `54d2aa613df` (the re-key commit); first ported on `fdb30869fa8` and rebased cleanly.
- Worktree `~/projects/worktrees/galaxy/branch/tes_native_staging` (made with `ghwt create --from jmchilton/tes_task_state_polling`), with its own bootstrapped `.venv`.
- Six commits: the prototype's five, in the same order and with the same subjects, then a sixth for the re-key.

## What the port required

- **Job files API: a rewrite, not a conflict fix.** On `release_26.2` the job files routes are already FastAPI (`FastAPIJobFiles`) over a `JobFilesManager`, with streaming multipart uploads, staging on the target's filesystem, a re-check after long uploads and client-disconnect handling. The prototype's v26.1.2 code factored checks out of the legacy controller; none of it applied. Instead:
  - `PUT /api/jobs/{job_id}/files` is a method on `FastAPIJobFiles`. It authorizes through `JobFilesManager.authorize_write` before reading the body, streams the body into the same kind of staging directory the POST uses, re-checks the job after a long upload and moves the file into place with `JobFilesManager.write(..., append_tool_streams=False)`. Unlike POST, it replaces tool streams.
  - Tokens are checked in `JobFilesManager._authorize` (new `job_token` and scope arguments), so GET, HEAD, POST (query or form auth) and PUT take `job_token=`.
  - The directory route `PUT /api/jobs/{job_id}/files/{rel_path:path}` uses a new `JobFilesManager.authorize_directory_write`, which returns the target below the directory and its staging parent. The containment checks are the prototype's.
  - The shared body handling became `_replace_from_body` and `_new_staging_dir`.
- **Runner.**
  - Pulsar 0.16.0 (pinned on `release_26.2`) names the module `pulsar.client.tes_job_config`, not 0.15.15's `container_job_config`. pydantic-tes is 0.4.0 on both.
  - On the parent, `describe_tes_task_failure` is Pulsar-specific: it takes the task id and state and says "before Pulsar reported a final job status". Its log summary moved into a new `summarize_tes_task_logs`, which the native runner uses. The Pulsar path is unchanged, and its 51 tests pass.
  - `release_26.2`'s mypy config makes new modules fully typed, so the runner's `__init__`, `build_command_line` and `tes_params` arguments got annotations, and `Optional[...]` became `... | None` (ruff UP045).
- **Re-key (new commit).** The parent now keys TES task watches by `(tes_url, task_id)`. The native runner's poll schedule was keyed by the bare task id, so `tes_task_key` and `TesTaskKey` moved from `pulsar.py` into `util/tes_task.py`, and both runners use them. A new unit test failed before the change.
- **Nothing from `tes_task_state_polling_unreachable`.** The runner only uses `fetch_tes_task_state`, `describe_tes_error`, `TES_TASK_NOT_FOUND` and `TES_NOTHING_TO_CANCEL_STATES`, all on the parent. Like the Pulsar runner without that child, it retries an unreachable TES server forever.

## Tests

- Unit tests: 100 passed, run together:
  - `test/unit/app/jobs/test_tes_runner.py` (20);
  - `test/unit/app/jobs/test_pulsar_tes_task_checks.py` (52);
  - `test/unit/app/managers/test_JobFilesManager.py` (11, 2 new: token and directory authorization);
  - `test/unit/data/security/test_job_files_tokens.py` (18).
- `test/integration/test_job_files.py`: 37 passed (32 existing, 5 new):
  - `test_write_with_put`;
  - `test_put_streams_large_body`;
  - `test_put_write_protection`;
  - `test_signed_per_file_tokens` (now also form-auth POST);
  - `test_directory_put` (now also `.` and a relative directory).
- ruff, black and isort are clean. Per-file mypy reports no new errors in the job files modules. In `tes.py` it reports only the subclass-of-`Any` error that `kubernetes.py` and `aws.py` show too when checked on their own.
- Run with `pytest -p no:postgresql`, because the venv has no libpq.

Not run: any live TES backend.
