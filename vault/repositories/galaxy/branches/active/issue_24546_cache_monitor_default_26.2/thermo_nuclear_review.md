Run via Claude Opus 5.5 at default effort.

# Thermo-nuclear code quality review

Acted on: the driver resolution in `enable_cache_monitor()`. It used `default_cache_driver` as the `.get()` fallback, then checked `auto` a second time and used an `elif` warning. Now it is one chain: per-store `auto` → global driver → `auto` → celery/inprocess → warn if celery without Celery. Same behavior, one fewer concept. I also merged the separate `test_enable_cache_monitor_defaults_to_driver` into the resolution table and added two explicit per-store `auto` rows (global `external` → off, global `inprocess` with Celery → on). Commit `d9da4853bf6`.

Not acted on:
- **`size > 0` predicate now appears 3 times** (`CacheTarget.fits_in_cache`, `check_cache`, `_start_cache_monitor_if_needed`). A `CacheTarget.is_bounded` property would be cleaner, but adding it means touching untouched code on a release branch. Better done as a dev follow-up.
- **Warning lives in per-store resolution, not config load.** A config-time check can't see a per-store `<cache monitor="celery">`, and it would be a second site. It repeats per store, which is acceptable (normal_review_1 agreed).
- **`galaxy/celery/__init__.py` schedules cleanup only on global `auto`/`celery`.** A per-store `monitor="celery"` under a global `inprocess` driver gets no Celery task. That predates this branch and is out of scope.
- **`GalaxyConfigAdapter.object_store_cache_monitor_driver = "external"`** is a class attribute on the existing adapter, which is the right layer. No change.
- No file crosses 1k lines: `caching.py` is about 330, `_caching_base.py` 620, and `__init__.py` was already over 2k with +3 lines.

<details><summary>Full review</summary>

Verdict: approve after one small simplification. The diff is small, stays in the canonical layer (`caching.enable_cache_monitor`, `CachingConcreteObjectStore._start_cache_monitor_if_needed`, `InProcessCacheMonitor`), and adds no new flags or modes.

1. **`enable_cache_monitor` double-`auto` (fixed).** Before:
   ```python
   default_cache_driver = getattr(config, "object_store_cache_monitor_driver", "auto")
   monitor = cache_config_dict.get("monitor", default_cache_driver)
   if monitor == "auto":
       monitor = default_cache_driver
   if monitor == "auto":
       monitor = "celery" if enable_celery_tasks else "inprocess"
   elif monitor == "celery" and not enable_celery_tasks:
       warn
   ```
   Using the global driver as the `.get` fallback and also resolving `auto` to it is redundant. The `elif` ties the warning to the auto-branch structure, even though auto resolution can only produce `celery` when Celery is enabled. After: `.get("monitor", "auto")`, resolve `auto` to the global driver, resolve `auto` to celery/inprocess, then a plain `if` warning. The truth table is unchanged.

2. **`InProcessCacheMonitor` rewrite (fine).** Dropping `Sleeper` for `Event.wait` deletes a concept and fixes the lost wakeup. Making the thread a daemon and logging-and-continuing on errors are direct, boring fixes.

3. **`_start_cache_monitor_if_needed` sized gate (fine, minor duplication).** The gate is correct and cheap. The repeated `size > 0` predicate across three sites hints at a missing `CacheTarget` property. Deferred (see above).

4. **User-store adapter pin (fine).** It is the natural extension point. No conditionals were added to the store constructors.

5. **Rucio default flip (fine).** One literal, consistent with the `config_dict.get("enable_cache_monitor", True)` default.

6. **Tests.** The resolution table was split across two tests that covered the same function and differed only in the absent-vs-`True` gate key. Merged them. The subprocess daemon test and the error-survival test check behavior, not mocks, and both shut their monitors down. `test_user_object_store_skips_cache_monitor` checks through `enable_cache_monitor(object_store.config, ...)` rather than store state. That is acceptable because a disk store has no cache.

7. **Types.** `enable_cache_monitor(config, config_dict)` is still untyped. That predates this branch, and typing it would mean a config Protocol, which is out of proportion here.

No security issues.
</details>
