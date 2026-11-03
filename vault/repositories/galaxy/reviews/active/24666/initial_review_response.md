(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_reviews/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Mostly a two-way door: the only lasting artifact is a new `tool_source_populate_lease` table in the tool source store database (a rebuildable cache), but boot/reload now block on a cross-process lease on a release branch, so a lease bug shows up as stalled startups rather than a rollback-proof data problem.

<details><summary>Risk Details</summary>

- Adds a persisted table to every writable store; reverting the code leaves an unused table behind (harmless, but shared-DB operators who manage schema manually must create it or get uncoordinated populates with a warning).
- Boot and toolbox reload can now wait indefinitely on a holder that hangs while its renewal thread keeps the lease alive (acknowledged in the PR as unbounded).
- Takeover depends on wall-clock `now()` across hosts; skew over the 120 s TTL could let a waiter steal a live lease or delay takeover of a dead one.
- A waiter reuses a peer's index whenever `populated_at` changed and the index is non-empty, even if `needs_population` still says stale - a peer with a different tool conf could leave this process on a mismatched index.
- `populate_store.py`, `reconcile_index` and watch mode bypass the lease, so concurrent writes from those paths remain possible.
- `BEGIN IMMEDIATE` schema creation is SQLite-only; remote backends keep the old best-effort `create_all` race.
- Lands on `release_26.2`, so behavior reaches deployments in a point release.

</details>

<details><summary>Risk Review Advice</summary>

Focus on `coordination.populate_once` and the peer-reuse shortcut in `CachedToolBox._populate_once`: confirm processes sharing a store but with different tool confs cannot adopt each other's index incorrectly, and that a hung holder is an acceptable failure mode for multi-process deployments (gunicorn workers, job handlers).

Also sanity-check `_SqlAlchemyPopulateLease.try_acquire`'s update-then-insert path on Postgres/MySQL shared stores and the clock-skew assumption behind `LEASE_TTL`.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24666_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24666_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24666_review_0) is based on the reviewed commit `7587ed8a9ff`. It fixes every verified finding except P3 1, the restart stall on a dead lease, which is left to the author. Waiters now check for a completed peer populate before the expensive staleness scan, and the lease contract is backend-neutral. The sleep-ordered tests wait on an event, `_populate_once` no longer needs its reload flag, and panel placements are reused. The duplicated multi-process test harness is now a shared fixture. New tests cover the untested lease and toolbox branches. Every test the branch adds or edits passes when run individually.

- [`1a8fe2d7312`](https://github.com/jmchilton/galaxy/commit/1a8fe2d7312) Raise lease-specific errors instead of SQLAlchemy ones from PopulateLease. The SQLAlchemy lease raises the new `PopulateLeaseError` and `PopulateLeaseBusy` from `interface.py`, so `coordination.py` no longer imports SQLAlchemy (P3 2).
- [`513ca9e6c5f`](https://github.com/jmchilton/galaxy/commit/513ca9e6c5f) Reload the tool index in the populate callback instead of tracking it. Drops the `nonlocal reloaded` flag from `CachedToolBox._populate_once` (P3 4).
- [`49183e7817a`](https://github.com/jmchilton/galaxy/commit/49183e7817a) Check for a peer populate before the staleness check under the lease. A waiter whose peer has just populated now skips `needs_population` (P2 1).
- [`bd19078c57f`](https://github.com/jmchilton/galaxy/commit/bd19078c57f) Order lease waiter tests on an event instead of sleep(0.2). Tests release the peer only after the waiter has found the lease held, and assert what they previously only implied (P2 2).
- [`82287e6360a`](https://github.com/jmchilton/galaxy/commit/82287e6360a) Test lease takeover, read-only stores and an unusable peer index. Adds tests for those previously untested branches (P3 3).
- [`374f028ac61`](https://github.com/jmchilton/galaxy/commit/374f028ac61) Reuse computed panel placements when checking for missing index ids. `_panel_ids_missing_from_index` now takes the placements `_init_tools_from_index` has already computed (P3 5).
- [`8f75f2d1c59`](https://github.com/jmchilton/galaxy/commit/8f75f2d1c59) Share the multi-process start-signal harness between store tests. Both subprocess tests now use a `run_processes_together` conftest fixture (P3 6).

</details>

</details>

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

Fixed on the review branch in [`49183e7817a`](https://github.com/jmchilton/galaxy/commit/49183e7817a).

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

Fixed on the review branch in [`bd19078c57f`](https://github.com/jmchilton/galaxy/commit/bd19078c57f).

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

Fixed on the review branch in [`1a8fe2d7312`](https://github.com/jmchilton/galaxy/commit/1a8fe2d7312).

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

Fixed on the review branch in [`82287e6360a`](https://github.com/jmchilton/galaxy/commit/82287e6360a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: `_populate_once` tracks reloads with a `nonlocal` flag (implementation verified)

`CachedToolBox._populate_once` sets `nonlocal reloaded` inside `reload_and_check` and afterwards reloads `if populated or not reloaded`. This is correct but hard to follow.

Every path either runs `needs_population`, which reloads, or runs the populate callback. Reloading inside the populate callback (`_run_inline_populator()` followed by `_reload_tool_index()`) therefore removes both the flag and the post-call branch.

Fixed on the review branch in [`513ca9e6c5f`](https://github.com/jmchilton/galaxy/commit/513ca9e6c5f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: `_init_tools_from_index` recomputes panel placements on every boot (implementation verified)

`missing = self._panel_ids_missing_from_index()` calls `_index_panel_items()` again right after `placements` was computed, and does the same again after the populate branch. The base reused `placements`. `_index_panel_items()` dedupes ids and collapses lineages with `parse_tool_version`, and it runs on the every-boot fast path. The cost is small, about 6 ms on a synthetic 10k-entry index.

Let `_panel_ids_missing_from_index` take the already computed placements. The `still_needed` lambda keeps the no-argument form.

As P3 3 notes, `missing` here is always empty. The populate branch at this call site may be worth dropping in a follow-up on `dev`.

Fixed on the review branch in [`374f028ac61`](https://github.com/jmchilton/galaxy/commit/374f028ac61).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: The multi-process ready/go test harness is duplicated (implementation verified)

Two tests each inline the same spawn, ready-files, go-signal, communicate and kill loop, about 25 lines each:

- `test_coordination.py::test_one_of_many_processes_populates_while_the_others_wait`
- `test_sqlite_store.py::test_processes_opening_a_new_store_concurrently_all_succeed`

Move the loop to a `run_processes_together` fixture in the `source_store` `conftest.py`. Keep the early-exit and deadline asserts. Both tests still pass with the fixture.

Fixed on the review branch in [`8f75f2d1c59`](https://github.com/jmchilton/galaxy/commit/8f75f2d1c59).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at low effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

</details>
