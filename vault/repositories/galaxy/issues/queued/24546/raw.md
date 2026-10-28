# Caching object store caches never evict without Celery

Found while researching [[Component - Object Store Cache and Direct Access]] (gx_research, 2026-10-28). Verified against `origin/dev` @ `7761eeb3256`.

## Symptom

A Galaxy with `enable_celery_tasks: false` and a caching object store (S3, boto3, Azure, cloud, onedata) with a sized cache (`cache: {size: N}`) never evicts its cache. The cache grows unbounded and `fits_in_cache` / size limits are only enforced per-object at download time.

## Documented behavior

`lib/galaxy/config/schemas/config_schema.yml:1250-1266`, `object_store_cache_monitor_driver`:

> The default of 'auto' will use 'celery' if 'enable_celery_tasks' is set to true or 'inprocess' otherwise. This option serves as the default for all object stores and can be overridden on a per object store basis.

## Actual behavior

`lib/galaxy/objectstore/caching.py:267-284`:

```python
def enable_cache_monitor(config, config_dict) -> tuple[bool, int]:
    ...
    if config_dict.get("enable_cache_monitor", False) is False:
        return False, interval
    default_cache_driver = getattr(config, "object_store_cache_monitor_driver", "auto")
    monitor = cache_config_dict.get("monitor", default_cache_driver)
    if monitor == "auto":
        monitor = "celery" if getattr(config, "enable_celery_tasks", False) else "inprocess"
    return monitor == "inprocess", interval
```

- The driver resolution only runs when the store's own config dict has `enable_cache_monitor: true`. Default is False.
- Only rucio's XML parser emits that key (`objectstore/rucio.py:91,141`). s3/s3_boto3/azure_blob/cloud/onedata call `enable_cache_monitor(config, config_dict)` (e.g. `s3_boto3.py:209`) but their XML parsers never set it, so XML-configured stores can't enable the monitor at all; YAML users must know an undocumented key.
- `_caching_base._start_cache_monitor_if_needed` (`_caching_base.py:565-567`) therefore never starts `InProcessCacheMonitor`.
- Celery path (`celery/__init__.py:339-340`) schedules `clean_object_store_caches` for `auto`/`celery`, but beat doesn't run without Celery.
- Setting per-store `cache: {monitor: inprocess}` doesn't help either — the gate returns before `monitor` is read.
- iRODS and pithos never call `_start_cache_monitor_if_needed` at all.

## History

- #16052 (RFC, jmchilton, 2023): "Default `enable_cache_monitor` to false **if celery is enabled**, assume the scheduled task will deal with this task."
- #16110 / commit `33b07a18ece` ("Support external and celery managed object store caches") changed `config_dict.get("enable_cache_monitor", True)` to `... False` unconditionally. Before that, in-process monitoring was on by default. Looks like the "if celery is enabled" condition got lost, or the default was flipped on purpose ("inprocess seriously limits Galaxy's ability to scale") without updating the `auto` docs.

## Possible fixes (pick one, needs a call)

1. Drop the per-store `enable_cache_monitor` gate (or default it True) and let the driver decide: `auto` → inprocess when Celery off. Matches docs and RFC. Restores pre-#16110 behavior for non-Celery deployments (one monitor thread per process per store — the scaling concern from #16052).
2. Keep default-off but make it explicit: document that `auto` without Celery means *no* monitoring, change `auto` resolution to `external`, and log a warning at startup when a sized cache has no monitor. Parse `enable_cache_monitor` in the shared XML caching parser (`parse_caching_config_dict_from_xml`) so XML users can opt in.
3. Treat per-store `cache.monitor: inprocess` as an explicit opt-in that bypasses the gate.

Option 2's startup warning is cheap and worth doing regardless.

## Tests

- `test/unit/objectstore/test_objectstore.py:2150` `test_cache_monitor_thread` constructs `InProcessCacheMonitor` directly — doesn't cover `enable_cache_monitor()` resolution. A red test: unit-test `enable_cache_monitor(config_with_celery_off, {"cache": {"size": 1}})` expecting `(True, ...)` under the documented semantics (or a warning under option 2).
- `test/unit/app/test_tasks.py` covers the celery task.

## Labels

kind/bug, area/objectstore, area/configuration, area/admin. Related: #16052, #16110, #23177 (cache shards).
