Run via Claude Opus 5.5 at default effort.

# Test challenges debrief (round 2, post-rescope)

Fresh pass over every test in `git diff origin/release_26.2...HEAD`. One new commit, `0279b1a5ff2` "Share iRODS cache monitor test setup; swap MagicMocks for noop fakes". History not rewritten. Baseline commit `cd7176a6032` stays first.

## Changed
- **`test_sized_cache_starts_cache_monitor` / `test_soft_shutdown_stops_cache_monitor` (test_irods.py)**: the two tests had identical 5-line setup and a `try/finally`. Moved it into a `sized_cache_store` fixture that yields the store and calls `shutdown()` on teardown, so a red test can't leak the thread.
  - `MagicMock` for `irods` and `iRODSSession` replaced with noop fakes: `object()` for the module (only checked for `None`) and `lambda **_: FakeSession()`, reusing the file's existing `FakeSession`.
  - Start test now also asserts the thread is alive before shutdown. Soft-shutdown test asserts a precondition (monitor exists), so base fails at an assertion and not with `AttributeError` on `None`. It also asserts `session.cleaned_up` stays False, which pins the soft-shutdown contract alongside the cache stop.
- **`test_pithos_sized_cache_starts_cache_monitor`**: `KamakiClient` stub `MagicMock()` changed to `object` (only checked for `None`). `_authenticate`/`_init_pithos` stubs kept; they are network calls.

## Kept as-is
- **Baseline tests** (9 resolution rows, interval, `_start_cache_monitor_if_needed` sized/disabled). They pin unchanged behavior and pass on base.
- **New resolution rows (`{}` default-on, per-store `auto` defers to global driver)**, `unsized`, celery-warning, rucio default, and `test_xml_cache_without_monitor_defers_to_global_driver`. Each is red on base at its own assertion. The XML test goes through `parse_caching_config_dict_from_xml`, so it is not a duplicate of the dict-level parametrize rows. Its `caplog` line overlaps the dedicated warning test, but it is cheap and left in.
- **Monitor thread tests** (subprocess exit without `shutdown`, shutdown interrupts `initial_sleep`, survives check error). These are behavioral. The `check_caches` monkeypatch is a fake that raises, not a call-recording mock.
- **`test_user_object_store_skips_cache_monitor`**: real disk store via `concrete_object_store`. Red on base.

## Not done
- **Hoisting `_shutdown_cache_monitor()` into `CachingConcreteObjectStore.shutdown`**: all 8 caching stores (s3, s3_boto3, azure, cloud, onedata, rucio, irods, pithos) wire start and stop by hand. A base-class hook would remove the per-store overrides that the pithos/irods tests exist to guard. It touches every store, which is too much for a 26.2 fix. Better as a dev follow-up.
- **E2E/Selenium**: none needed, since this is a backend config default with no UI. **Integration**: cache integration tests need Docker. Unit coverage of resolution and lifecycle is enough.

## Validation
- Branch: `test/unit/objectstore/ test/unit/app/test_tasks.py` gave 238 passed, 16 skipped. isort, black, ruff, flake8 and the pre-commit hooks are clean.
- Red checks, run with `lib/galaxy/objectstore` temporarily checked out from base, then restored:
  - irods start, irods soft-shutdown and pithos start fail at `isinstance(None, InProcessCacheMonitor)`.
  - The caching tests fail at their assertions: 4 new resolution rows, unsized, warning, XML defers, and rucio.
  - The base pytest hung at exit (non-daemon thread) and was killed by PID.
- Against `381fb819572` irods.py (monitor started, but `soft_shutdown` doesn't stop it), the soft-shutdown test fails at `assert not is_alive()`.
