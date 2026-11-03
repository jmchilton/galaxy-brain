### P2 1: Waiters run the full staleness check one at a time under the lease (implementation verified)

After a peer populates, each waiter takes the lease and, while still holding it, runs `needs_population()` before the cheap `_populated_since` check. In the toolbox, `needs_population()` reloads the index and runs `_index_needs_population()`. That means a freshness probe plus a `list_all()` scan, or a full `discover_tools` conf walk for stores without a probe. The N−1 waiters therefore finish one after another, at about `populate + (N−1) × (reload + check)`. This happens on every boot and on every broadcast toolbox reload.

<details><summary>Evidence</summary>

`perf_lease_bench.py` ran 8 processes against one SQLite store, with a 3 s populate and a 1 s synthetic check:

- **Reviewed commit:** the last waiter finished at 12.1 s. With a 0 s check it finished at 4.0 s.
- **Review branch:** the last waiter finished at 5.1 s, and none of the 7 waiters ran the check.

The new assertions fail at the reviewed commit:

- `test_uses_a_populate_another_process_completed_while_waiting` asserts that `needs_population` is not called. At the reviewed commit it is called once (`[1] == []`).
- `test_toolbox_waits_for_a_peer_populating_the_store` asserts `_index_needs_population.call_count == 1`. At the reviewed commit the count is `2`.

</details>

Check `_populated_since(...) and peer_result_usable()` before `needs_population()` inside the lease. The docstring already lets a usable peer result win over `needs_population`, so the method returns `False` in the same cases as before. The toolbox's `peer_result_usable` then has to reload the index itself, because `needs_population` no longer runs first.

A larger version would let `_wait_for_lease` also watch `last_populated_at()`, so that waiters load the peer's result without taking the lease at all. That seems too much for a release branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: Sleep-ordered lease tests can flake on slow CI (implementation verified)

Four tests start a waiter thread, `time.sleep(0.2)`, and then release the peer's lease with `populated=True`:

- `test_uses_a_populate_another_process_completed_while_waiting`
- `test_repopulates_when_the_peer_result_is_unusable`
- `test_keeps_waiting_through_transient_database_errors`
- `test_toolbox_waits_for_a_peer_populating_the_store`

The waiter takes its `last_populated_at()` snapshot only when the thread runs. If the thread starts after the release, the snapshot already holds the peer's timestamp, so `_populated_since` is False and the waiter populates. The first and third tests then fail.

The other two pass without testing what they claim:

- `test_repopulates...` populates whether or not `peer_result_usable` rejected anything.
- The toolbox test sees a fresh index and never waits.

`test_keeps_waiting...` also never checks that the injected `OperationalError`s were actually raised.

<details><summary>Evidence</summary>

At the reviewed commit, the body of `test_uses_a_populate...` was run with the waiter's first `last_populated_at()` delayed by 0.3 s. It produced `result [True] calls [1]`, where the test expects `[False]` and `[]`.

</details>

Release the peer only after the waiter has found the lease held. A delegating lease can set a `threading.Event` the first time `try_acquire` returns False. That point always comes after the snapshot. The test then waits on the event instead of sleeping.

Two more assertions make the tests check what they claim:

- Assert that the injected acquire failures were consumed.
- Assert that `peer_result_usable` was actually consulted.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Restarting after a killed populate waits up to 120 s for a holder that no longer exists

The holder string is `host:pid:uuid8`, so a restarted process never matches the lease row its predecessor left behind. `try_acquire` refuses until `expires_at` passes. The `finally: lease.release(...)` in `populate_once` does not run in three cases:

- SIGKILL
- an OOM kill
- Python's default SIGTERM handling

A single-process or dev Galaxy that is killed during its first long populate therefore stalls the next boot for up to `LEASE_TTL` (120 s). Meanwhile it logs "Waiting for another Galaxy process to finish populating", even though no other process exists.

