# Thermo review — pulsar#571

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `a08303706ea4b66fc46b5f03a5016b355e0e1414` (base `origin/master`, merge-base `94575c7eb4be`)
- Scope: implementation (~400 lines across `pulsar/`), tests skimmed for structure only. Code not run.

## Verdict

Not approvable as structured. The EngageQueue adapter itself (`pulsar/managers/util/cli/job/engagequeue.py`) is reasonably contained, but the semantics it needs (idempotent submit, lookup-only recovery, confirmed cancellation, per-job resource overrides, UUID ids) are not expressed through the existing `BaseJobExec` / `ExternalBaseManager` abstractions. Instead they're `getattr(..., False)` capability probes and one plugin-name string compare, scattered through `queued_cli.py` (6 sites) and `stateful.py` (3 sites). Collection ack is also inlined into `BaseManager.clean()` as three bare metadata strings plus a lock. No file crosses 1k lines (`stateful.py` 846, `base/__init__.py` 542). The `LocalShell` `p.poll()` fix is a real generic bug fix and is in the right layer.

## Findings

### P1 1 — EngageQueue capabilities leak into generic managers as getattr probes and a plugin-name check

`CliQueueManager` now branches on plugin identity and duck-typed flags:

- `__init__`: `if kwds.get("job_plugin") == "EngageQueue": kwds.setdefault("assign_ids", "uuid")` hard-codes one plugin's name in the generic CLI manager.
- `getattr(job_interface, "idempotent_submission", False)` appears 5 times (`recoverable_submission`, the submit-param override, two submit-failure branches, `_register_external_id` wrapping), and `getattr(job_interface, "confirms_cancellation", False)` gates a whole second `get_status` implementation.
- `_recover_active_job` probes `getattr(job_interface, "recover_submission", None)` and then calls `submission_missing` / `parse_return_code` unconditionally — methods only `EngageQueue` defines.
- `StatefulManagerProxy` probes `getattr(self._proxied_manager, "recoverable_submission", False)` 3 times.

`idempotent_submission` and `confirms_cancellation` are always set together by the sole implementer, and the `confirms_cancellation` branch of `get_status` also does lookup-recovery (an idempotent-submission concern), so there are two names for one capability.

Fix: make the contract explicit on the existing base classes so the probes and the name check go away:

- On `BaseJobExec`: one class attribute (e.g. `recoverable_submission = False`), `default_assign_ids = None`, and default hooks `recover_submission(script_file) -> None`, `submission_missing(result) -> False`, `parse_return_code(stdout) -> None`. `EngageQueue` overrides them.
- `CliQueueManager.__init__` resolves the plugin class (via `CliInterface.cli_job_interfaces`) and applies `default_assign_ids` from it instead of comparing names.
- Declare `recoverable_submission = False` on `BaseManager` / `ManagerInterface`, so `stateful.py` reads a typed attribute instead of `getattr`.
- Optional larger move, which the design reviewer may take on: put the recoverable launch/status flow (`launch` failure handling, the second `get_status`, `_recover_active_job` override) in a `CliQueueManager` subclass, or a strategy object chosen once at construction, so the legacy path keeps its original shape and no per-call branching is needed.

### P2 1 — Per-job resource override allowlist hard-coded in `queued_cli.launch`

```python
for name in ("cpus", "memory_mb", "timeout", "output_limit"):
    if name in submit_params:
        job_interface.params[name] = submit_params[name]
```

