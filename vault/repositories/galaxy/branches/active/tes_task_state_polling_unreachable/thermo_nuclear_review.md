Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: tes_task_state_polling_unreachable

I reviewed `fdb30869fa8..c0d2174aeaf` and acted on the main finding: the cancel retry loop modeled a per-server schedule with per-cancel state plus two patches. The retries now back off per TES server, in a new `lib/galaxy/jobs/runners/util/tes_cancel_retries.py` (`TesCancelRetries`, 130 lines). The runner keeps only the requests and the logging. Commit `d227883227f` ("Back off TES cancel retries per server in their own module"); head is now `d227883227f`. The branch's `pulsar.py` diff drops from +274 to +183 lines. The rewrite also fixed a request-count leftover from the performance pass: a cancel added while its server was already backing off still asked the server on its own schedule. A new test covers it. I made no other changes. No security findings.

Tests: 127 pass (126 existing plus `test_cancel_added_while_its_server_backs_off_waits_for_the_servers_next_attempt`) across `test_pulsar_tes_task_checks.py`, `test_pulsar_runner.py` and `test_runner_pulsar.py`. mypy reports the same 67 errors in `pulsar.py` as before and none in `tes_task.py` or the new module. black and isort are clean. ruff and flake8 aren't installed in the worktree's `.venv`.

## Not acted on

- **`pulsar.py` is 1997 lines (1833 on the parent).** It was over 1k before this branch, and the parent's review kept `PulsarTesJobRunner` in `pulsar.py` on a release branch. Taking the retry scheduling out was the split this branch could make on its own.
- **`poll` now means two things: "run the monitor thread" and "check tasks".** With checks off and retries on, the monitor runs only for the retries, so `check_watched_item` returns early and `_update_job_state_for_status` re-checks `tes_status_check_interval`. Removing those two conditionals would need a separate thread or timer for the retries, which is more machinery than two guards.
- **Retries stall while the monitor's database check fails.** `check_watched_items` runs the retries after `super().check_watched_items()`, and `monitor()` skips the whole call when `check_database_connection` raises. The retries don't need the database. A DB outage that overlaps a TES outage is rare, and reordering would change which failure stops a sweep, so I left it. Worth knowing if both outages are ever seen together.
- **`_check_tes_server_unreachable` still sets `stop_job = False` and adds the cancel inline.** After the rewrite this is five lines plus a log, and `_check_tes_task` already uses the same `stop_job = False` move. A helper used once would only move them.
- **Two different warnings for queueing a cancel** ("Could not reach the TES server to cancel the task…" from a stop, "Will cancel the TES task once its server answers…" from the unreachable check). They describe different events. A test pins the first.
- **`f"{reason}: {error}"` is built in two places** (`_cancel_tes_task`, `_check_tes_server_unreachable`). It's one f-string. Moving it into `tes_server_unreachable_reason` would change that helper's contract for its other caller.
- **`_cancel_tes_task(job_id_tag, task_id, destination_params, cancel, attempt)`.** Five arguments, because the first attempt goes through Pulsar's `client.kill()` and retries go straight to TES. Using the direct TES cancel for the first attempt too would change the parent's stop path.
- **The test clock patches `monotonic` in two modules.** That's the cost of moving the scheduling out. Injecting a clock into `TesCancelRetries` would need the runner to pass the module-global `monotonic` lazily so the existing patch still works, and that's less direct than a second `setattr`.

<details>
<summary>Full review</summary>

### Scope

`git diff fdb30869fa8..c0d2174aeaf`: `PulsarTesJobRunner` in `lib/galaxy/jobs/runners/pulsar.py` (`tes_unreachable_timeout`, `tes_cancel_retry_timeout`, `PendingTesCancel`, `_pending_tes_cancels` and its lock, `_add_pending_tes_cancel`, `_cancel_tes_task`, `_retry_tes_cancels`, `_tes_cancel_request`, `_check_tes_server_unreachable`, the shutdown log), `tes_server_unreachable_reason` in `util/tes_task.py`, two sample config options, and the tests.

### 1. Missed simplification: per-cancel backoff patched toward a per-server schedule (acted on)

`_retry_tes_cancels` was about 65 lines with five jobs in one loop: select the due cancels, dedupe requests per server in the sweep (`unreachable_servers`), give up, back off each cancel (`pending.delay`, `pending.next_attempt`), and a hold pass afterwards (`next_probes`) that pushed the server's other cancels to its next probe. The dedupe and the hold pass are two patches for one missing concept: the backoff belongs to the server, not to the cancel. Each was added after a request-count problem appeared (the dedupe in implementation, the hold pass in the performance pass).

