With Celery disabled, caching object stores (S3, Azure, cloud, onedata, ...) never start the in-process cache monitor that `object_store_cache_monitor_driver: auto` promises, so sized caches grow without bound.

| Setting | Docs say | `dev` does |
|---|---|---|
| `enable_celery_tasks: false`, driver `auto` (default) | `inprocess` monitor evicts cache | no monitor at all |
| per-store `cache: {monitor: inprocess}` | `inprocess` monitor | no monitor at all |
| XML-configured S3/Azure/cloud/onedata | – | no way to turn the monitor on |

`config_schema.yml` documents the driver:

> The default of 'auto' will use 'celery' if 'enable_celery_tasks' is set to true or 'inprocess' otherwise.

But [`enable_cache_monitor()`](https://github.com/galaxyproject/galaxy/blob/7761eeb3256/lib/galaxy/objectstore/caching.py#L267-L284) returns before the driver is ever read unless the store's own config dict carries an undocumented `enable_cache_monitor: true`:

```python
if config_dict.get("enable_cache_monitor", False) is False:
    return False, interval
default_cache_driver = getattr(config, "object_store_cache_monitor_driver", "auto")
monitor = cache_config_dict.get("monitor", default_cache_driver)
if monitor == "auto":
    monitor = "celery" if getattr(config, "enable_celery_tasks", False) else "inprocess"
return monitor == "inprocess", interval
```

<details><summary>Details</summary>

- Only rucio's XML parser emits `enable_cache_monitor` (`objectstore/rucio.py:91,141`). s3, s3_boto3, azure_blob, cloud and onedata call `enable_cache_monitor(config, config_dict)` but their XML parsing never sets the key, so XML users can't opt in; YAML users must know the key exists.
- `_caching_base._start_cache_monitor_if_needed` therefore never creates `InProcessCacheMonitor`.
- The Celery beat task `clean_object_store_caches` covers `auto`/`celery`, but doesn't run without Celery.
- Size limits are then only checked per object at download time (`fits_in_cache`); nothing evicts.
- `test_cache_monitor_thread` (`test/unit/objectstore/test_objectstore.py`) builds `InProcessCacheMonitor` directly, so `enable_cache_monitor()` resolution is untested.

</details>

## Context

A follow-up to 🔀 #16110, which flipped the default from `config_dict.get("enable_cache_monitor", True)` to `False` unconditionally. Related to 🎯 #16052 — the RFC proposed defaulting it to false *if Celery is enabled*; that condition appears to have been lost.

## Proposed Approach

Remove the per-store `enable_cache_monitor` gate (or default it to true) and let `object_store_cache_monitor_driver` decide, so `auto` without Celery means `inprocess` as documented. Also log a startup warning when a store has a sized cache and resolves to no Galaxy-side monitor (`external`, or `celery` with Celery off), and add a unit test covering `enable_cache_monitor()` resolution.

## Alternative Approaches

We could instead keep monitoring off by default, change `auto` to resolve to `external` without Celery and update the docs, or treat an explicit `cache.monitor: inprocess` as an opt-in that bypasses the gate. The proposed approach matches the documented and RFC'd behavior; the alternatives keep a silent footgun for small, Celery-less deployments.

<details><summary>Alternatives In Detail</summary>

### Alternative: `auto` means `external` without Celery

<details><summary>Description</summary>

#### Details

Keep default-off, change `auto` resolution to `external` when Celery is off, update `config_schema.yml`, warn at startup for sized caches, and parse `enable_cache_monitor` in the shared XML caching parser so XML users can opt in.

#### Why the proposed approach is preferred

Avoids an extra thread per process per store (the #16052 scaling concern), but leaves simple deployments with unbounded caches unless admins read the warning; it changes documented behavior instead of fixing the code to match it.

</details>

### Alternative: explicit `cache.monitor: inprocess` bypasses the gate

<details><summary>Description</summary>

#### Details

Only read the gate when `monitor` is unset or `auto`.

#### Why the proposed approach is preferred

Fixes the most surprising case, but `auto` still silently does nothing without Celery.

</details>

</details>
