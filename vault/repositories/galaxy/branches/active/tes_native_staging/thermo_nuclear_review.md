Run via Claude Opus at high effort.

# Thermo-nuclear code quality review: tes_native_staging

I reviewed `git diff jmchilton/tes_task_state_polling...HEAD` at `34906cb3cca` and acted on six findings, each in its own commit (not pushed). I split `tes.py` into the runner and a pure task-building module. The two TES runners now share their cancel and failure-message code in `util/tes_task.py`. I also took out a boolean mode flag and a copied buffering loop from the job files code, and fixed a small leak in the runner. The larger restructuring is to share TES polling between the two runners. I didn't do it, because it would rewrite the parent branch's Pulsar polling. It is written up as a follow-up issue in [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md). Nothing went into the private security report.

Commits, oldest first:

- `75193b32b92` Move TES-native task building out of the runner module.
- `65e49afdf49` Derive the TES executor env from resources; share the job directory check.
- `4e0549dfc1b` Share TES cancel and failure handling between the TES runners.
- `72edf42c2bf` Give raw PUT its own replace; batch request bodies in one place.
- `62be133f364` Share the raw body request schema between the job files PUT routes.
- `d8668d40690` Drop the TES runner's stashed container however preparing ends.

Tests after the last commit:

- Unit: 103 passed. That is `test_tes_runner.py`, `test_pulsar_tes_task_checks.py`, `test_JobFilesManager.py` and `test_job_files_tokens.py`.
- `test/integration/test_job_files.py` and `test/integration/test_tes_runner.py`: 45 passed (40 + 5).
- ruff, black and isort are clean on every file the branch changes.
- mypy, run from `lib/` as `make mypy` does, is clean on the TES, job files and token modules. That includes two errors the branch had before: `tool_dir` passed as a `StrPath`, and an optional task id passed to `get_task`.

Behavior is unchanged except in two places, and both match what the code already claimed:

- `TesJobRunner.stop_job` no longer raises on destination parameters it can't parse. It logs instead, as its docstring says it does.
- A bug inside the failure summary of a TES-native job is no longer caught and dropped. It is handled as in the Pulsar runner.

## Not acted on

- **Share TES polling between the two runners.** Both still have their own rate limiting per task, client creation, fetch-and-retry and FULL-view read on failure. Two sets of state names also have to agree. Merging them means restructuring the parent branch's `PulsarTesJobRunner.check_watched_item` and the roughly 50 tests that pin it, and that branch is READY. Filed as [thermo_followup_refactor_issue.md](thermo_followup_refactor_issue.md).
- **`TES_WAITING_STATES` / `TES_RUNNING_STATES` duplicate `TES_FINISHED_STATES`.** Deriving "waiting" as "not finished and not running" would make an unknown state wait instead of failing the job. That changes behavior, so it is part of the follow-up issue.
- **The `_containers` side channel between `build_command_line` and `queue_job`.** The Kubernetes and GCP Batch runners call `_find_container` twice instead. Doing that here would delete the dict, but container resolution can be slow, and the override also makes "no container" fail inside `prepare_job`, with its error message. I kept the dict and fixed its leak (`d8668d40690`).
- **A typed model for the task's files.** `wrapper_script` takes 8 parameters and `build_tes_task` 9. Bundling the job directory, outputs, directories and streams into one dataclass would shorten the signatures. It would also add a concept that the call sites and tests then have to construct, and after the split both functions are short and pure. Not worth the churn now.
- **`JobFilesManager.authorize_write` returns only the staging directory**, so the PUT route asserts `path` afterwards. Returning `(path, staging_parent)` like `authorize_directory_write` would be symmetric, but it changes the return type of a method that two existing POST code paths use. Minor.
- **`str(job_key)` in `_authorize`.** It narrows a type the branch logic already guarantees. Restructuring the branches would reorder the error checks against `decode_id`. Left alone.
- **`shutil.move` into an existing directory**, which the test challenge noted. With `replace()` now a separate method, `os.replace` would be the natural fix. It is a behavior change in code that predates the branch, so it remains a follow-up.
- **Test harness.** `tes_fakes.py` and the integration test's `LocalTesServer` are both small HTTP servers with the same `_send` helper. They live in different test packages (unit and integration), and sharing between them isn't a pattern the repository uses, so I left them. The harness itself is good: real runners against a real HTTP fake, no mocking of the TES client.

<details>
<summary>Full review</summary>

## 1. `tes.py` was two modules (acted: `75193b32b92`, `65e49afdf49`)

At 615 lines the file wasn't near 1k, but it mixed two things:

- **Pure functions of paths:** staged input discovery, tool directory scanning, signed URLs, the wrapper script and the task document. They take no job wrapper.
- **The runner's lifecycle:** submit, poll, cancel and recover.

The unit tests already treated them separately: the wrapper and staging tests never build a runner. The pure half moved unchanged to `lib/galaxy/jobs/runners/util/tes_staging.py` (269 lines). `tes.py` keeps the runner (365 lines). It sits beside `util/tes_task.py`, which inspects tasks, so the `util/` package now has building and inspecting as separate modules.

Then two simplifications that the split made easy to see:

