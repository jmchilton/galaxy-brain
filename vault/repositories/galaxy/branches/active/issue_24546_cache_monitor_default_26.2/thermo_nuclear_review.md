Run via Claude Opus 5.5 at default effort.

# Thermo-nuclear code quality review (round 2, after re-scope)

Verdict: approve, no code changes. I reviewed the whole branch fresh at `315bd644053` (`git diff origin/release_26.2...HEAD`, 10 files, +237/-36). Nothing I found clears the bar for a fix that is proportionate on 26.2, so this round has no commits. The branch is in the right layer: resolution in `caching.enable_cache_monitor`, gating in `CachingConcreteObjectStore._start_cache_monitor_if_needed`, the thread in `InProcessCacheMonitor`, and user-store pinning in `GalaxyConfigAdapter`. It deletes a concept (`Sleeper`) and adds no new flags or modes.

Not acted on:
- **Cache monitor lifecycle is now repeated in all 8 `CachingConcreteObjectStore` subclasses.** Each store does three steps: `self.enable_cache_monitor, self.cache_monitor_interval = enable_cache_monitor(config, config_dict)`, then `_start_cache_monitor_if_needed()` at the end of init, then `_shutdown_cache_monitor()` in `shutdown()`. This branch added 2 of the 8 (iRODS, pithos). The pattern now covers every subclass, so moving it into the base is a mechanical dev follow-up: resolve in a base `__init__`/helper, start in one hook, stop in a base `shutdown()` that subclasses `super()` into. Doing it here would touch 6 stores this branch doesn't otherwise change, on a release branch.
- **No base `shutdown()` just to delete pithos's 3-line override.** On its own it moves code into the shared base without removing the duplication in the other 7 stores. It belongs with the follow-up above.
- **`size > 0` predicate in 3 places** (`CacheTarget.fits_in_cache`, `check_cache`, `_start_cache_monitor_if_needed`). A `CacheTarget.is_bounded` property would be cleaner, but adding it means touching code this branch doesn't change. Dev follow-up.
- **Celery beat schedules cleanup from the global driver only** (`lib/galaxy/celery/__init__.py`). This predates the branch and needs design, because beat schedules before any store exists. Same conclusion as codex round 2 and the scope eval.
- **`config` in `enable_cache_monitor(config, config_dict)` is untyped.** This predates the branch. Typing it would need a config Protocol, which is too much for this fix.
- **`MonitorConfig` sits next to `FakeConfig` in `test_caching.py`.** I didn't fold them: `FakeConfig` models cache shard path/size, while `MonitorConfig` models the four driver/celery/interval/process-management attrs. Merging them would give one stub a six-arg constructor serving two unrelated test groups. `unittest_utils.MockConfig` has none of the monitor attrs.
- **Overlapping test assertions.** `test_xml_cache_without_monitor_defers_to_global_driver` partly repeats a resolution-table row and the celery-warning test. Its distinct value is the XML parse → `"auto"` → global-driver hop, so I kept it. Trimming it would weaken coverage, which needs sign-off.
- **iRODS fixture double `shutdown()`** (`test_sized_cache_starts_cache_monitor` shuts down, then fixture teardown shuts down again). It's harmless (`FakeSession.cleanup` and `InProcessCacheMonitor.shutdown` are idempotent) and it keeps teardown safe if an assertion fails first. Nit, left as is.

<details><summary>Full review</summary>

Scope: `git diff origin/release_26.2...HEAD` at `315bd644053`. 7 commits, with the Baseline tests commit (`cd7176a6032`) first.

1. **`enable_cache_monitor` (fine).** Two early gates (`disable_process_management`, per-store `enable_cache_monitor`), then one resolution chain: per-store `auto` → global driver → `auto` → celery/inprocess, then a celery-without-Celery warning. It's linear and has no nested branches. Pulling out a pure `_resolve_driver()` would add a name without removing a concept. Flipping the default `enable_cache_monitor` to `True` is the actual fix for #24546. The `cache_config_dict.get("monitor", "auto")` fallback is correct: XML always emits `monitor="auto"`, and YAML may omit it, and both now mean "defer to global".

2. **`InProcessCacheMonitor` (good).** Replacing `Sleeper` with `Event.wait` for both the initial sleep and the interval removes a helper and the lost-wakeup race in one step. The daemon thread and log-and-continue error handling are direct fixes. The initial-sleep comment kept its history. Only the placement changed.

3. **`_start_cache_monitor_if_needed` sized gate (fine).** It lives in the canonical base helper and adds no per-store conditionals. The `any(...)` matches what `check_cache` would skip anyway, so it is a pure "don't spawn an idle thread" optimisation.

4. **iRODS (good, net simplification).** `parse_config_xml` dropped its hand-rolled `<cache>` dict (−15 lines) for the shared `parse_caching_config_dict_from_xml`. That is the canonical-helper reuse this review looks for. It also fixed the dropped `monitor` attr (codex P1). It keeps the iRODS-specific required-`<cache>` error. Monitor start comes after the connection-pool setup, and stop runs in both `shutdown()` and `soft_shutdown()`. `soft_shutdown` needs its own call because iRODS overrides it to avoid `session.cleanup()`. The other stores inherit base `soft_shutdown()` → `shutdown()`, so they are covered.

5. **pithos (fine).** It starts at the end of `_initialize()`, like s3. `_initialize()` has only one caller (`__init__`), so there's no re-init leak. Its new `shutdown()` calls `super()`, which is more correct than the sibling overrides that don't.

6. **Lifecycle duplication across stores (structural, deferred).** See the top-line. This is the one real code-judo move available: the base class should own resolve, start and stop. It is out of proportion for 26.2.

7. **User-store pin (fine).** A class attribute `object_store_cache_monitor_driver = "external"` on the existing `GalaxyConfigAdapter` is the natural extension point. Store constructors gained no conditionals for it.

8. **Rucio (fine).** A single-literal default flip, consistent with the dict default.

9. **Tests.** The resolution table is one parametrized test. The subprocess exit test, the shutdown-interrupts-sleep test and the error-survival test exercise real threads, not mocks. The iRODS/pithos tests stub only the external clients (`iRODSSession`, `KamakiClient`, auth), so they always run. `test_user_object_store_skips_cache_monitor` checks through the adapter config, not store state, which is acceptable because a disk store has no cache. The pithos test adds +13 lines to `test_objectstore.py`, which is already 2614 lines, where the other pithos tests live.

10. **File sizes.** No file crosses 1k lines because of this branch: `caching.py` 329, `_caching_base.py` 620, `irods.py` 658, `pithos.py` 278, `test_caching.py` 492. `__init__.py` was already over 2k and gains +3; `test_objectstore.py` was already over 2.6k.

11. **Checks.** isort/black/ruff/flake8 are clean on all 10 changed files. mypy on the 6 changed lib files reports 478 errors, the same as `origin/release_26.2`. pytest: 239 passed, 16 skipped.

No security issues.
</details>
