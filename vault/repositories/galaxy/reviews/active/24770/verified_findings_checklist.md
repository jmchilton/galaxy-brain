- [x] P3 1: Paused inputs on `require_ready` connections still replay — connection HDA waits record snapshot (needs P3 3; trim together).
- [x] P3 2: Snapshot shape defined three times — single `readiness_snapshots()` in readiness.py.
- [x] P3 3: Every non-ready state transition replays — non-ready states collapse to one snapshot value.
- [x] P3 4: Loose `input_readiness_dependencies` contract — typed `ReadinessInput`, required `states`, `dataset_dependencies()`.

Other Actions:
