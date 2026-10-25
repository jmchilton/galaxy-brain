# Thermo review — pulsar#550 "Add a detached local job manager with restart recovery"

- Profile: [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `324522637c196af357cdffadb2f07a81e939d90c` (base `master`, merge-base `a48a0a7`)
- Scope: structure, reuse, refactoring. Code not run. Bugs not hunted.

## Verdict

Not approvable on structure yet. The new modules are carefully written, but the feature leaks into shared code in the wrong way. `StatefulManagerProxy` now sniffs a capability dict in three places, and `ManagerProxy`/routes gain duck-typed methods that only one manager implements. All persisted state is untyped JSON dicts, and the manager and worker modules each keep their own copy of the record helpers and validation. Most of that can go if the manager interface gets real hooks and one typed "attempt" object owns the on-disk records.

Size: `detached_worker.py` is a new 894-line module and `detached.py` is 537 lines. Neither crosses 1k, but the worker holds five separate concerns (see P2 3).

## Findings

### P1 1: Detached-specific capability sniffing scattered through the generic `StatefulManagerProxy`

`pulsar/managers/stateful.py` adds `_supports_detached_cancellation()` (L299), which reads `system_properties()["detached_local"]["schema"] == 1 and ["asynchronous_cancel"]`. Three places in the shared proxy branch on it:

- `_handling_of_preprocessing_state` cancel path (L263–275): a new try/except plus an early return.
- `_record_launch_accepted` (L304): two near-identical branches. The only difference is a `JOB_FILE_FINAL_STATUS` guard around `activate_job`.
- `_get_status` (L380): an extra `self._proxied_manager.get_status(job_id)` call, plus synthesized `PREPROCESSED`/`FINAL_STATUS` writes inside the `PREPROCESSING` branch. It rebuilds `system_properties()` on every status poll for every manager.

This is the pattern the thermo bar treats as a presumptive blocker: one manager's feature scattered as checks across shared code. The proxy also learns a manager's identity through a client-facing capability map, which is the wrong boundary. That map exists for Galaxy, not for in-process dispatch.

Suggested fix (code judo):
- Add a real hook to `ManagerInterface`/`BaseManager`, e.g. `confirm_cancelled_before_launch(job_id) -> bool`, returning `False` by default. The proxy always calls it on the cancelled path and records launch-accepted only when it returns `True`. The capability probe and the `if` disappear.
- Collapse `_record_launch_accepted` to the single guarded form. For managers that never write `FINAL_STATUS` before activation, the guard is a no-op, so one branch preserves behavior for everyone.
- In `_get_status`, the recovery belongs behind the same hook, or a `recover_preprocessing_status(job_id)` default that returns `None`. That replaces a capability probe plus a second status call in the hot path.

### P2 1: Optional methods added to `ManagerProxy` and the HTTP API without an interface contract

`ManagerProxy` (`pulsar/managers/__init__.py` L132–138) gains `acknowledge_collection` and `confirm_cancelled_before_launch` forwarders. `routes.py` exposes `PUT /jobs/{id}/collection`, and `JobClient.acknowledge_collection` targets it. None of these is declared on `ManagerInterface`. Any other manager raises `AttributeError`, which the route turns into a 500. The client docstring says "call only for managers advertising…", so the contract is enforced by a comment.

`confirm_cancelled_before_launch` on `ManagerProxy` is used only by a test (`test/manager_detached_test.py:634`). The stateful proxy calls the proxied manager directly.

Suggested fix: declare `acknowledge_collection` on `ManagerInterface`. Give it a `BaseManager` default: a no-op that returns `True`, since non-detached managers have nothing to retain. Then the route and client are safe against every manager. Drop the test-only `confirm_cancelled_before_launch` forwarder, or fold it into the P1 1 hook.

### P2 2: `DetachedLocalManager` extends the wrong base class

`DetachedLocalManager(Manager)` (`detached.py` L70) subclasses the unqueued PID-based `Manager`, then overrides `launch`, `get_status`, `kill`, `clean` and `shutdown`. It uses none of the PID, `_run`, `_monitor_execution` or job-lock machinery. What it actually needs is `BaseUnqueuedManager._prepare_run` plus the `DirectoryBaseManager` helpers. `_prepare_run` also writes `JOB_FILE_SUBMITTED` metadata that this manager never reads.

Suggested fix: the smallest change is to derive from `BaseUnqueuedManager` and stub its abstract `_monitor_execution`. The cleaner change is to move `_prepare_run` into `DirectoryBaseManager`, or a small mixin, so the `submitted` side effect stays with the unqueued managers. Either way, readers no longer have to check which inherited `Manager` behaviors are dead here. The Galaxy-optional `new_clean_env` shim in `unqueued.py` is now shared by two managers, so it belongs in `util/env.py`.

### P2 3: Untyped, duplicated on-disk record model split across manager and worker

All lifecycle state (manifest, live, command, start, exit, stop, result, clean, ack) is raw `dict` JSON with string phases. The helpers that guard it are duplicated with diverging rules:

- `_record` / `_base_record` exist in both `detached.py` (L172–184) and `detached_worker.py` (L115–131). The manager version also checks `schema == 1` and the worker version doesn't.
- Numeric validation lives twice: `detached._seconds` and the loop inside `worker._validate_manifest`.
- The manager calls the worker's private `_validate_manifest` (L153, L247).
- The worker writes the return code under both `return_code` and `returncode` (worker L704–705). The manager reads it back with `result.get("return_code", result.get("returncode"))` three times (L192, L396, L455), a compatibility alias for a schema that has never shipped.
- The supervisor phase vocabulary is written in the worker but enumerated as a literal tuple in the manager's `_ensure_worker` (L359–368). Manifest phases `queued`/`launching` are likewise string literals in both modules.
- `manifest["host_identity"] != worker.host_identity()` is repeated 7 times in `detached.py`.

Suggested fix: one `Attempt` (or `ExecutionRecords`) class in the worker module that owns `root` and `manifest`. It would provide `read(name)` (with schema and ownership validation), `write(name, **fields)` (with base record and atomic write), `terminal_result()`, `is_local_host`, and public `validate_manifest`. Add `TypedDict`s for manifest and result, and phase constants or `Literal`s next to their writers. Write one `return_code` key and drop `returncode`. The manager's `_record`, `_base_record`, `_terminal_result` and `_seconds`, and most of the `host_identity` comparisons, then disappear. The worker's `run()` result check and the manager's `_terminal_result` become the same method instead of two.

### P2 4: `detached_worker.py` is one 894-line module holding five concerns, with a ~170-line `supervise` loop

The single file holds:
- JSON persistence
- process identity and process-group signalling
- Docker inspect/kill/rm, plus a Docker CLI command builder
- interactive-tool entry-point discovery and HTTP callback publication, including `get_ip_method` command execution
- walltime and output-size limit enforcement
- the command gate and the supervisor state machine

`supervise()` (L676–843) is a closure-heavy loop that interleaves every one of those. `_stop_containers` takes eight positional parameters, which shows that state wants an object.

Being copied into each job directory as a single file (P3 2) is what pins it to one module. That is a packaging choice driving the code structure.

Suggested fix: split into a `pulsar/managers/util/detached/` package with `records`, `processes`, `docker`, `entry_points`, `limits` and `supervisor` modules. Make the supervisor a small class whose fields replace the closure-captured `snapshot`/`proc`/`last_container_action` state. If the single-file copy is kept, generate it from the package at launch, or run the worker with `python -m` (see P3 2).

### P2 5: The Galaxy↔Pulsar job-directory contract is an ad-hoc private JSON shape with magic fallbacks

`launch()` reads `configs/detached_execution.json` and `configs/container_config.json`, both written only by an out-of-tree Galaxy integration. Their shape is defined only in prose in `docs/job_managers.rst` and in the worker's validation code. Fallbacks in the contract hide the real data shape:

- `container_configuration.get("entry_point_config", container_configuration)` (`detached.py` L241–243)
- `entry_point_config` may be either a dict or a path that is re-read at runtime (worker L381–383)
- `expected_mount` may be a string or a mapping (worker L263–270)
- `policy.get("containers", [])` / `policy.get("limits", {})` defaults, applied on top of `{"schema": 1}` when the file is missing

Suggested fix: define the policy and container descriptor as typed models in `pulsar.client`, which Galaxy already imports for the Pulsar runner, so both sides share one versioned contract. Pick one shape for each of `entry_point_config` and `expected_mount` and reject the others at manifest validation. Per REVIEW_FOCUS, nothing has relied on the alternatives yet, so prefer rejecting them over supporting them.

### P3 1: `num_concurrent_jobs` parsing duplicates `QueueManager`'s with different semantics

`detached.concurrent_jobs` (L35) re-implements the `"*"` → CPU count handling in `QueueManager.__init__` (`queued.py` L44–51), using `os.cpu_count()` where the original uses `multiprocessing.cpu_count()`. It adds `null`/`0` = unlimited, which `queued_python` doesn't accept. Two managers now interpret the same documented option differently.

Suggested fix: extract one `parse_num_concurrent_jobs` helper, used by both managers. Either make the unlimited semantics shared or reject them explicitly in `queued_python`.

### P3 2: Copying the worker source into every job directory still depends on Pulsar's interpreter

`launch()` copies `detached_worker.py` into each job root and runs it with `sys.executable`. The docs say the execution identity must keep Pulsar's Python environment, including `psutil`, so the copy doesn't decouple the worker from the installation. It only pins the source version, which presumably keeps running jobs safe across a Pulsar upgrade. That rationale isn't stated anywhere, and the copy is the constraint that forces P2 4's single-file layout.

Suggested fix: either state the upgrade-isolation reason in one comment, or run `sys.executable -m pulsar.managers.util.detached_worker`. Running it as a module would allow a proper package and remove the per-job copy and its `chmod`.

### P3 3: A third process-group killer next to `util/kill.py` and `util/process_groups.py`

`signal_command` and `command_group_status` (worker L429–500) are a new identity-verified process-group signaller. They sit beside the existing `kill_pid`/`kill_pg` helpers but are neither related to them nor placed with them. The new version is stronger: it verifies creation time and never signals a bare PID.

Suggested fix: once the worker can import from a package (P3 2), move the identity-verified group helpers into `util/process_groups.py`. Then the safer primitive is available to the other local managers instead of living privately in one worker.

### P3 4: The "request stop" sequence is repeated in four places

These four places each write `STOP_FILE` and then, when `phase == "queued"` on the local host, call `_cancel_queued`:

- `launch` (L250–261)
- both branches of `_confirm_cancelled_before_launch_locked` (L302–315)
- `kill` (L482–488)
- `_reconcile_locked`'s queued branch

`_cancel_queued` itself writes `STOP_FILE` again first (L318), so every caller writes it twice.

Suggested fix: add one `_request_stop_locked(root, manifest)` that writes stop and settles a queued local attempt. Every caller becomes a single call, and the guard conditions can't drift apart. This fits naturally on the `Attempt` object from P2 3.

## Not flagged

- Tests: `manager_detached_test.py` drives the real manager and proxy end to end. `detached_worker_test.py` mostly runs real worker subprocesses. Its monkeypatching is confined to Docker CLI responses, `urlopen`, and `os.killpg`/`signal_command` for PID-reuse and host-mismatch cases, which are reasonable seams to fake. No trivial unit tests stood out.
- Imports are at module top level in both new modules.
- No security report: under tool-based authorization, every `configs/` file already goes through `authorize_config_file` before `launch` uses them, so the new policy files add no authorization path.
