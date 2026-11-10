# Test challenges review — pulsar#550

Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md). Model: Claude Opus 5.5, medium effort. Reviewed commit `324522637c196af357cdffadb2f07a81e939d90c`.

**Verdict:** the real-process recovery and no-replay tests are the right foundation and should stay. All 91 cases pass locally in ~23s. The problems are elsewhere:
- several contract surfaces have no tests: client/HTTP ack, FIFO order, stop with SIGKILL escalation;
- one probe exposed an inconsistent return code;
- a handful of private-method monkeypatches and `Mock`s could be replaced by existing seams or a small planner extraction.

The full test plan is in [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1: Stop of a TERM-ignoring command is untested and records `return_code -9`

No test stops a leader that ignores TERM. The probe ran the worker fixture with script `trap '' TERM; sleep 30`, then `stop()`. The result was `return_code == -9`, `stopped True`, and no exit record: SIGKILL of the group also kills the gate, and `supervise()` falls back to `proc.returncode`. After a supervisor replacement `proc` is `None`, so the same situation records 143. The recorded return code depends on whether the supervisor was replaced, and can be negative. This was reported, not hunted; the bug-check reviewer should confirm.

Add `test_stop_escalates_to_sigkill_with_stable_return_code` to `test/detached_worker_test.py`, parametrized `supervisor_replaced: [False, True]`. It should assert:
- `stopped is True`;
- `return_code >= 0`;
- the return code is identical across both params;
- the command group is dead.

## P2 2: `acknowledge_collection` client/HTTP surface and Pulsar-app path untested

Untested pieces:
- `JobClient.acknowledge_collection`;
- the `server_interface` mapping (`jobs/${job_id}/collection`, `PUT`);
- the `routes.acknowledge_collection` controller (`{"acknowledged": bool}`).

Nothing runs `detached_local` through `StatefulManagerProxy` plus a real client (submit → postprocess → `COMPLETE` → collect). `pulsar/client/test/check.py` only calls `client.clean()`, which leaves this manager's staging behind forever.

- `test/client_test.py`: add `test_acknowledge_collection`, mirroring `test_clean`, with `RequestChecker("jobs/543/collection")`. Assert the parsed `{"acknowledged": True}`, and assert the method is `PUT` (extend `RequestChecker` with an optional method, or assert `COMMAND_TO_METHOD`).
- `test/integration_test.py`: add `test_integration_detached_local` with `job_conf_props={"type": "detached_local"}`. Have `check.py` call `client.acknowledge_collection()` when the remote job config's `system_properties` advertise `detached_local.collection_ack`. Assert:
  - staging survives `clean()`;
  - staging disappears only after the ack.

## P2 3: FIFO ordering is advertised but never asserted

`test_capacity_shared_fifo_across_managers` proves capacity only: the third job waits for one of two to finish. Nothing checks that queued jobs start in submission order across managers.

- Rename that test to `test_capacity_shared_across_managers`.
- Add `test_queued_jobs_start_in_submission_order`:
  - capacity 1, with a release-file blocker;
  - queue B via manager `first`, then C via manager `second`;
  - release the blocker;
  - assert `started_at(B) < started_at(C)` and `started_at(C) >= finished_at(B)`.

This becomes a pure test if P2 4 lands.

## P2 4: Private `_spawn_worker` monkeypatching → extract a pure reconciliation planner

Four tests stub `manager._spawn_worker` so they can hand-edit durable state before a replacement manager reconciles:
- `test_host_boot_mismatch_is_retained_and_holds_capacity`;
- `test_reservation_recovers_when_manager_dies_before_worker_fork`;
- `test_unknown_admission_state_cannot_authorize_launch_or_cleanup`;
- `test_unknown_supervisor_state_cannot_authorize_launch`.

The first does it by direct attribute assignment and manual restore (`manager_detached_test.py:334-340`), so the stub leaks into teardown if `launch()` raises.

What these tests pin is `_reconcile_locked`'s decision logic. Extract `plan_reconcile(entries: list[PoolEntry], capacity) -> ReconcilePlan(cancel, ensure_worker, admit)` over frozen dataclasses. `_reconcile_locked` then only reads from disk and applies the plan. Rewrite the four tests plus the P2 3 FIFO case as direct planner tests:
- foreign host or unreadable phase holds a slot and is never admitted;
- a `launching` entry goes to `ensure_worker`;
- order is `(submitted_at, job_id)`;
- capacity 0 admits everything.

Keep `test_manifests_reconciled_without_native_active_index` and `test_pool_capacity_coordinates_independent_server_processes` as the real-process wiring tests. At minimum, switch the manual swap to `monkeypatch`.

## P2 5: Docker tests monkeypatch around an existing seam; one breaks the loop with a fake `time.sleep`

`docker_command()` already honors `connection_configuration["docker_cmd"]`. Add a `fake_docker` fixture: an executable script in `tmp_path` that logs argv to `docker.log`, serves `inspect.json` or a canned stderr with exit 1, and on `kill`/`rm` flips the state to `exited`.

Use it in:
- `test_owned_daemon_container_stops_after_wrapper_exits`. This replaces the `inspect_container`/`call_docker` lambdas and the `state` dict. Assert from the log that every action targets `immutable-owned-id`.
- `test_unknown_container_never_authorizes_result`. This replaces `worker.time.sleep = Mock(side_effect=RuntimeError)`. Run the worker as a subprocess against a daemon-error fake, wait for `LIVE_FILE.phase == "retained"`, and assert no result, the same pattern as `test_unknown_fork_window_never_replays`.

For the parametrized `inspect_container` cases, either use the fake, or replace `SimpleNamespace` responses with `subprocess.CompletedProcess`. A nicer option is to split out a pure `classify_inspection(info, name, container_id, expected_mount)`.

## P2 6: Entry-point callback payload is never asserted

`test_entry_points_retry_callback_and_never_log_credentials` and `test_revoked_entry_point_callback_is_not_retried` mock `urlopen` with a hand-built context manager. They never check the POSTed body, method, or `Content-Type`. Replace the mock with a `callback_server` fixture: `ThreadingHTTPServer` on `127.0.0.1:0` with scripted status codes, recording requests. Assert:
- the body equals `{"container_runtime": {"8888": {"tool_port": 8888, "host": "127.0.0.1", "port": 34567, "protocol": "http"}}}` (JSON turns the int key into a string; Galaxy consumes it);
- `Content-Type: application/json`;
- the request count stays at 2 after a published retry;
- revoked statuses (403/410) produce exactly 1 request.

The worker never logs, so the "never log credentials" wording overclaims. Rename it to `..._never_persist_callback_in_live_record`, and assert on the real `LIVE_FILE`.

## P3 1: `test_policy_is_snapshotted_and_enforced` doesn't test the snapshot

Either rename it, or overwrite `configs/detached_execution.json` with a no-limit policy after `launch()` and assert the walltime still fails the job. Also assert that `manager.job_stderr_contents(job_id)` contains `b"Detached execution: Execution exceeded walltime limit"`; that suffix is otherwise untested.

## P3 2: Untested `launch()` container-config and entry-point fallback branches

- Add `test_container_config_snapshotted_into_manifest`. Write `configs/container_config.json` with no containers. Assert the manifest's `entry_point_config` equals the written config, and that `working/import` and `working/tmp` exist.
- Add pure tests for `publish_entry_points` without a callback (writes `container_runtime.json`).
- Add pure tests for `_entry_point_host`: `0.0.0.0` with and without `get_ip_method`, and `::` skipped.

## P3 3: Duplicate `wait_for` and `SimpleNamespace` fixture in `detached_worker_test.py`

- Use `test.test_utils.wait_for` instead of the local copy.
- Replace the `execution` fixture's `SimpleNamespace` and module-level `result`/`command`/`stop` helpers with a `DetachedExecution` dataclass carrying those methods.
- Build `stop()`'s record with `worker._base_record(manifest)`.

## P3 4: Repeated local fakes and in-function imports in `manager_detached_test.py`

- Replace the two local `class App` definitions with one module-level `@dataclass StagingOnlyApp(staging_directory: str)`.
- Extract a `BlockingPrepare` helper class (`entered`, `release`, `calls`) for the three tests that hand-roll a blocking `_prepare_run` wrapper.
- Move the in-function imports to module top: `shutil`, `subprocess`, `threading`, `ManagerProxy`, `stateful`, `StatefulManagerProxy`.

## P3 5: Signal `Mock`s → recording fakes (keep the guard)

In `test_pid_reuse_does_not_authorize_process_group_signalling` (`os.killpg`) and `test_host_boot_mismatch_neither_executes_nor_signals` (`signal_command`), replace `Mock()` with a small recording callable and assert `calls == []`. Keep both: the first protects pytest's own process group if the code regresses, and the second backs the "nor signals" claim.

## P3 6: Split or simplify two worker tests

- Split `test_aggregate_directory_limit_requires_separate_explicit_policy` into:
  - an `exceeded_limit` enforcement test;
  - a `_validate_limits` paired-field test.
- Make `test_native_output_limit_is_per_file_not_total_job_output` a direct `exceeded_limit` assertion instead of spawning a supervisor. The end-to-end limit path is already covered by `test_output_limit_is_enforced_without_galaxy`.
