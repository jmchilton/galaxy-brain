# Test challenges debrief — pulsar#550

Profile: generic_test_challenger. Model: Claude Opus 5.5, medium effort. Reviewed commit `324522637c196af357cdffadb2f07a81e939d90c`.

Scope: `test/detached_worker_test.py` (40 cases) and `test/manager_detached_test.py` (51 cases). All 91 pass locally in ~23s (`pytest test/detached_worker_test.py test/manager_detached_test.py`). Not edited — every drop/rewrite/refactor below is a recommendation.

## Overall

The core of the suite is strong and should stay as is: real supervisors, real gated children, and real `SIGKILL` of supervisors prove no-replay and recovery without mocking restart. That includes `test_result_is_idempotent_and_duplicate_supervisor_cannot_replay`, `test_supervisor_loss_reconnects_to_same_execution`, `test_restart_adopts_same_command_without_reexecution`, `test_supervisor_loss_uses_gate_exit_record`, `test_pool_capacity_coordinates_independent_server_processes`, and the three `test_stateful_proxy_stop_*` tests. The challenges below are about:

1. a few contract surfaces with no tests at all;
2. tests whose names claim more than they assert;
3. seams being faked by monkeypatching private methods or `Mock` objects, where an existing seam (or a small extraction) would read better.

## Gaps (no test covers it)

### Stop of a TERM-ignoring command (SIGKILL escalation)

No test stops a leader that ignores TERM. `test_cancel_terminates_verified_group` uses `sleep 30`, which dies on TERM. `test_background_writers_are_drained_before_result` reaches SIGKILL only on the natural-exit ("reaping") path.

Probe (scratchpad, worker fixture, script `trap '' TERM; sleep 30`, then `stop()`): result `return_code == -9`, `stopped True`, no `EXIT_FILE`. The SIGKILL of the group also kills the gate (it is the group leader), so no exit record is written. `supervise()` then falls back to `proc.returncode` (-9). After a supervisor replacement `proc` is `None`, so the same situation yields 143. The recorded return code therefore depends on whether the supervisor was replaced, and can be negative. This is a bug report, not a hunt; the bug-check reviewer should confirm.

Test plan: in `test/detached_worker_test.py`, add `test_stop_escalates_to_sigkill_with_stable_return_code`, parametrized `supervisor_replaced: [False, True]`. Steps:
- script `trap '' TERM; sleep 30`;
- wait for `phase == "executing"`;
- when `supervisor_replaced`, kill the original supervisor and launch with `recover=True`;
- `stop()` and wait for the result.

