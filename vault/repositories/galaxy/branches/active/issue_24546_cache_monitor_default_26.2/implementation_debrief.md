# Implementation debrief

**STATUS: BLOCKED.** The fix is done and hardened, but this is parked on a scope decision. The second scope evaluation also recommended expanding, so per process I stopped instead of re-scoping again.

```
created .../differential-review/snapshots/20261028T203823Z-hardening-6fe63109810f.json
  hardening @ 6fe63109810f vs origin/release_26.2 (merge-base 0902830bfa67)
  since 20261028T201526Z-implementation-5a46ed80bccf:
    commits: 2 same, 1 rebased, 1 changed, 1 new, 1 dropped
    hunks:   18 carried, 2 changed, 2 new, 1 dropped
    new     32b5a9841c70 Parse iRODS XML cache config with the shared caching parser
    changed 6fe63109810f Start the in-process cache monitor for iRODS and pithos stores (3 differing hunks)
```

## Branch

Branch `issue_24546_cache_monitor_default_26.2`, base `release_26.2`, head `6fe63109810`.

1. `cd7176a6032` Baseline tests for the `enable_cache_monitor()` resolution, the interval, and `_start_cache_monitor_if_needed`.
2. `cd3ba1ea621` Prep: harden `InProcessCacheMonitor`.
   - Daemon thread, so CLI scripts that never call `shutdown()` no longer hang at exit.
   - Waits on the stop event instead of `Sleeper`, which had a lost wakeup.
   - Logs and continues on `check_caches` errors.
3. `32b5a9841c7` Prep: iRODS XML now goes through the shared `parse_caching_config_dict_from_xml`, so `<cache monitor=...>` is no longer dropped.
4. `e84f5111dad` The fix (Fixes #24546).
   - The per-store `enable_cache_monitor` gate defaults to true, so `object_store_cache_monitor_driver` decides. Explicit false still opts out.
   - A per-store `auto` defers to the global driver.
   - The monitor starts only for sized caches.
   - A warning is logged when the driver is `celery` and Celery is off.
   - User-defined stores are pinned to `external`.
   - Rucio XML default is now `True`.
5. `6fe63109810` iRODS and pithos resolve the driver and start the monitor, and stop it on `shutdown`. iRODS also stops it on `soft_shutdown`. This is the expansion from the round-1 scope evaluation.

Alt `issue_24546_cache_monitor_default_26.2_alt_original_scope` (`827116eff06`) is commits 1, 2 and 4 without the iRODS/pithos work.

## Key choices
- **Base `release_26.2`, not `release_25.1`.** The default-on monitor is only safe with the `check_cache` non-positive-size guard (`85aa89f8bb0`, 26.2/dev only). Without it, unsized caches get wiped.
- **No startup warning for `external`.** The issue proposed one, but the docs recommend `external` for production.
- **User stores pinned to `external`.** Otherwise each per-configuration instance would spawn its own monitor thread.
- **Per-store start/stop calls rather than a base-class lifecycle.** Kept for the release branch; this is the main open decision below.

## Decision needed (round-2 scope evaluation: expand, modest)
1. **Pithos XML never parses `<cache>`.** XML pithos can't set a per-store size, path, dirs or `monitor`. It uses the global settings, so it does get the monitor, but the per-store `external` opt-out can't reach it.
   - It's the same gap commit 3 closed for iRODS.
   - The fix is one line plus a parse test, small enough to add here.
2. **Move the cache monitor lifecycle (resolve/start/stop) into `CachingConcreteObjectStore`.**
   - It's copy-pasted in 8 stores, and a store forgetting it is how iRODS and pithos stayed broken.
   - The costs: start points differ per store, some `shutdown()` overrides skip `super()`, and iRODS `soft_shutdown` needs special handling.
   - Options: do it on this 26.2 branch, or as a separate dev PR (my suggestion).

Suggested: take (1) here, and do (2) as a dev follow-up. Then run another normal review and the test challenges on the new pithos test.

## What still applies
- All hardening round 2 debriefs apply to `6fe63109810`: test challenges, Codex, thermo-nuclear, baseline refactor, and normal reviews 1–2.
- Option (1) only touches the pithos XML parser and its tests.
- Option (2) would need the 3 lifecycle tests re-pointed and a fresh thermo-nuclear review, Codex review and test challenges.

## Validation
- `test/unit/objectstore/` + `test/unit/app/test_tasks.py`: 239 passed, 16 skipped. Each new test was checked red against base.
- `make format` is clean. mypy reports 478 errors, the same as base, all pre-existing.
- Not run: the objectstore integration tests (they need Docker). With Celery off, the sized caches there will now run in-process monitors; reviewers expect no breakage.

## PR-description notes
- **Behavior change:** Celery-less sized-cache deployments start evicting after upgrade, as documented.
- **Pre-existing, not fixed:** Celery beat schedules from the global driver only and cleans every target regardless of per-store drivers.
- **Pre-existing, not fixed:** one monitor thread runs per process per store.
