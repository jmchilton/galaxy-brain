# PR #571 initial review: default profile

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `a08303706ea4b66fc46b5f03a5016b355e0e1414` (merge-base `94575c7eb4be`)
- Scope: correctness, reuse of existing abstractions, sibling-path consistency (client types), typing. The design questions (new manager vs `queued_cli`, how much collection ack covers) belong to the other reviewer.
- No tests run. The worktree has no `.venv` and `engagequeue` isn't installed. All findings come from reading the code.

## Verdict

The `LocalShell` exit-status fix is a real bug fix that helps every CLI plugin. The rest of the EngageQueue adapter is carefully reasoned. Two correctness problems need attention before merge:

- Collection ack "confirmation" is fabricated on every client that sets up locally (all MQ, relay and CLI clients, and HTTP `JobClient` with a local `job_directory`).
- A submit command that runs to completion and is definitely rejected gets treated as an uncertain submission, so the job stays `queued` forever and the error is never surfaced.

The new behavior is also wired in through about a dozen `getattr(..., False)` probes instead of declared capabilities on `BaseJobExec` and the manager interface.

## Findings

### P2 1: Collection ack opt-in is self-confirmed on local-setup clients; MQ, relay and CLI clients have no ack path

`BaseJobClient.setup` raises if the response lacks `require_collection_ack: True`, but `LocalSetupHandler.setup` (`pulsar/client/setup_handler.py:95`) writes that key into its own locally built `job_config`. So the check only means something on the `RemoteSetupHandler` (HTTP, no `job_directory`) path. Elsewhere:

- **MQ, relay and CLI clients** (`MessageJobClient`, `RelayJobClient`, `MessageCLIJobClient`, all `BaseRemoteConfiguredJobClient`, which always set up locally): `setup(require_collection_ack=True)` succeeds, and `_setup_params_from_job_config` sends the flag. The server's `preprocess_and_launch` then marks the job ack-required. But `BaseMessageJobClient` has no `acknowledge_collection` (calling it raises `AttributeError`), and `bind_amqp`/`bind_relay` have no matching message. Server-side `clean` is also never reached on these transports: `BaseMessageJobClient.clean` only drops the status cache. The opt-in is inert there, yet the client is told the contract holds.
- **HTTP `JobClient` with a local `job_directory`**: confirmation is again local. Against a server that predates this PR, `submit` ignores `setup_params.require_collection_ack`, and `client.clean()` deletes staging before import. That is exactly what the protocol says it prevents. `docs/collection_ack.rst` only says to "configure such clients against a server supporting the advertised protocol". The client is never checked against `system_properties.collection_ack`, because local setup never sees the server's system properties.

Per REVIEW_FOCUS ("prefer rejecting unsupported input"), fail fast instead:

- Only `RemoteSetupHandler` responses should count as confirmation. `LocalSetupHandler` should not echo `require_collection_ack` back as if the server had confirmed it.
- `BaseRemoteConfiguredJobClient.setup` should raise when `require_collection_ack` is requested, until a message type exists for it.
- For local-setup HTTP `JobClient`, either reject the opt-in or confirm it through the `submit` response.

Separately, no test covers the `setup_params` → `submit_job` → `preprocess_and_launch` → `require_collection_ack` path. `test_local_client_setup_opt_in_and_ack_route` and the HTTP test both go through `RemoteSetupHandler` setup only. Add one test with a client that has a `job_directory` (local setup), launching through submit.

### P2 2: A definitely rejected submit becomes "uncertain" and the job stays `queued` indefinitely

`CliQueueManager.launch` (`pulsar/managers/queued_cli.py`): for an `idempotent_submission` plugin, any `cmd_out.returncode != 0` goes straight to `self._recover_active_job(job_id)` and returns. The base lookup has no external ID, so the adapter runs `engagequeue lookup`. If the executor rejected the submission, nothing was accepted, the lookup returns `3`, and the code raises `SubmissionUncertain`. `_handling_of_preprocessing_state` catches that, marks the job `preprocessed` plus `submission_uncertain`, and leaves it active. After that, every `get_status` re-runs lookup, gets `3`, and returns `QUEUED` (`get_status`, the `not external_id` branch).

Examples of rejections that complete:

- a backend that can't honor `--require-hard-limits`
- an unknown `--pool`
- a malformed `container_spec`
- a non-numeric `cpus`/`memory_mb` arriving through the allowlisted `submit_params`

Each turns into a Galaxy job that waits forever. The submit `stderr` is discarded on this branch; the `log.warning("Failed to submit job ...")` sits after the early return. The PR description deliberately keeps a missing lookup nonterminal because the original submit process might still accept later. That reasoning covers a timed-out or killed submit (`TIMEOUT_RETURN_CODE`), not one that exited on its own with a rejection status.

Fix: treat only transport-uncertain results (timeout/kill, or a code the adapter classifies as uncertain) as `SubmissionUncertain`. Add an adapter hook alongside `submission_missing`, e.g. `submission_rejected(result)`, and raise a normal exception for definite rejections, so the job reaches `preprocessing_failed` with the stderr. Always log `cmd_out.stderr` on this branch. Add a test that submits with an option the executor rejects and expects a terminal failure. Not verified at runtime: EngageQueue's submit exit codes for validation errors need confirming with the executor.