The patches left a gap. The hold pass only pulled cancels *later* toward the next probe. A cancel added while its server was deep in backoff (next probe about 2 minutes away) was due 10 seconds later, asked the server alone, then again 20 seconds after that, until its schedule caught up. The performance debrief says "the server is asked once per backoff interval however many cancels it holds", and that isn't quite true. The new test reproduced two extra requests in a 2-minute window against the old code.

Fix: `TesCancelRetries` keeps `_ServerRetries(next_attempt, delay, cancels)` per `tes_url`. `retry_due(cancel)` tries each due server's cancels oldest first and stops at the first that comes back unreachable. It then doubles the server's delay (capped at 120 s) and clamps the next attempt to the earliest deadline among the server's remaining cancels. That keeps "the last attempt comes at the deadline", which `test_cancel_retry_gives_up_after_tes_cancel_retry_timeout` pins. Cancels past their deadline are returned for the runner to log. The dedupe dictionary, the hold pass, the per-cancel `delay`/`next_attempt` fields and the `TES_CANCEL_RETRY_*` constants in `pulsar.py` are gone. The schedule for one cancel is unchanged (10, 30, 70, 150, 270, 390… s), and so are the attempt counts in the give-up log (7 for a stop, 6 for a job failed as unreachable).

Behavior change: a cancel joining a server already in backoff waits for that server's next attempt (at most 120 s) rather than asking 10 s later. The docstring says so. The sample config's "10 seconds later, then at most 2 minutes apart" still holds.

### 2. Dead and silent-fallback code (acted on with 1)

- `except Exception: log.exception(...); error = pending.last_error` in the loop was unreachable. `_cancel_tes_task` never raises, and the request is built inside its `try`. Removed.
- `_add_pending_tes_cancel` parsed `TesJobParams` only to read `tes_url`, and fell back to `None` on any exception. The fallback couldn't fire on either path: the unreachable check had just parsed the same params, and a stop's `client.kill()` reached the network. `TesJobParams.tes_url` is the destination's `tes_url` key, and the destination defaults mark it required, so `PendingTesCancel.tes_url` now reads `destination_params.get("tes_url")`.
- `_tes_cancel_request`, a static method that returned a closure, folded into `_retry_tes_cancel`, the callback `retry_due` calls.

### 3. Boundary: retry state and locking out of the runner (acted on with 1)

The runner held a dict, a lock, and the knowledge of which thread touches what. All of it moved behind `add` / `discard` / `pending` / `retry_due`. The lock is taken for the selection and for recording each server's result, never across a request. A concurrent `discard` that empties a server mid-sweep makes `_record_attempt` a no-op. The module calls `time.monotonic` itself, and the test `clock` fixture patches it there as well as in `pulsar.py`.

### 4. `poll` serves two purposes (not acted on)

`self.poll = check_interval > 0 or cancel_retry_timeout > 0` keeps the monitor thread alive for retries, so two "checks off" guards follow: `check_watched_item` drops jobs immediately, and `_update_job_state_for_status` doesn't add watches nobody would remove. Each guard is a direct consequence and has a comment or test (`test_task_checks_off_leave_the_tasks_alone_but_still_retry_cancels`). The only way to delete them is a second thread or timer for the retries.

### 5. `_check_tes_server_unreachable` (lightly tidied)

It mixes the unreachable clock, the give-up decision, handing the cancel to the retries, and `fail_job`. After 1 the hand-off is a single `add` call. Splitting further would produce a helper used once.

### 6. File size

`pulsar.py` was 1833 lines on the parent and is 1997 now (2088 before this pass). It crossed 1k long before this branch. Moving `PulsarTesJobRunner` out was already declined on the parent for release-branch reasons. Taking out the scheduling, the one cohesive piece that doesn't need the runner, is the decomposition this branch could make.

### 7. Smaller notes

- The sample config comments match the behavior.
- `tes_server_unreachable_reason` belongs in `util/tes_task.py` next to `http_status_code`. It has a small contract, and the tests check it through the runner.
- Retries stall during a database outage, because `monitor()` skips `check_watched_items` when `check_database_connection` raises. See "Not acted on".

### Parent findings

None new. The parent's own review already covered the `pulsar.py` size and the `_kill_remote_job` signature.

</details>