- `build_tes_task(resources=..., env=executor_env(resources))` passed the same information twice. `build_tes_task` now derives the env from `resources`, which is required, and `executor_env` becomes private. `test_build_tes_task` still checks the `GALAXY_SLOTS`/`GALAXY_MEMORY_MB` mapping through the task's executor env.
- The "output outside the job directory" check was written out twice, as a loop in `_output_paths` and in `directory_output_paths`. It is now one `job_directory_outputs(job_directory, paths)`, and `directory_output_paths` becomes a one-line `dict.fromkeys`.

## 2. The two TES runners duplicated cancel and failure handling (acted: `4e0549dfc1b`)

- **Cancel fallback.** Both `TesJobRunner.stop_job` and `PulsarTesJobRunner._kill_remote_job` did the same thing after a failed cancel: read the state, then log one of three outcomes, in identical words. It is now `log_tes_cancel_failure(log, destination_params, id_tag, task_id, cancel_error)` in `tes_task.py`:
  - It takes the caller's logger, so log records keep their logger names and the tests' `caplog` filters still apply.
  - It builds the TES client inside its own error handling, as the Pulsar version did. The native `stop_job` had built its client outside any `try`, which contradicted its "never raises" docstring.
  - Change to the parent's `pulsar.py`: 22 lines become one call, and one import swaps. Log text is unchanged; all 52 Pulsar TES tests pass untouched.
- **Failure description.** The branch split the parent's `describe_tes_task_failure` into `summarize_tes_task_logs` and a new `TesTaskLogSummary` NamedTuple. That type had the same three fields as `TesTaskFailure`, except that `summary` stood in for `message`. The native runner then re-joined the message itself.
  - The simpler cut is `describe_ended_tes_task(message, task_state, task, secrets) -> TesTaskFailure`, which appends the summary to whatever headline the caller gives. `describe_tes_task_failure` is the Pulsar headline plus that call.
  - The second type goes away, and the parent's function is now only split at the point where its headline ends.
  - The native runner now passes `tes_known_secrets(None, tes_params)` instead of rebuilding the basic auth secret list by hand.
- **Polling bookkeeping.** `check_watched_item` popped `_next_checks` in three separate early returns. It now only rate-limits, checks limits and forgets ended tasks. The state machine moved to `_check_task(job_state, task_id) -> bool`, "keep watching", which is the shape the Pulsar runner's `_check_tes_task` already has.
  - The parallel structure makes the remaining duplication obvious. Moving it into a shared helper would restructure `pulsar.py`, so it is the follow-up issue.
  - Passing the asserted `task_id` down also fixes a mypy error: `get_task` had received `job_state.job_id`, a `str | None`.

## 3. Job files API: a mode flag and a copied loop (acted: `72edf42c2bf`, `62be133f364`)

- **`JobFilesManager.write(..., append_tool_streams=True)`.** This was a one-off boolean threaded into an existing method. Only the raw PUT routes turned it off. `replace(path, source_path)` is now its own method, and `write` delegates to it when not appending, so `write` keeps its original signature. The PUT routes call `replace`.
- **`_stream_body` copied `_parse_body`'s batching loop** (pending list, size counter, flush at `STREAM_WRITE_SIZE`). Both now read the body through one `_body_batches(request)` async generator. `_parse_body` holds back one batch to hand to `_finalize_parser`, so a small multipart upload is still one threadpool call, as its comment promised.
- The two PUT routes repeated the same `openapi_extra` literal; it is now `RAW_BODY_OPENAPI`.
- Kept as they are:
  - The API/manager split is right: authorization and path policy are in the manager, streaming and threadpool hops in the API.
  - `_replace_from_body` is shared by both PUT routes.
  - `authorize_directory_write`'s containment check reuses `util.in_directory`, as `authorize_write` does.
  - `_new_staging_dir` gives the POST and PUT paths one place that releases the session before the body moves.

## 4. `job_files_tokens.py`

There's no structural problem. It is 70 lines with one concept, Literal-typed scopes, constant-time comparison, a bounded expiry parse and a purpose-separated key derivation. Its tests are unit tests of the primitive, which is the right layer. The only nit is the defensive `str(token)` on a parameter typed `str`; not worth a commit.

## 5. Leak in the container stash (acted: `d8668d40690`)

`build_command_line` stores the container by job id for `queue_job`. `prepare_job` can fail or finish the job after `build_command_line` has run: an empty command line, or an exception inside `build_command` after the store. In those cases it returns `False`, and `queue_job` returned without popping, so the entry stayed in the dict for the life of the handler. `queue_job` now pops right after `prepare_job`, whatever it returned. There's no unit test, because `queue_job` needs a real job wrapper (see the test challenge debrief). The integration test covers the success path.

## 6. Test harness

- `tes_fakes.py` is a good abstraction. It moved from the parent's test file, so both runners' tests use one fake TES server over HTTP and the same plain `FakeJobWrapper`. The rebase risk on `test_pulsar_tes_task_checks.py` is already recorded.
- `test/integration/test_tes_runner.py`'s `LocalTesServer` deletes everything the task wrote that wasn't uploaded. That makes missing stage-out fail visibly. It is the right design and keeps the end-to-end check honest.
- The wrapper script tests run the real shell, so they aren't trivial unit tests, and they cover branches the integration test can't reach.

## Approval bar

The branch has no structural regression after these commits:

- No file crosses 1k lines.
- No ad-hoc conditionals were added to shared flows. The only new shared-code branch, the PUT routes, sits behind its own route and manager method.
- The remaining known duplication is the polling loop, which is deliberate and recorded, so the parent branch's PR stays reviewable.

</details>
