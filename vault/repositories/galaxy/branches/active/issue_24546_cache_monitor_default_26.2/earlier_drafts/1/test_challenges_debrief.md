Run via Claude Opus 5.5 at default effort.

# Test challenges debrief

One new commit, `e2df6c93a28` "Test cache monitor behavior, not attributes or mocks". History not rewritten; the Baseline commit `cd7176a6032` stays first.

## Changed
- **`test_cache_monitor_thread_does_not_block_exit`**: it asserted `thread.daemon`, which only checks the implementation. It now runs a subprocess that starts a monitor (interval and initial sleep both 600) and exits without calling `shutdown()`, then asserts exit code 0 within 30s. On base it times out.
- **`test_cache_monitor_shutdown_interrupts_sleep`** (new): covers a gap. The `Sleeper`/`time.sleep` to `event.wait` change had no test, because every test shut down a monitor that wasn't sleeping on `initial_sleep`. The test starts with `initial_sleep=600`, calls `shutdown()`, and asserts the thread is dead. On base the thread is still alive after the 5s join.
- **`test_cache_monitor_survives_check_error`**: the sleep-poll loop is replaced by a `threading.Event` that the fake `check_caches` sets on its second call. The monkeypatched `check_caches` stays; it is a behavioral fake. On base, `wait(5)` returns False because the thread dies after the first error.
- **`test_user_object_store_skips_cache_monitor`**: dropped `RecordingObjectStore` and the `type_to_object_store_class` monkeypatch. It now builds a real disk store through `concrete_object_store` and calls `enable_cache_monitor(store.config, {"enable_cache_monitor": True, "cache": {"size": 1}})`.
  - The old version passed on base, because the per-store gate defaulted to False. It went red only when the single `external` line was reverted.
  - The explicit opt-in makes it red on base at its own assertion (`True is False`): with no driver set, base resolves `auto` to inprocess.

## Kept as-is
- **Baseline tests** (resolution parametrize, interval, `_start_cache_monitor_if_needed` sized/disabled): they pin behavior the branch doesn't change. 12 passed against base `lib/galaxy/objectstore`.
- **`test_start_cache_monitor_if_needed_unsized`, `test_enable_cache_monitor_defaults_to_driver`, the celery warning test, `test_rucio_xml_enable_cache_monitor_default`**: each tests a branch behavior and is red on base. The rucio module guards its third-party imports, so importing it at module level is safe.
- **Restructuring considered, not done**: hoisting `GalaxyConfigAdapter` out of `concrete_object_store`. `store.config` already exposes it, and a refactor isn't worth it in a 26.2 fix.

## Not added
- **E2E/Selenium**: none. This is a backend config default with no UI.
- **Integration**: objectstore cache integration tests need Docker. Unit coverage of resolution and monitor lifecycle is enough.

## Validation
- Branch: `test/unit/objectstore/` gave 220 passed, 16 skipped. The two target files gave 44 passed.
- Red checks: base `lib/galaxy/objectstore` checked out into the worktree, then restored. All four rewritten/new tests fail at their assertions.
  - The pytest run with the shutdown test hangs at exit on base (non-daemon thread), so it was run in the background and killed by PID.
- isort, black, ruff and flake8 are clean, and the pre-commit hooks passed.
