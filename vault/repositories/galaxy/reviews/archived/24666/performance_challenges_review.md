# Performance challenge review — PR #24666

- Profile: [gx_performance_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_performance_challenger.md)
- Model: Opus 5.5 (`claude-opus-5-5`); effort: coordinator-assigned (not visible to the agent)
- Reviewed commit: `7587ed8a9ff`
- Details and measurement plan: [performance_challenges_debrief.md](performance_challenges_debrief.md); scripts [perf_lease_bench.py](perf_lease_bench.py), [perf_index_bench.py](perf_index_bench.py) (run with the 24561 worktree venv + `PYTHONPATH=lib`, since 24666 has no `.venv`)

Overall: a performance win — N concurrent full populates at boot/reload become one. Findings refine the waiter side.

### P2 1: Waiters run their reload + staleness scan one at a time while holding the lease

After a peer populates, each waiter acquires the lease and, still holding it, reloads the full index and runs `_index_needs_population()` before the cheap `_populated_since` check. N−1 waiters therefore serialize: last finishes at about `populate + (N−1)×(reload + check)`. Measured (8 processes, 3 s populate): 1 s check → last waiter 12.1 s vs 4.0 s at 0 s check. Real per-check cost is estimated: ~0.06 s+ to deserialize a 10k-entry index, plus the probe/`list_all` scan in the default store, or a full `discover_tools` walk for stores without a probe (the slow CVMFS case). Hits every process at boot and on broadcast toolbox reload.

Suggested fix: have `_wait_for_lease` also watch `last_populated_at()` and stop waiting when it changes; the waiter then reloads and checks `peer_result_usable` outside the lease and only contends for it if the peer's result is unusable. Minimum fix: under the lease, check `_populated_since` + `peer_result_usable` before `needs_population()` so the expensive scan is skipped when a peer just populated (the docstring already lets the peer result win).

### P3 1: `_init_tools_from_index` recomputes panel placements on every boot

`missing = self._panel_ids_missing_from_index()` calls `_index_panel_items()` again right after `placements` was computed (and again after the populate branch); base reused `placements`. Small cost (~6 ms synthetic at 10k) but on the every-boot fast path. Pass `placements` in, or compute `missing` from `placements` inline and keep the helper only for the `still_needed` lambda.