`try_acquire` could treat a lease as free when its holder is on this host and that holder's pid is gone (`os.kill(pid, 0)` raises `ProcessLookupError`). The takeover must be a compare-and-set on the observed holder string. Containers that share a hostname but have separate PID namespaces could take over a live lease this way, which leads back to the concurrent populates of the old behaviour. A smaller change is to include the current holder in the wait log message, so operators can see whose lease they are waiting on.

Not fixed on the review branch, because the trade-off is the author's call on a release branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 2: `coordination.py` catches SQLAlchemy exceptions while programming against the backend-neutral `PopulateLease` (implementation verified)

`populate_once` and `_wait_for_lease` take an abstract `PopulateLease` but catch `sqlalchemy.exc.OperationalError` and `SQLAlchemyError`. That has two effects:

- The coordinator is tied to the only implementation, and so is the test fake `_FlakyLease`.
- Any other `PopulateLease` would silently skip the "keep waiting on transient errors" and "populate anyway without a lease table" fallbacks.

Define `PopulateLeaseError` and a `PopulateLeaseBusy` subclass in `interface.py`. `_SqlAlchemyPopulateLease` translates errors in one place:

- `OperationalError` becomes `PopulateLeaseBusy`.
- Any other `SQLAlchemyError` becomes `PopulateLeaseError`.

`coordination.py` then imports nothing from SQLAlchemy and keeps the same split:

- `_wait_for_lease` keeps waiting on `PopulateLeaseBusy`.
- The other three sites catch `PopulateLeaseError`.

A new test drops the lease table and checks that `populate_once` still populates once.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: Some new lease and toolbox branches are untested (implementation verified)

No test covers these paths:

- The `last_populated_at()` fallback that populates without coordination. This is the case of a server database without the lease table.
- `renew()` returning False after a takeover, and the original holder's `release(populated=True)` then not recording `populated_at`.
- `populate_lease()` returning `None` for a read-only store.
- The toolbox repopulating when the peer leaves no loadable index. This is the rolling-upgrade case `peer_result_usable` exists for.

The review branch adds a test for each, and all four pass.

The second `_populate_once` call site, in fast panel init, cannot be tested. `_index_panel_items()` drops placements whose id is not in the index, because `_latest_panel_tool_ids` skips ids with no entry. As a result, `missing` computed from those placements is always empty. This is true at the base too. A check against `ToolIndex(panel_items=[a, gone])` returned `missing set()`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: `_populate_once` tracks reloads with a `nonlocal` flag (implementation verified)

`CachedToolBox._populate_once` sets `nonlocal reloaded` inside `reload_and_check` and afterwards reloads `if populated or not reloaded`. This is correct but hard to follow.

Every path either runs `needs_population`, which reloads, or runs the populate callback. Reloading inside the populate callback (`_run_inline_populator()` followed by `_reload_tool_index()`) therefore removes both the flag and the post-call branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: `_init_tools_from_index` recomputes panel placements on every boot (implementation verified)

`missing = self._panel_ids_missing_from_index()` calls `_index_panel_items()` again right after `placements` was computed, and does the same again after the populate branch. The base reused `placements`. `_index_panel_items()` dedupes ids and collapses lineages with `parse_tool_version`, and it runs on the every-boot fast path. The cost is small, about 6 ms on a synthetic 10k-entry index.

Let `_panel_ids_missing_from_index` take the already computed placements. The `still_needed` lambda keeps the no-argument form.

As P3 3 notes, `missing` here is always empty. The populate branch at this call site may be worth dropping in a follow-up on `dev`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: The multi-process ready/go test harness is duplicated (implementation verified)

Two tests each inline the same spawn, ready-files, go-signal, communicate and kill loop, about 25 lines each:

- `test_coordination.py::test_one_of_many_processes_populates_while_the_others_wait`
- `test_sqlite_store.py::test_processes_opening_a_new_store_concurrently_all_succeed`

Move the loop to a `run_processes_together` fixture in the `source_store` `conftest.py`. Keep the early-exit and deadline asserts. Both tests still pass with the fixture.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
