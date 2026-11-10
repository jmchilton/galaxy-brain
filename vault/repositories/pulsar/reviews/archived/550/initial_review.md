# Initial review — pulsar#550 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, low effort
- Reviewed commit: `324522637c196af357cdffadb2f07a81e939d90c` (base `master` @ `a48a0a7`)
- Companion Galaxy PR: galaxyproject/galaxy#24378 (not reviewed here)

## Verdict

Carefully engineered, well-tested (91 new tests pass locally on macOS in ~21s), and opt-in: existing managers are untouched except a capability-gated branch in `StatefulManagerProxy`. Main concerns are staging-directory lifecycle gaps (directories that can never be cleaned) and how the new contract is wired into the generic proxy layer (capability-dict sniffing, unguarded forwarders). No P1s found at this effort level.

## Findings

### P2 1: Attempts without a manifest are never cleaned

`DetachedLocalManager.clean()` returns early when no manifest exists (`pulsar/managers/detached.py:508-510`). A manifest is written only in `launch()` or `confirm_cancelled_before_launch()`. Jobs that fail in preprocessing (staging error, `_check_execution_with_tool_file` failure, dependency-resolution exception before `_new_manifest`) or that are set up and then cleaned without a submit keep their whole staging directory forever. `StatefulManagerProxy` does not override `clean`, so `ManagerProxy.clean` hits this path directly. No test covers `clean` on a manifest-less attempt.

Suggested fix: when no manifest exists and no preparation lock is held (take `_preparation_lock` non-blocking or under the pool lock), fall back to `super().clean(job_id)`. If the "setup then Stop with no submit remains uncertain" rule in the docs is intended to cover this, at least clean when `JOB_FILE_PREPROCESSING_FAILED` is recorded, since the proxy has proven preprocessing stopped. Add a red-to-green test through `StatefulManagerProxy` with a failing preprocess.

### P2 2: Terminal-but-unacknowledged attempts accumulate with no expiry, and are re-scanned every poll

Deletion needs both `CLEAN_FILE` and `ACK_FILE` (`_maybe_clean_locked`). Any client that never acks (an unmodified Galaxy, a Galaxy that deletes a job and has nothing to import after a cancel, or a failed import that is never retried) leaves the attempt on disk with no retention policy or admin purge path. The docs say unmodified Galaxy doesn't implement the contract, but nothing stops it from being configured. Each such attempt is also reloaded by every manager's housekeeper every `poll_interval` (default 0.5s) under the pool flock (`_reconcile_locked` globs `*/manifest` and calls `_write_return_code_if_unset` / `_maybe_clean_locked` on each). Cost grows with retained attempts.

Suggested fix:
- Decide and document what a client must do after a cancel (does Galaxy#24378 ack cancelled attempts?).
- Consider an opt-in retention (e.g. `uncollected_retention_seconds`) or a CLI/admin purge.
- Skip already-reconciled terminal attempts in the hot loop (e.g. a marker file or an in-memory set keyed by token).
- If a client never calls `acknowledge_collection`, consider refusing jobs or logging a clear warning when `clean` arrives without the capability being used.

### P3 1: Generic proxy sniffs a capability dict rather than using a manager hook

`StatefulManagerProxy._supports_detached_cancellation()` calls `system_properties()` and inspects `["detached_local"]["schema"] == 1` on every preprocess exit and every `PREPROCESSING` status poll (`pulsar/managers/stateful.py` new lines ~299-302, ~380). It ties the generic proxy to one manager type's wire-capability payload. A small base-manager hook (e.g. `supports_confirmed_cancellation`, default `False`, overridden in `DetachedLocalManager`) would be a reusable abstraction other managers could adopt. `system_properties()` can keep advertising it to clients.

### P3 2: `ManagerProxy` forwarders and new route fail with 500 on other managers

`ManagerProxy.acknowledge_collection` / `confirm_cancelled_before_launch` (`pulsar/managers/__init__.py`) forward unconditionally. On any other manager type, `PUT /jobs/{id}/collection` raises `AttributeError` and returns a 500. Either add no-op/`NotImplementedError` defaults on the base manager, or have the route return a clear 4xx/"unsupported" response. The capability gating then degrades cleanly.

### P3 3: The stateful recovery path writes status metadata without the status lock

In `StatefulManagerProxy.get_status`, the new detached-cancel recovery branch calls `store_metadata(JOB_FILE_PREPROCESSED…)` and `store_metadata(JOB_FILE_FINAL_STATUS…)` without `job_directory.lock("status")`. `_record_launch_accepted` (which races with it) takes that lock. Wrap these writes in the same lock for consistency.

### P3 4: `DetachedLocalManager` inherits the unqueued `Manager` but overrides its whole runtime

It subclasses `unqueued.Manager` only for `_prepare_run`. It overrides `launch`, `get_status` and `kill`, and inherits the unused PID/monitor/job-lock machinery. `_prepare_run` also records `JOB_FILE_SUBMITTED`, which is never cleared. Subclassing `BaseUnqueuedManager` (which owns `_prepare_run`) would make the contract clearer. This needs a stub `_monitor_execution`, or a move of that abstractmethod.

### P3 5: Minor reuse/consistency nits

- `num_concurrent_jobs` parsing (`concurrent_jobs()`) duplicates and diverges from `queued.py` (`multiprocessing.cpu_count()` vs `os.cpu_count()`; `0`/`null` = unlimited only here). Consider sharing a helper so the two managers interpret the same option the same way.
- `root / "configs" / ...` hardcodes the directory; use `job_directory.configs_directory()` / `JOB_DIRECTORY_CONFIGS`.
- `test/manager_detached_test.py` imports `pulsar.managers.stateful` inside test functions (lines ~611, 644). Move them to module level.

## Notes (not findings)

- `psutil` becomes required at runtime by the copied worker. It is already in `requirements.txt` → `install_requires`, so packaging is fine.
- The worker is copied into each job directory and runs standalone (must not import `pulsar`). It reimplements docker invocation (`docker_command`) rather than reusing Galaxy's container code. That is acceptable given the standalone constraint, but worth a comment pointing to the constraint.
- Execution policy / container / entry-point configuration is read from client-staged `configs/` files. This is within Pulsar's existing trust model (the client already supplies the command line).
