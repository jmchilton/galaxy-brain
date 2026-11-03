# Performance challenge debrief — PR #24666

Reviewed commit: `7587ed8a9ff` (diff `origin/release_26.2...HEAD`). Process: GX_PROCESS_CHALLENGE_PERFORMANCE (review mode, no PR edits).

Environment note: the PR worktree has no `.venv`; measurements ran with `~/projects/worktrees/galaxy/pr/24561/.venv/bin/python` and `PYTHONPATH=lib` from the 24666 worktree (verified `galaxy.tools.source_store.coordination` imported from 24666's `lib/`). Scripts: [perf_lease_bench.py](perf_lease_bench.py), [perf_index_bench.py](perf_index_bench.py).

## Net effect

Positive overall. Before this PR every process booting/reloading against an empty or stale store ran a full populate concurrently (N scans of the tool tree, N writers fighting over one SQLite file). Now one process populates and the rest wait. The findings below refine that win; none is a regression of the populate cost itself.

## 1. Waiters serialize their post-populate check under the lease (measured shape, estimated magnitude)

`populate_once` makes every waiter acquire the lease before deciding anything. Under the lease it runs, in order:

1. `needs_population()` = `_populate_once.reload_and_check`: `_reload_tool_index()` (invalidate + full `ToolIndex.model_validate` of the stored payload) then `still_needed()` = `_index_needs_population()`.
2. Only then the cheap `_populated_since` one-row read + `peer_result_usable`.

So after a peer finishes, N−1 waiters take the lease one at a time and each pays reload + full staleness check while holding it. The last waiter finishes at roughly `populate + (N−1)×(reload + check) + ≤1 s poll latency`.

Measured with 8 processes against one SQLite store, populate = 3 s sleep, synthetic check cost:

| check cost | first done | last done | populates |
|---|---|---|---|
| 0 s | 3.0 s | 4.05 s | 1 |
| 1 s | 4.0 s | 12.13 s | 1 |

Per-check cost in Galaxy (estimated, not measured on a real deployment):
- Reload: synthetic 10k-entry index `model_validate` = 0.062 s (perf_index_bench.py; real payloads larger, plus DB read/JSON decode).
- Default writable store (`tool_confs` probe): probe (md5 of confs + recursive `tool_dir` directory mtimes) + `_writable_store_index_needs_population` (`list_all()` over all hashes + `load_index`). Likely sub-second locally; directory-mtime walk on CVMFS/NFS can be seconds.
- Named stores without a probe (`index_is_fresh() is None`, also composite with such a member): full `discover_tools` conf walk with per-file stats — the docstring of `_index_needs_population` says this dominated boot at CVMFS scale. Serialized across N processes this is N× that walk.

Applies at boot and on toolbox reload (reload is broadcast to every process, so all N hit this at once). Not request-path.

Recommendation: let waiters notice the peer's completion without taking the lease — e.g. `_wait_for_lease` also polls `last_populated_at()` and returns "peer populated" when it changes; the caller then reloads + checks `peer_result_usable` outside the lease and only contends for the lease if the peer's result is unusable or still stale. Minimum version: inside the lease check `_populated_since` + reload + `peer_result_usable` before `needs_population()` (docstring semantics already allow peer result to win), so the expensive scan is skipped when a peer just populated; reload still serializes but the scan does not.

## 2. Fast panel path recomputes `_index_panel_items()` on every boot

`_init_tools_from_index` computes `placements = self._index_panel_items()`, then `missing = self._panel_ids_missing_from_index()` which calls `_index_panel_items()` again (dedupe + lineage collapse with `parse_tool_version`). Same after the populate branch. Base reused `placements`. This is the every-boot fast path, not only the populate path. Cost is small (collapse-like pass over 10k entries: 0.006 s synthetic), so P3 tidiness: have the helper take `placements`, or compute `missing` inline as base did, and keep the helper only for the `still_needed` lambda.

## 3. Lone-process stale path does the check twice (debrief only)

With no peer, a stale boot now does: initial `load_index` + `_index_needs_population()` → lease → reload (second full index load) + second `_index_needs_population()` → populate → reload. One extra index load + one extra check vs base. Bounded by the cost in section 1; acceptable for correctness of the re-check. Could skip the in-lease re-check when `try_acquire` succeeded on first poll and `last_populated_at` is unchanged, but not worth complexity unless the walk case is common.

## Checked, not an issue

- Polling load: waiters do one indexed single-row SELECT per second (read-before-write keeps them off the write lock). Negligible even for tens of processes; adds ≤1 s latency after release.
- Renewal vs populator contention: populator commits per source row (short txns), so a 20 s renew UPDATE interleaves; a renew blocked by busy timeout (60 s) logs and retries, TTL 120 s. A populator holding one write txn >~120 s could let a waiter take over and populate concurrently — not observed in code paths read, flagged only as a thing to watch.
- `_create_sqlite_schema`: one `inspect().get_table_names()` per store open, `BEGIN IMMEDIATE` only when tables are missing. Cheaper than or equal to prior `create_all` per-table checks.
- No unbounded DB query added; lease table is a singleton row.

## Measurement plan (if author/John want data)

1. usegalaxy-scale tool conf (or CVMFS mount) + empty store, start 8–16 gunicorn workers/handlers at once; log per-process time from "Waiting for another Galaxy process" to "CachedToolBox initialized". Compare last-process boot time to first.
2. Repeat with a named store lacking a probe (forces `discover_tools` walk) to bound the worst case.
3. Repeat after the recommended reorder/peer-detection change; expect last-waiter ≈ populate + poll interval + one (parallel) reload.
4. Trigger a broadcast toolbox reload after editing a tool conf and record the same timings.
