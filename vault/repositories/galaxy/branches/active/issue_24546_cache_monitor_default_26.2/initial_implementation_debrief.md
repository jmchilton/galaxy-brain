# Initial implementation debrief

```
created .../differential-review/snapshots/20261028T194747Z-implementation-bf16bbffc2d2.json
  implementation @ bf16bbffc2d2 vs origin/release_26.2 (merge-base 0902830bfa67)
  first snapshot: 3 commits, 6 files, 10 hunks
```

Branch `issue_24546_cache_monitor_default_26.2`, base `release_26.2`.

## Commits
1. `cd7176a6032` Baseline tests. Pins the `enable_cache_monitor()` resolution and interval, and `_start_cache_monitor_if_needed`, for the cases that don't change.
2. `edcb5f80615` Fix.
   - Per-store `enable_cache_monitor` gate defaults to true, so the driver decides: `auto` without Celery means inprocess, as documented.
   - Monitor starts only if some cache target is sized.
   - Warns when the driver resolves to `celery` while Celery is off.
   - User stores are pinned to `external`.
   - Rucio XML default is now `True`.
3. `bf16bbffc2d` Review fixes.
   - Daemon monitor thread (CLI scripts hung at exit).
   - Waits on the stop event instead of `Sleeper` (lost wakeup).
   - Logs and continues on `check_caches` errors.

## Choices
- **Base 26.2, not 25.1:** the default-on monitor is safe only with the `check_cache` non-positive-size guard `85aa89f8bb0`, which is in 26.2 and dev only. Without it, unsized caches get wiped.
- **Gate defaulted, not deleted:** explicit `enable_cache_monitor: false` still opts out.
- **Warning only for `celery` without Celery:** none for `external` (the issue proposed both), because the docs recommend `external` for production.
- **User-defined stores (`concrete_object_store`) pinned to `external`:** keeps current behavior. Per-configuration instances would otherwise each spawn a thread.

## Validation
- `test/unit/objectstore/` + `test/unit/app/test_tasks.py`: 231 passed, 16 skipped.
- New tests verified red before the fix. The user-store and survives-error tests were checked by reverting the fix line.
- isort, black, ruff, flake8 clean. mypy count matches base (478, pre-existing).
- Objectstore integration tests (Docker) not run.
