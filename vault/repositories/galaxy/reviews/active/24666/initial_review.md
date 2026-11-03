# Initial review: default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `7587ed8a9ff` (head of galaxyproject/galaxy#24666, base `release_26.2`)
- Tests were not run. The worktree has no `.venv`, and the review did not bootstrap one.

## Verdict

Sound and narrowly scoped. Schema creation under `BEGIN IMMEDIATE` fixes the reported crash. The lease logic is correct for the cases the tests cover. I found no correctness bugs that block merge. Remaining findings are a restart-latency edge case, a small abstraction leak, and test fragility and coverage gaps. All are P3.

## Checked and not a finding

- **Renewal starvation.** Could the populator's writes starve lease renewal and let a waiter take over mid-populate? `SqlAlchemyToolSourceStore.store()` commits once per row, and `store_index` is one short blob write (`sqlalchemy.py` ~L336-471). The populator therefore holds the SQLite write lock only briefly, and the renewal thread does not stall out to `LEASE_TTL`.
- **Reuse of existing locking abstractions.** I looked for existing abstractions to reuse:
  - `galaxy.model.database_heartbeat` needs the Galaxy ORM, but the store must open without it.
  - `galaxy.util.filelock.FileLock` has no expiry and does not cover Postgres.
  
  A store-local lease row is reasonable.
- **SQLite datetime comparisons.** SQLAlchemy stores SQLite `DateTime` as fixed-width ISO strings with microseconds, so the SQL `expires_at < :now` comparison matches the Python one in `try_acquire`.
- **Mentioned in the PR, so not raised here.** The PR body calls these out explicitly:
  - `populate_store.py`, `reconcile_index` and watch mode do not take the lease.
  - The wait has no upper bound when a holder hangs but keeps renewing.
  - The TTL must exceed clock skew between hosts.

  One consequence of the unbounded wait: on reload it now happens inside `_get_new_toolbox` while that process holds `app._toolbox_lock`. Before this PR the process held the same lock while running its own populate, so this is not a regression.

## Findings

### P3 1: Restarting after a killed populate waits up to 120 s for a holder that no longer exists

`holder` is `host:pid:uuid8`, so a restarted process never matches the lease row its predecessor left behind. `try_acquire` then refuses until `expires_at` passes. The `finally: lease.release(...)` in `populate_once` does not run on SIGKILL, on OOM kills, or on Python's default SIGTERM handling. Gunicorn also SIGKILLs a worker that is still booting once the graceful timeout passes.

The common case is a single-process or dev Galaxy killed during its first long populate. The next boot stalls for up to `LEASE_TTL` (120 s). Meanwhile it logs "Waiting for another Galaxy process to finish populating", which is misleading when no other process exists.

Suggested fix: in `_SqlAlchemyPopulateLease.try_acquire`, also treat the lease as free in either of these cases:
- The stored holder's host equals `socket.gethostname()`, and its pid is either `os.getpid()` (a container restart that reused the pid) or no longer alive (`os.kill(pid, 0)` raises `ProcessLookupError`).
- Or, more cheaply, the log message names the holder string, so operators can see whose lease they are waiting on.

### P3 2: `coordination.py` catches SQLAlchemy exceptions while programming against the backend-neutral `PopulateLease` ABC

`populate_once` and `_wait_for_lease` are written against `interface.PopulateLease`, but they catch `sqlalchemy.exc.OperationalError` and `SQLAlchemyError`. This has two effects:
- The coordination module is tied to one backend.
- Any other `PopulateLease` implementation silently bypasses the "keep waiting on transient errors" and "populate anyway when the lease is unavailable" fallbacks.

Suggested fix: define small lease exceptions in `interface.py`, for example `PopulateLeaseUnavailable` and `PopulateLeaseBusy`. `_SqlAlchemyPopulateLease` would translate SQLAlchemy errors into them, and `coordination.py` would catch only those.

### P3 3: Sleep-ordered thread tests can flake, and some new branches are untested

**Races.** `test_uses_a_populate_another_process_completed_while_waiting` and `test_keeps_waiting_through_transient_database_errors` (`test_coordination.py`) start a waiter thread, `time.sleep(0.2)`, and then release the peer lease with `populated=True`. On a slow CI box the thread may read `last_populated_at()` only after that release. `_populated_since` is then False, the waiter populates, and `result == [False]` fails.

Fix: have the waiter signal a `threading.Event` once it is polling. For example, wrap the lease, as `_FlakyLease` already does, and set the event on the first `try_acquire` that returns False. The test then waits on that event instead of sleeping.

`test_toolbox_waits_for_a_peer_populating_the_store` (`test_cached_tool.py`) uses the same pattern but still passes either way, because the fresh index makes `needs_population` False.

**Stronger assertion.** `test_keeps_waiting_through_transient_database_errors` never checks that the injected failures were consumed. Add `assert flaky._fail_acquires == 0`, so the test proves the waiter actually rode through `OperationalError`.

**Untested branches:**
- The `last_populated_at()` `SQLAlchemyError` fallback, "populating anyway". This is the server-DB-without-lease-table case the PR body describes. Drop the `tool_source_populate_lease` table from a store and assert `populate_once` still calls `populate` once and returns True.
- `renew()` returning False after a takeover, and the original holder's `release` then not recording `populated_at`.
- The second `_populate_once` call site in `_init_tools_from_index`, where panel ids are missing from the index.
