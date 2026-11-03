- [x] P2 1: Waiters run the full staleness check one at a time under the lease
- [x] P2 2: Sleep-ordered lease tests can flake on slow CI
- [x] P3 1: Restarting after a killed populate waits up to 120 s for a holder that no longer exists
- [x] P3 2: `coordination.py` catches SQLAlchemy exceptions while programming against the backend-neutral `PopulateLease`
- [x] P3 3: Some new lease and toolbox branches are untested
- [x] P3 4: `_populate_once` tracks reloads with a `nonlocal` flag
- [x] P3 5: `_init_tools_from_index` recomputes panel placements on every boot
- [x] P3 6: The multi-process ready/go test harness is duplicated

Other Actions:
