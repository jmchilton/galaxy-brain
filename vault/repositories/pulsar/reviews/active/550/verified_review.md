### P1 1: The generic `StatefulManagerProxy` sniffs a detached-only capability dict (implementation verified)

`StatefulManagerProxy` gained `_supports_detached_cancellation()`, which reads `system_properties()["detached_local"]` (`schema == 1` and `asynchronous_cancel`). Three places in shared proxy code branch on it:
- the cancel path in `_handling_of_preprocessing_state`;
- the two near-identical branches of `_record_launch_accepted`;
- the `PREPROCESSING` branch of `__proxy_status`, which rebuilds `system_properties()` on every status poll for every manager.

The capability map exists for Galaxy, not for in-process dispatch, so the proxy learns a manager's identity across the wrong boundary.

The fix gives the manager real hooks and removes the probe. `ManagerInterface` declares `confirm_cancelled_before_launch(job_id) -> bool` and `cancelled_before_launch_confirmed(job_id) -> bool`. `BaseManager` defaults both to `False`, `ManagerProxy` forwards both, and `DetachedLocalManager` overrides them. The proxy always calls the hook on the cancel path and records launch-accepted only when it returns `True`. `_record_launch_accepted` collapses to the single guarded form: for managers that never write `FINAL_STATUS` before activation, the guard is a no-op.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 1: A stopped command can record a negative return code, and the code depends on whether the supervisor was replaced (implementation verified)

The gate is the command group's leader, so SIGKILL escalation kills it before it can write an exit record. `supervise()` then falls back to `proc.returncode`. That gives `-9` with the original supervisor, and `143` after a replacement, where `proc` is `None`.

Separately, the gate stores `Popen.wait()` unchanged. A command killed by TERM is therefore recorded as `-15` in both the exit record and the result.

The fix:
- The gate maps negative codes to `128+N`, the shell convention.
- With a stop requested and no exit record, the gate can only have died to SIGKILL, so the result records `137` whether or not the supervisor was replaced.

<details><summary>Evidence</summary>

These tests failed red before the fix:
- `test_stop_escalates_to_sigkill_with_stable_return_code[False]`: `-9`.
- `test_stop_escalates_to_sigkill_with_stable_return_code[True]`: `143`.
- `test_signalled_command_records_shell_style_return_code`: `-15`.

The SIGKILL test waits for a `trapped` marker. Without it, TERM can arrive before `trap '' TERM` runs and the TERM path is exercised instead.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Attempts without a manifest are never cleaned (implementation verified)

`DetachedLocalManager.clean()` returns early when no manifest exists. A manifest is written only by `launch()` or by cancel confirmation. A job that fails in staging or command preparation therefore keeps its whole staging directory forever. `StatefulManagerProxy` doesn't override `clean`.

The fix cleans a manifest-less attempt when `JOB_FILE_PREPROCESSING_FAILED` is recorded. That record proves no preparation writer remains, because the proxy writes it only after preprocessing or `launch()` has raised.

"Set up, then cleaned with no submit" is still retained. The PR's docs describe that case as uncertain. If it should be cleanable too, it needs a non-blocking preparation-lock check.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 3: Cancelled and failed attempts are never acknowledged, so their staging is retained forever and rescanned on every poll

