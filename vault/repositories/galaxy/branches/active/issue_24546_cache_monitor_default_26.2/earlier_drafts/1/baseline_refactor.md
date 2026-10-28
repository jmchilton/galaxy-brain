Run via Claude Opus 5.5 at default effort.

The `InProcessCacheMonitor` hardening moved ahead of the fix as its own prep commit. The five post-baseline commits became two: prep, then one consolidated fix. The final tree is identical to the old HEAD.

## New history (on `origin/release_26.2`)
1. `cd7176a6032` Baseline tests for object store cache monitor resolution. Unchanged.
2. `cd3ba1ea621` Harden the in-process cache monitor thread. This is prep, and it applies to base on its own.
   - Daemon thread.
   - Waits on the stop event instead of `time.sleep`/`Sleeper`. The initial sleep could not be interrupted, and `Sleeper` could lose a wakeup.
   - Logs and continues when `check_caches` raises.
   - Brings its tests in their final form: the subprocess exit test, the test that shutdown interrupts sleep, and the test that the monitor survives a check error. All 3 were verified red on baseline. The thread was left lingering, and pytest hung at exit until it was killed by PID.
   - Touches only `caching.py` (the `InProcessCacheMonitor` hunk and the `Sleeper` import) and `test_caching.py`.
3. `827116eff06` Let object_store_cache_monitor_driver decide in-process cache monitoring. This is the fix (`Fixes #24546`).
   - The gate defaults to true, and Rucio follows.
   - A per-store `auto` defers to the global driver. The XML `monitor='auto'` shadowing rationale is carried into the commit message.
   - The monitor starts only when some cache target is sized.
   - A warning fires when the driver is `celery` but Celery is off.
   - User stores resolve to `external`.
   - All of the fix's tests are here. 9 of them are red against the prep commit's lib.

## Old to new mapping
- `edcb5f80615` (fix), `1d929033983` (per-store auto defers), `d9da4853bf6` (flatten resolution / fold table rows) and the fix-side test rewrite from `e2df6c93a28` (user store test with a real disk store) are now in `827116eff06`.
- `bf16bbffc2d` (monitor hardening) and the monitor-side test rewrites from `e2df6c93a28` are now in `cd3ba1ea621`. The message was reworded as prep ("Now that the monitor starts by default" was dropped).
- The old HEAD `d9da4853bf6` is kept locally as tag `refactor-baseline-backup` in WORKING_DIRECTORY, not pushed. The implementation snapshot (`bf16bbffc2d2`) stores its own diff, so the orphaned SHA doesn't matter.

## Not pulled forward
- The per-store `auto` deferral is technically a base bug. Its test passes trivially on base, though, because without the opt-in the gate returns False. Moving it earlier would need a test change, so it stays in the fix.

## Validation
- `git diff refactor-baseline-backup HEAD` is empty.
- Prep commit: 225 passed, 16 skipped. HEAD: 235 passed, 16 skipped (`test/unit/objectstore/` plus `test/unit/app/test_tasks.py`).
- Lint passed on each new commit: isort, black, ruff and flake8, plus the pre-commit hooks.
- Pushed with `--force-with-lease` to `jmchilton/issue_24546_cache_monitor_default_26.2` (`827116eff06`).