### P2 3: Capabilities wired through `getattr` probes instead of declared interfaces

The PR adds these undeclared attributes, probed with `getattr`/`hasattr`-style defaults:

- **On the CLI job interface:** `idempotent_submission`, `confirms_cancellation`, `recover_submission`, `submission_missing`, `parse_return_code`.
  - `queued_cli.py` has 6 probes. `get_status` calls `job_interface.parse_return_code` and `launch` calls `job_interface.submission_missing`, unguarded; that only works because `confirms_cancellation` and `idempotent_submission` happen to be set together.
- **On the manager:** `recoverable_submission`, probed 5 times in `stateful.py` via `getattr(self._proxied_manager, ..., False)`.
- **New manager operations:** `require_collection_ack` and `acknowledge_collection` are added to `BaseManager` and `ManagerProxy` but not to `ManagerInterface`.

Declare them instead:

- Give `BaseJobExec` (`pulsar/managers/util/cli/job/__init__.py`) class-level defaults: `idempotent_submission = False`, `confirms_cancellation = False`, plus no-op or `NotImplementedError` methods with type hints.
- Put `recoverable_submission` on `BaseManager` (default `False`) and the two ack methods on `ManagerInterface`.

This turns duck-typing into typed capabilities, makes the two flags independent, and leaves a reusable abstraction for the next scheduler plugin that wants lookup-only recovery.

### P3 1: Reimplements `asbool` with `str(...).lower() == "true"`

The same PR imports `galaxy.util.asbool` in `client.py`, `setup_handler.py` and `routes.py`, but hand-rolls the check in `stateful.py` (`preprocess_and_launch`) and in `engagequeue.py` for `attach_only`, `require_hard_limits` and `cancel_wait`. The hand-rolled check rejects `"yes"`, `"1"` and `"True "`, which `asbool` accepts. Use `asbool` throughout.

### P3 2: `assign_ids` is only defaulted to `uuid`; overriding it reuses submission keys across attempts

`CliQueueManager.__init__` uses `kwds.setdefault("assign_ids", "uuid")`. `EngageQueue.submission_key` hashes the resolved script path and relies on UUID directories, as its own comment says. If an operator sets `assign_ids: galaxy` (or `galaxy_prefixed`), a Galaxy job resubmitted under the same job id, or a re-setup after `clean`, produces the same key. EngageQueue's idempotent submit would then hand back the earlier attempt, for example the failed one being resubmitted with more memory. Reject a non-`uuid` `assign_ids` for this plugin at manager construction instead of silently allowing it.

### P3 3: `_kill_external` now raises for every CLI plugin

`CliQueueManager._kill_external` raises `RuntimeError` on any nonzero `delete` status. The motivating caller (`get_status` cancellation retry) is EngageQueue-only, but `ExternalBaseManager.kill` is shared, so Slurm, PBS and Torque now emit `log.exception` tracebacks for routine cases such as `qdel` on an already-finished job. Scope the raise to `confirms_cancellation` plugins, or have `kill()` log a one-line warning for this case.

### P3 4: Write-only `submission_uncertain` marker and an unlocked metadata write

In `_handling_of_preprocessing_state`, the `except SubmissionUncertain:` branch stores `JOB_FILE_PREPROCESSED` and `"submission_uncertain"` without `job_directory.lock("status")`; the sibling writes in the same function take that lock. Nothing reads `"submission_uncertain"`. Either take the lock and use the marker (for example, expose it in `full_status` for operators, since the docs say persistent uncertainty "requires operator inspection"), or drop it. If it stays, make it a module constant like `JOB_METADATA_SUBMISSION_STARTED`.

### P3 5: Minor code and test nits

- `pulsar/locks.py` `interprocess_lock`: `msvcrt` and `fcntl` are imported inside the function with no comment. Platform-conditional imports are reasonable; add a one-line comment. The Windows branch has no test.
- `test/collection_ack_test.py::test_generic_guard_coordinates_independent_manager_instances`: managers have no `app` attribute, so `manager.app if hasattr(manager, "app") else _app_for(manager)` always takes `_app_for`. Drop the dead branch.
- `test/engagequeue_cli_test.py`: `from galaxy.util.bunch import Bunch` (twice) and `import os`/`import shutil` sit inside test functions. Move them to module top.

## Notes (not findings)

- **`LocalShell` fix:** `check_pg` called `waitpid(-pgid)` and reaped the child, so a later `Popen.poll()` reported `0`. Switching to `p.poll()` fixes swallowed nonzero exits for every CLI shell user. `waitpid(-pgid)` only ever reaped direct children, so nothing is lost on process-group semantics. It's worth its own changelog line or a split PR, since it changes behavior for existing Slurm/PBS users whose submit failures were previously reported as success.
- **Advertised capability:** `system_properties()` now always adds `collection_ack: {"schema": 1}`. This is harmless for existing consumers, but only `RemoteSetupHandler` clients can ever see it (ties into P2 1).
- **Locking:** `BaseManager.clean` takes the staging-root lock only for ack-required jobs. The non-ack path is unchanged and unlocked, which keeps legacy behavior.
