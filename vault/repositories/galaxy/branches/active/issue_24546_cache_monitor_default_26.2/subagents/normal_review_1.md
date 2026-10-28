# Normal review 1

Run via Claude Opus 5.5 (general-purpose subagent, default effort).

Acted on: the non-daemon `CacheMonitorThread` hung CLI scripts that never call `shutdown()` (reproduced by reviewer); the thread now runs as a daemon. Also fixed the silent thread death on `check_caches` errors (log and continue), the `Sleeper` lost-wakeup that stalled `shutdown()` for 5s (found while writing the red test), and the nits: local `cache_targets`, the duplicate parametrize case, grouping the tests, and the dead `try/finally`. Commit `bf16bbffc2d`.

Not acted on:
- The warning repeats per store and per process, and fires for unsized caches. That's acceptable for a misconfiguration warning, and `enable_cache_monitor()` doesn't know sizes.
- Behavior change for Celery-less sized-cache deployments. Belongs in the PR description and release notes, not code.
- Integration tests are Docker-only and not run. The reviewer expects no breakage (1000 GB caches; the tiny-cache tee test asserts nothing cached).

<details><summary>Details</summary>

Verdict: approve after one real fix.

Bug: `InProcessCacheMonitor` thread was non-daemon. With the monitor now on by default (Celery off, sized cache, auto driver), scripts like `scripts/dump_library_paths.py`, `scripts/pages_identifier_conversion.py`, `scripts/grt/export.py` and `lib/galaxy/model/store/build_objects.py` (galaxy-build-objects) would hang at exit. `pgcleanup.py` was probably affected. `set_metadata.py` is unaffected (`disable_process_management=True`). Fix: `daemon=True`, plus a test asserting it.

Concerns:
- The monitor thread dies silently on a `FileNotFoundError` race between processes. Suggested wrapping it in try/except with a log.
- The warning repeats.
- Behavior change on a stable branch.
- `test_tee_streaming.py:57` tiny cache: no breakage expected.

Decisions reviewed and agreed: target 26.2, gate default True, rucio flip, sized-only start, no warning for external, user stores pinned to external (the test fails without it). No docs change needed (`config_schema.yml` already documents auto → inprocess).

Nits:
- `cache_targets()` called twice.
- Duplicate `{"cache": {"size": 1}}` case.
- Unsized test separated from its siblings.
- Dead `try/finally`.

Imports at top. No security issues.
</details>