Pulsar deletes staging only when an attempt is terminal and has both `CLEAN_FILE` and `ACK_FILE`. The companion Galaxy PR (galaxy#24378 at `1f03f37`) acknowledges only fully successful jobs, and with `collection_ack` it never calls `clean()` without an ack. So staging is kept forever for:
- **User cancels.** A deleted job (`DELETED`) is the usual cancel.
- **Every failed job.** Any job that ends in `ERROR`: a tool error, a `failed` status from Pulsar, failed output staging, or failed metadata.
- **Unmodified Galaxy,** which never acks anything.
- **Lost acks.** If the ack request itself fails, nothing retries it.

No retention policy or admin purge exists. Every manager's housekeeper also reloads each retained attempt every `poll_interval` (default 0.5s) under the pool flock, so the cost grows with every cancelled or failed job.

<details><summary>Details</summary>

How a cancel flows through galaxy#24378 (`lib/galaxy/jobs/runners/pulsar.py`):
1. A user delete marks the job `DELETED` (`handler.__delete`). `stop_job` sees `asynchronous_cancel` and calls `client.kill()` only.
2. Polling continues until Pulsar reports `cancelled`. Then `mark_as_finished` → `finish_job`, which passes `cleanup_job="never"` when `collection_ack` is set.
3. `_complete_staged_job` → `JobWrapper.finish()` returns `fail()` at once for `DELETED`/`ERROR` jobs. `_finish_pulsar_job` still returns True.
4. `_acknowledge_staged_collection` returns early unless the job state is `OK` and no output is `ERROR`/`FAILED_METADATA`. No ack, no `clean()`.

Galaxy's "stop" (`STOPPED`, used for interactive tools) is the one cancel that can be acked. `finish_job` forces exit code 0, so the job can finish `OK`.

The `fail_job` paths (Pulsar `failed`, staging failure, finish exception) don't reach `_acknowledge_staged_collection` at all. The Pulsar runner doesn't override `fail_job`.

Galaxy's own docs in that PR say: "Failed imports or missing acknowledgment retain staging. If acknowledgment fails after the job finishes, an operator must arrange an idempotent acknowledgment and cleanup retry … completed jobs do not receive automatic acknowledgment retries." Neither PR adds tooling for that retry.

</details>

Suggested fix: define, in Pulsar's docs and the `collection_ack` contract, what a client must do after a cancel or a failure.
- **Option 1: acknowledge terminal attempts in every final state.** "The client has finished with this attempt, keep or delete it per `cleanup_job`." galaxy#24378 would then ack and clean after `DELETED`/`ERROR` too, except when the operator chose `cleanup_job: never`.
- **Option 2: a confirmed `cancelled` attempt needs no ack.** There is nothing to import, so `clean()` alone deletes it. Failed jobs would still need an ack.

Either way:
- Add an opt-in retention setting or an admin purge for attempts that are never acknowledged.
- Skip already-reconciled terminal attempts in the hot loop.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Cancel path traced against galaxy#24378 at `1f03f37` by the coordinating agent (Opus 5.5).

</details>

### P2 4: `acknowledge_collection` is not part of the manager interface, so the new route returns 500 on other managers (implementation verified)

`ManagerProxy` forwards `acknowledge_collection` and `confirm_cancelled_before_launch` unconditionally, but neither method is declared on `ManagerInterface`. On any other manager, `PUT /jobs/{id}/collection` raises `AttributeError`, and the route turns that into a 500. The client enforces the contract only through a docstring ("call only for managers advertising…").

The fix declares `acknowledge_collection` on `ManagerInterface`. It gives `BaseManager` a default that returns `True`, since nothing is retained beyond `clean()`. The cancel hook from P1 1 gives the second forwarder a base default too.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 5: `DetachedLocalManager` extends the PID-based unqueued `Manager` (implementation verified)

The class overrides `launch`, `get_status`, `kill`, `clean` and `shutdown`. It uses none of the inherited PID, `_run`, `_monitor_execution` or job-lock machinery; what it needs is `BaseUnqueuedManager._prepare_run`.

The fix derives the class from `BaseUnqueuedManager` and adds a `_monitor_execution` stub that raises `NotImplementedError`.

Two possible follow-ups were left for the author:
- `_prepare_run` still writes `JOB_FILE_SUBMITTED`, which this manager never reads. Moving `_prepare_run` into a mixin would fix that.
- The `new_clean_env` shim in `unqueued.py` is now shared by two managers and could move to `util/env.py`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 6: The on-disk record model is untyped and duplicated between the manager and the worker

All lifecycle state is raw JSON dicts with string phases:
- `_record` and `_base_record` exist in both `detached.py` and `detached_worker.py`, with diverging schema checks.
- Numeric validation is duplicated.
- The manager calls the worker's private `_validate_manifest`.
- The worker writes both `return_code` and `returncode`, and the manager reads them back with a fallback three times, for a schema that has never shipped.
- Phase vocabularies are string literals in both modules.
- The `manifest["host_identity"]` versus `worker.host_identity()` comparison is repeated across `detached.py`: 6 sites at `3245226`, 5 on the review branch.

Suggested fix: one `Attempt` class in the worker module that owns `root` and `manifest`. It would provide validated `read`/`write`, `terminal_result()`, `is_local_host` and a public `validate_manifest`, with `TypedDict`s for the manifest and result and phase constants next to their writers. Write `return_code` only.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P2 7: `detached_worker.py` is one 894-line module with five concerns and a ~170-line `supervise` loop

The single file holds:
- JSON persistence;
- process-group signalling;
- Docker inspection and its CLI builder;
- entry-point discovery and callbacks;
- limits;
- the gate and supervisor state machine.

`supervise()` is a closure-heavy loop, and `_stop_containers` takes eight positional parameters. Copying the worker as a single file is what pins this layout (P3 3).

Suggested fix: make it a `pulsar/managers/util/detached/` package, and make the supervisor a small class whose fields replace the closure-captured state.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P2 8: The Galaxy↔Pulsar job-directory contract is a private JSON shape with fallbacks that hide its real form

`configs/detached_execution.json` and `configs/container_config.json` are defined only in prose and in the worker's validation code. Several fields accept more than one shape:
- `container_configuration.get("entry_point_config", container_configuration)`;
- `entry_point_config` may be a dict or a path that is re-read at runtime;
- `expected_mount` may be a string or a mapping.

Nothing has relied on the alternatives yet.

Suggested fix: define typed policy and container models in `pulsar.client`, which Galaxy already imports, and pick one shape per field. Reject the other shapes at manifest validation rather than supporting them.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P2 9: The `acknowledge_collection` client and HTTP surface, and the end-to-end Pulsar-app path, are untested (implementation verified)

None of these had a test:
- `JobClient.acknowledge_collection`;
- the `PUT jobs/${job_id}/collection` mapping;
- the route;
- `detached_local` through a real Pulsar app and client.

`check.py` only calls `clean()`, which for this manager leaves staging behind forever.

The fix adds three things:
- `client_test.py::test_acknowledge_collection`. `RequestChecker` gains an optional `method` and pins `PUT`.
- `integration_test.py::test_integration_detached_local`, for the simple, mq and direct configurations. With the `acknowledge_collection` option, `check.py` asserts that staging survives `clean()` and is removed only by the ack.
- A route test against a plain unqueued manager (P2 4).

<details><summary>Details</summary>

The integration test sets `assign_ids: galaxy`. `check.py` asserts paths rewritten under the client job ID, and that check fails with this manager's default UUID IDs.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 10: FIFO ordering is advertised but never asserted (implementation verified)

`test_capacity_shared_fifo_across_managers` proves capacity only.

The fix renames it to `test_capacity_shared_across_managers`. It adds `test_queued_jobs_start_in_submission_order`: capacity 1, a blocker, then B queued via one manager and C via another. The test asserts that B starts before C, and that C starts no earlier than B finishes. Remote IDs are random UUIDs, so the test runs three times to make directory order differ from submission order. A direct planner test also covers FIFO (P2 11).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 11: Tests pin reconciliation decisions by monkeypatching the private `_spawn_worker` (implementation verified)

Four tests stub `_spawn_worker` so they can edit durable state before a replacement manager reconciles. One of them assigns the attribute directly and restores it by hand, so the stub leaks into teardown if `launch()` raises.

The fix:
- Extracts a pure `plan_reconcile(entries, capacity) -> ReconcilePlan(ensure_worker, admit)` over `PoolEntry` records in the states settled, held, queued and launched. `_reconcile_locked` now only classifies attempts and applies the plan.
- Adds direct planner tests: a held attempt consumes a slot and is never admitted; a launched attempt gets a worker; a settled attempt releases its slot; admission is FIFO by `(submitted_at, job_id)`; capacity `None`/`0` admits everything.
- Keeps the four real-process tests, and switches the hand-restored stub to `monkeypatch`.

One behavior change: before, an `_ensure_worker` exception counted the attempt twice for that round. It now counts once.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 12: Docker tests monkeypatch around the existing `docker_cmd` seam (implementation verified)

`docker_command()` already honors `connection_configuration["docker_cmd"]`, but the tests patched `call_docker` and `inspect_container`. One test broke the supervise loop with a fake `time.sleep`.

The fix adds a `FakeDocker` fixture: an executable script that logs its argv and serves scripted inspect data or daemon errors. With it:
- The inspection tests run through the real CLI path.
- The stop test makes the container ignore TERM, so the escalation order (`kill --signal TERM` and then `kill`, both against the immutable ID) is actually exercised.
- The unknown-daemon test runs a real worker subprocess until `phase == "retained"` and asserts that no result is written.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 13: The entry-point callback payload is never asserted (implementation verified)

The tests mocked `urlopen` and never checked the POSTed body, method or content type.

The fix adds a `CallbackServer` fixture (`ThreadingHTTPServer` on `127.0.0.1:0`) with scripted statuses that records each request. The tests now pin:
- the body `{"container_runtime": {"8888": {...}}}`, including the string key Galaxy receives;
- `Content-Type: application/json`;
- exactly two requests after a 503 followed by a 200;
- exactly one request on a 403 or 410.

An unreachable-Galaxy case covers the `OSError` path. The test claiming "never log credentials" overclaimed, since the worker doesn't log. It is renamed `..._never_persist_callback_in_live_record` and now checks the written `LIVE_FILE`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: `num_concurrent_jobs` parsing duplicates `QueueManager`'s with different semantics

`detached.concurrent_jobs` reimplements the `"*"`-to-CPU-count handling, using `os.cpu_count()` where `queued.py` uses `multiprocessing.cpu_count()`. It also adds `null`/`0` as unlimited. The PR's docs define that for `detached_local`, but `queued_python` doesn't accept it, so the two managers interpret one option name differently.

Suggested fix: extract a shared `parse_num_concurrent_jobs`, and either share the unlimited semantics or reject them explicitly in `queued_python`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `launch()` hardcodes `root / "configs"` (implementation verified)

The fix uses `job_directory(job_id).configs_directory()`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Copying the worker into every job directory still depends on Pulsar's interpreter, and the reason isn't stated

`launch()` copies `detached_worker.py` into each job root and runs it with `sys.executable`. Per the docs, `psutil` must still come from Pulsar's environment, so the copy appears only to pin the worker source across a Pulsar upgrade. That reason is never stated, and the copy is what forces the single-file layout in P2 7.

Suggested fix: state the reason in one comment, or run the worker with `sys.executable -m pulsar.managers.util.detached_worker`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 4: A third process-group killer sits next to `util/kill.py` and `util/process_groups.py`

The worker's `signal_command` and `command_group_status` form a stronger, identity-verified group signaller that lives privately in one worker.

Suggested fix: once the worker can import from a package (P3 3), move it into `util/process_groups.py` so the other local managers can use it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 5: The request-stop sequence is repeated in four places (implementation verified)

`launch`, both branches of cancel confirmation, `kill` and reconciliation each wrote `STOP_FILE` and then settled a queued local attempt. `_cancel_queued` wrote Stop a second time.

The fix adds one `_request_stop_locked(root, manifest)` and removes the extra write from `_cancel_queued`. The two crash-ordering writes that must precede the manifest stay explicit.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: `test_policy_is_snapshotted_and_enforced` doesn't test the snapshot (implementation verified)

The test now overwrites `configs/detached_execution.json` with a no-limit policy after `launch()` and still expects a walltime `FAILED`. It also asserts the `Detached execution: Execution exceeded walltime limit` stderr suffix.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 7: Container-config and entry-point fallback branches are untested (implementation verified)

New tests cover:
- `test_container_config_snapshotted_into_manifest`: the `entry_point_config` snapshot, plus `working/import` and `working/tmp`.
- Publication without a callback, which writes `container_runtime.json`.
- `_entry_point_host` for `::`/`[::]` (skipped), for `0.0.0.0` with `get_ip_method`, with an unsupported method kind, and with the default route lookup.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 8: `detached_worker_test.py` duplicates `wait_for` and uses a `SimpleNamespace` fixture (implementation verified)

The file now uses `test.test_utils.wait_for`. A `DetachedExecution` dataclass carries `prepare`, `launch`, `result`, `command`, `live`, `stop`, the `wait_for_*` helpers and teardown. `stop()` builds its record with `worker._base_record`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 9: `manager_detached_test.py` repeats local fakes and imports inside test functions (implementation verified)

The fix:
- moves `shutil`, `subprocess`, `threading`, `ManagerProxy`, `stateful` and `StatefulManagerProxy` to module level;
- replaces the two local `class App` definitions with `StagingOnlyApp`;
- replaces three hand-rolled blocking `_prepare_run` wrappers with `BlockingPrepare`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 10: Signal guards use `Mock` (implementation verified)

The `os.killpg` and `signal_command` guards now use a small `Recorder` and assert `calls == []`. Both guards stay: the first protects pytest's own process group.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 11: Two worker tests mix concerns or spawn a supervisor for a pure decision (implementation verified)

- The aggregate-limit test is split into `test_aggregate_directory_limit_enforced` (`exceeded_limit`, now with a not-exceeded case) and `test_aggregate_directory_limit_requires_paired_fields`.
- A direct `test_native_output_limit_applies_per_declared_file` is added. The subprocess per-file test is kept.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