Assertions:
- `record["stopped"] is True`;
- `record["return_code"] >= 0`;
- the return code is the same in both parametrizations (143 vs 137 is the author's call);
- `command_group_status(identity)[1] is False`.

### HTTP/client surface of `acknowledge_collection`

`JobClient.acknowledge_collection`, the `server_interface` path and method (`jobs/${job_id}/collection`, `PUT`), and the `routes.acknowledge_collection` controller (`{"acknowledged": bool}`) have no tests. Only the manager method is exercised.

Test plan:
- `test/client_test.py`: add `test_acknowledge_collection`, mirroring `test_clean`. Use `RequestChecker("jobs/543/collection")`, have the transport return `b'{"acknowledged": true}'`, and assert `client.acknowledge_collection() == {"acknowledged": True}`.
- Assert the method is `PUT`. `RequestChecker` currently checks only URL and data, so either extend it with an optional `method` or assert `COMMAND_TO_METHOD["acknowledge_collection"] == "PUT"` alongside.

### End-to-end through the Pulsar app

Nothing runs `detached_local` through `StatefulManagerProxy` plus a real `JobClient`: submit, postprocess, `COMPLETE`, collect, then `clean`/ack. The stateful tests in `manager_detached_test.py` cover only the cancellation paths.

The client can discover the capability: the server's `system_properties` reach the client in the remote job config (`path_mapper.py:45` reads `remote_job_config["system_properties"]`). `pulsar/client/test/check.py` calls only `client.clean()` with `cleanup_job: always`, which for this manager leaves staging behind forever.

Test plan:
- `test/integration_test.py`: add `test_integration_detached_local` calling `run_job(integration_test_configuration, job_conf_props={"type": "detached_local"}, private_token=None)`.
- Extend `check.py` so that, when the remote job config advertises `detached_local.collection_ack`, it calls `client.acknowledge_collection()` after a successful collection.
- Assert:
  - the job's staging directory still exists after `clean()` and before the ack;
  - the directory is gone after the ack.

### FIFO ordering

`test_capacity_shared_fifo_across_managers` proves capacity: the third job waits until one of two finishes. It does not prove FIFO. Nothing asserts that queued jobs start in submission order, though `_reconcile_locked` sorts by `submitted_at` and the docs and class docstring advertise a FIFO pool.

Test plan: add `test_queued_jobs_start_in_submission_order` with capacity 1:
- one blocker waiting on a `release` file;
- queue B through manager `first`, then C through manager `second`, both on the same staging directory;
- release the blocker.

Assert `COMMAND_FILE.started_at(B) < COMMAND_FILE.started_at(C)`, and that C's `started_at >= EXIT_FILE.finished_at(B)`. If the planner extraction below lands, this becomes a pure planner test instead.

### Smaller untested branches

- `DetachedLocalManager.job_stderr_contents` appends `Detached execution: <failure>`. Nothing asserts it. Extend `test_policy_is_snapshotted_and_enforced`: after `FAILED`, assert `b"Detached execution: Execution exceeded walltime limit" in manager.job_stderr_contents(job_id)`.
- In `launch()`, `container_config.json` sets `manifest["entry_point_config"]` and creates `working/import` and `working/tmp`. Nothing covers this. Add `test_container_config_snapshotted_into_manifest`: write `configs/container_config.json` with an `entry_point_config` and no containers, so nothing runs Docker. Assert:
  - the manifest's `entry_point_config` equals the written config;
  - both directories exist.
- `publish_entry_points` without `callback_url` writes `container_runtime.json`; no test covers it. Nor does any test cover `_entry_point_host` for `0.0.0.0` (with and without `get_ip_method`) or for `::`/`[::]` (skipped). These are cheap pure tests in `detached_worker_test.py`.

## Tests whose names overclaim

- `test_capacity_shared_fifo_across_managers`: tests capacity, not FIFO. Rename it to `test_capacity_shared_across_managers` and add the FIFO test above.
- `test_policy_is_snapshotted_and_enforced`: "snapshotted" is asserted only as "the manifest contains the limit". To test the snapshot, overwrite `configs/detached_execution.json` after `launch()` with a policy that has no limits. Then assert the walltime still fires (`FAILED`, walltime failure). Otherwise drop "snapshotted" from the name.
- `test_entry_points_retry_callback_and_never_log_credentials`: the worker does no logging. The assertion checks that the persisted live snapshot omits the URL. Rename it to `..._and_never_persist_callback_in_live_record`, and assert against the actual `LIVE_FILE` written by a run rather than a local dict. Also see the payload gap below.

## Mocks and seams

### Docker: use the existing `docker_cmd` seam instead of monkeypatching

`docker_command()` already honors `connection_configuration["docker_cmd"]`. Add a `fake_docker` fixture in `detached_worker_test.py`. It writes an executable script into `tmp_path` that:
- appends its argv to `docker.log`;
- for `inspect`, prints the contents of `inspect.json`, or for daemon/absent cases prints a canned `stderr` and exits 1;
- for `kill`/`rm`, rewrites `inspect.json` to `State.Status = "exited"`.

That replaces:
- `Mock(return_value=SimpleNamespace(...))` for `call_docker` in `test_docker_verified_identity_and_mount`, `test_docker_changed_identity_or_mount_is_unknown`, and `test_docker_absence_differs_from_daemon_failure`. If the fake is overkill for these pure classification cases, at least use `subprocess.CompletedProcess(args=[], returncode=..., stdout=..., stderr=...)` instead of `SimpleNamespace`.
- the `inspect_container` and `call_docker` lambdas plus the `state` dict in `test_owned_daemon_container_stops_after_wrapper_exits`. Assert from `docker.log` that every action targets `immutable-owned-id`, and that `kill --signal TERM` precedes a plain `kill` when grace is exceeded.
- the `worker.time.sleep = Mock(side_effect=RuntimeError("end inspection"))` loop-breaker in `test_unknown_container_never_authorizes_result`. Run the worker as a subprocess (`execution.launch(recover=True)`) against a fake docker that always prints `Cannot connect to the Docker daemon`. Then do what `test_unknown_fork_window_never_replays` does: wait for `LIVE_FILE.phase == "retained"`, sleep a few polls, and assert no `RESULT_FILE`. That also drops the three-line justification comment.

Optional design improvement: split `inspect_container` into `call_docker` plus a pure `classify_inspection(info, name, container_id, expected_mount)`. The parametrized identity/mount/state tests would then be pure function tests with no patching at all.

### Entry-point callback: use a real local HTTP server

`test_entry_points_retry_callback_and_never_log_credentials` and `test_revoked_entry_point_callback_is_not_retried` mock `urlopen`, including a hand-rolled `__enter__`/`__exit__`. They never assert what is POSTed: not the body (`{"container_runtime": {...}}`), the method, or the content type. Replace them with a `callback_server` fixture: `http.server.ThreadingHTTPServer` on `127.0.0.1:0`, with a handler that serves a scripted list of status codes (e.g. `[503, 200]` or `[403]`) and records `(method, path, headers, json body)`. Keep the first case's `OSError` by pointing at a closed port first, or use 503. Assert:
- the recorded body equals `{"container_runtime": {"8888": {...}}}`; JSON turns int keys into strings, which is worth pinning since Galaxy consumes it;
- `Content-Type: application/json`;
- the request count after a third call stays at 2;
- the revoked cases record exactly one request.

### Signal mocks: keep, but as a recording fake

- In `test_pid_reuse_does_not_authorize_process_group_signalling`, the `os.killpg` Mock is a safety net. The identity uses the test process's own PID, so a regression would signal pytest's own group. Keep the guard. Replace `Mock()` with a tiny `RecordingKillpg` (list of `(pgid, signum)`) and assert `== []`.
- In `test_host_boot_mismatch_neither_executes_nor_signals`, the `signal_command` Mock backs the "nor signals" half of the name. Keep it in the same recording form.

### Manager: monkeypatching private `_spawn_worker` → extract a pure reconciliation planner

Four tests replace `manager._spawn_worker` with a no-op or a raiser so that they can hand-edit durable state before a "replacement" manager reconciles:
- `test_host_boot_mismatch_is_retained_and_holds_capacity`
- `test_reservation_recovers_when_manager_dies_before_worker_fork`
- `test_unknown_admission_state_cannot_authorize_launch_or_cleanup`
- `test_unknown_supervisor_state_cannot_authorize_launch`

`test_host_boot_mismatch_is_retained_and_holds_capacity` does this by direct attribute assignment and manual restore (lines 334–340), not `monkeypatch`. If `launch()` raises, the stub leaks into the fixture teardown.

The thing these tests really pin is the decision logic in `_reconcile_locked`: per manifest, choose terminal (record the return code, maybe clean), foreign host (holds capacity), queued and stopped (cancel), queued (candidate), launched (ensure worker), or unreadable (holds capacity); then admit queued candidates in `(submitted_at, job_id)` order up to capacity. Extract it as a pure function over small dataclasses. For example:

```python
@dataclass(frozen=True)
class PoolEntry:
    job_id: str
    submitted_at: int
    phase: str | None        # None when unreadable
    terminal: bool
    foreign_host: bool
    stop_requested: bool

@dataclass
class ReconcilePlan:
    cancel: list[str]
    ensure_worker: list[str]
    admit: list[str]

def plan_reconcile(entries, capacity) -> ReconcilePlan: ...
```

`_reconcile_locked` then only reads entries from disk and applies the plan. Rewrite the four tests above, and the new FIFO-order test, as direct `plan_reconcile` tests:
- foreign host consumes a slot;
- unreadable/unknown phase consumes a slot and is never admitted;
- `launching` with no live record goes to `ensure_worker`;
- FIFO by `submitted_at`, ties broken by `job_id`;
- capacity 0 admits everything.

Keep one or two real-process tests for the wiring. `test_manifests_reconciled_without_native_active_index` and `test_pool_capacity_coordinates_independent_server_processes` already do this.

## Readability and reuse

- `detached_worker_test.py` redefines `wait_for`. Use `test.test_utils.wait_for` (already used by the manager tests); it also gives better timeout messages.
- The `execution` fixture yields a `SimpleNamespace(root, manifest, prepare, launch)`, with module-level `result()`, `command()`, `stop()` helpers alongside. Replace it with a `DetachedExecution` dataclass whose methods are `prepare`, `launch`, `result`, `command`, `stop` and `kill_command_group` (teardown). `stop()` should build its record with `worker._base_record(manifest)` instead of re-spelling `schema`/`job_id`/`token`.
- `test_invalid_capacity_before_side_effects` and `test_invalid_timing_before_side_effects` each define a local `class App`. Use one module-level `@dataclass class StagingOnlyApp: staging_directory: str`.
- Three tests hand-roll the same "block `_prepare_run` on events" wrapper:
  - `test_slow_preparation_does_not_block_unrelated_pool_operations`
  - `test_concurrent_duplicate_submissions_prepare_and_execute_once`
  - `test_stateful_proxy_stop_during_command_preparation_never_launches`

  Extract a `BlockingPrepare(manager, only_job_id=None)` helper class with `entered`, `release`, `calls`, used via `monkeypatch.setattr(manager, "_prepare_run", blocking)`.
- In-function imports in `manager_detached_test.py`:
  - `import shutil` in the fixture;
  - `import subprocess` and `import threading` in four tests;
  - `ManagerProxy` and `stateful`/`StatefulManagerProxy` in five tests.

  Move them all to module top.
- `test_aggregate_directory_limit_requires_separate_explicit_policy` tests two unrelated things: aggregate enforcement, and paired-field validation through `worker.run`. Split it into `test_aggregate_directory_limit_enforced` (pure `exceeded_limit`) and `test_aggregate_directory_limit_requires_paired_fields` (`_validate_limits` / `_validate_manifest` directly).
- `test_native_output_limit_is_per_file_not_total_job_output` spawns a full supervisor to test a pure decision. Make it a direct `exceeded_limit` assertion like `test_native_output_limit_counts_a_symlinked_declared_file`. The end-to-end limit path is already covered by `test_output_limit_is_enforced_without_galaxy`.

## Drops

None recommended. No test is purely implementation-mirroring or silly. `test_native_factory_and_capability` restates a dict literal, but that dict is the cross-project contract Galaxy reads, so pinning it is justified.