These are EngageQueue's option names, but they're listed in the generic manager and applied by mutating `job_interface.params` from outside. Move the allowlist onto the plugin, either as `submit_param_overrides = (...)` on `BaseJobExec` (default `()`) or as an `apply_submit_params(submit_params)` hook. Then `launch` makes one unconditional call, and other CLI plugins (e.g. Slurm's `argmap`) can use the same mechanism later instead of accreting more lists here.

### P2 2 — `queued_cli.get_status` re-implements `ExternalBaseManager.get_status` and leaves two status paths

The new `get_status` covers external-id lookup, cancel redelivery, the status command, return-code reconciliation and cancelled mapping. That duplicates the base `get_status` → `_get_status_external` template, which still exists for other plugins. It also changes the base ordering (base returns CANCELLED as soon as cancel is recorded; the new path polls until the executor confirms). The return-code write is a side effect inside a status getter, and `self._was_cancelled(job_id)` is called twice.

Fix: keep a single template in `ExternalBaseManager.get_status` with small overridable steps, e.g. `_resolve_external_id(job_id)` (default: current LOST behavior; recoverable: lookup, else QUEUED), `_cancelled_status(job_id, external_id)` (default: CANCELLED; recoverable: redeliver, then keep polling), and `_get_status_external`, which reconciles the return code. The divergent behavior then sits in named hooks, not in a parallel 45-line method gated by a flag.

### P2 3 — `_handling_of_preprocessing_state` and `recover_active_jobs` gain flag-gated branches; one marker is write-only

In `stateful.py`:

- `_handling_of_preprocessing_state` adds a `recoverable_submission` local, a pre-dispatch lock/activate/marker block, a conditional re-activate after launch, a new `except SubmissionUncertain` arm, and a conditional `deactivate_job` in the generic `except`. That function was already the busiest in the file.
- `recover_active_jobs` writes `store_metadata(JOB_FILE_PREPROCESSED, True, atomic=True)` identically in both the `try` and the `except` arm, each behind its own `getattr`.
- `"submission_uncertain"` is written in the new `except` arm but never read anywhere in `pulsar/` or `test/`. It's also a bare literal, while its sibling got a `JOB_METADATA_SUBMISSION_STARTED` constant.

Fix:

- Extract the pre-dispatch block into one helper (e.g. `_begin_recoverable_dispatch(job_id, job_directory) -> bool`).
- Hoist the duplicated `PREPROCESSED` write out of the try/except in `recover_active_jobs`, so the recoverable case reads `try: recover; except: log; if not recoverable: handle_problem`.
- Either drop `submission_uncertain` or give it a constant and a reader (e.g. surface it in status/diagnostics).

### P2 4 — Collection-ack lifecycle inlined into `BaseManager` with bare metadata keys

`BaseManager.clean`, `require_collection_ack` and `acknowledge_collection` together implement a small state machine: required → clean-requested / acknowledged → deleted. It's spread over three string literals (`"collection_ack_required"`, `"collection_acknowledged"`, `"collection_clean_requested"`), a staging-root lock, and a restructured `clean()` that now checks `job_directory.exists()` in two branches. Other job metadata names in Pulsar are module constants (`JOB_FILE_*` / `JOB_METADATA_*` in `stateful.py`).

Fix: move this into a focused module (e.g. `pulsar/managers/collection_ack.py`) that owns the constants, the lock path, and `request_clean(job_directory, delete) / acknowledge(job_directory, delete, debug) / require(job_directory)`. `BaseManager` then delegates with one-liners. With an early return, `clean()` reads linearly:

```python
if not job_directory.exists():
    return
if not job_directory.has_metadata(COLLECTION_ACK_REQUIRED):
    self._delete_job_directory(job_directory)
    return
with self._collection_lock(): ...
```

This also gives the design reviewer a clean seam if collection ack should become a proxy-level concern rather than a `BaseManager` one.

### P3 1 — New manager methods aren't on `ManagerInterface`; proxies use `*args, **kwargs`

`routes.setup` and `StatefulManagerProxy.preprocess_and_launch` call `manager.require_collection_ack(...)`, and the route calls `manager.acknowledge_collection(...)`, but `ManagerInterface` doesn't declare either. `ManagerProxy` forwards them with `*args, **kwargs`, and `acknowledge_collection` returns `bool` but always returns `True`. Fix: declare both on `ManagerInterface` with real signatures (`job_id: str`). Make `acknowledge_collection` return `None` and have the route return the constant `{"acknowledged": True}`, or return a value that actually varies.

### P3 2 — Four truthiness idioms for the same config/flag parsing

The PR uses `asbool(...)` (client, setup_handler, routes), `str(x).lower() == "true"` (`stateful.py` setup_params check; `engagequeue.py` `attach_only`, `require_hard_limits` and `cancel_wait`), and `response.get(...) is not True` (client). `galaxy.util.asbool` is already the canonical helper (used in `managers/base/directory.py`). Use it throughout.

### P3 3 — Platform imports buried in `interprocess_lock`

`pulsar/locks.py` imports `msvcrt` / `fcntl` inside the function with no comment. Move them to a guarded module-level import (`if os.name == "nt": import msvcrt else: import fcntl`), or add a one-line comment saying why they're deferred. The new `import errno/os/time/contextmanager` block also sits below the `TYPE_CHECKING` block, apart from the file's other imports. Merge them into the top import group.

### P3 4 — `_kill_external` now raises on nonzero for every CLI plugin

This is a generic behavior change made for EngageQueue's confirmed-cancel semantics. `ExternalBaseManager.kill` catches the exception, so Slurm/PBS/Torque now log a full exception trace whenever `scancel`/`qdel` exits nonzero (e.g. the job already finished). Raise only for plugins that set the confirmed-cancel capability (see P1 1), or log at warning level in the generic path. (Reported, not investigated further, per profile.)

## Notes (not findings)

- `LocalShell.execute` switching from `check_pg` to `p.poll()` fixes a real exit-status loss for all CLI plugins, and it has a focused regression test in `test/cli_test.py`. It's in the right layer and could stand alone as its own small PR.
- `interprocess_lock` is a reasonable new reusable primitive next to `LockManager`. It's preferable to a bespoke lock inside `BaseManager`.
- Test layout is fine at this size: real-executor tests are gated with `importorskip`, and the optional-import test protects plugin discovery. The two embedded subprocess scripts in `test/engagequeue_cli_test.py` are dense, but they're there to simulate a crash.
