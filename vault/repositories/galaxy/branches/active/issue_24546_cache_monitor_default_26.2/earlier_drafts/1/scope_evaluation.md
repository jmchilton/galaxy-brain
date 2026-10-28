Run via Claude Opus 5.5 at default effort.

# Scope evaluation

**Recommendation: expand (modest).** Route iRODS and pithos through the same in-process monitor path as the other caching stores. Fold in the deferred `CacheTarget.is_bounded` helper. Both stores subclass `CachingConcreteObjectStore`, but neither calls `enable_cache_monitor()`, `_start_cache_monitor_if_needed()` or `_shutdown_cache_monitor()`. `config_schema.yml` names iRODS as a store the driver controls. The issue lists the gap too ("iRODS and pithos never call `_start_cache_monitor_if_needed`"). So after this branch, a Celery-less iRODS deployment with a sized cache still never evicts. That's the same bug in a sibling store, not a follow-up. The general fix is one shared setup step in the base class (resolve the driver, start if needed, shut down in `shutdown`) that all 8 caching stores use, in place of the 6 copy-pasted call sites. Everything else in the branch stays as is.

## Possible Decompositions

The branch is +171/-18 across 6 files, about 47 lines of lib and the rest tests. The baseline refactor already split it along natural lines:

1. **Baseline tests** (`cd7176a6032`): pins the `enable_cache_monitor()` resolution, the interval and `_start_cache_monitor_if_needed` for the cases that don't change. Lands first and stands alone.
2. **Monitor thread hardening** (`cd3ba1ea621`): daemon thread, `Event.wait` in place of `Sleeper`/`time.sleep`, log and continue on `check_caches` errors, plus 3 tests. It applies to base on its own and is a valid fix even with the monitor still off by default.
3. **Default fix** (`827116eff06`): the gate defaults to true, a per-store `auto` defers to the global driver, the monitor starts only for sized caches, the celery-without-Celery warning, user stores pinned to `external`, and the rucio default. It depends on (2): turning the monitor on by default without the daemon thread hangs CLI scripts.
4. *(If the expansion is adopted)* **iRODS/pithos wiring and shared base setup**: this could be a 4th commit or PR after (3), or folded into (3). It depends on (3)'s default semantics.

## Scope: as implemented

Make `object_store_cache_monitor_driver` decide in-process monitoring as documented, so `auto` without Celery means inprocess. Covers s3, s3_boto3, azure, cloud, onedata and rucio. Also hardens the monitor thread and pins user stores to `external`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the issue's main symptom for 6 of 8 caching stores</li><li>Matches the docs and the #16052 RFC</li><li>Small lib diff in the canonical layer</li><li>Thread hardening makes default-on safe</li></ul> | <ul><li>iRODS (named in the docs) and pithos are still never monitored in-process</li><li>The setup trio (resolve, start, shutdown) stays copy-pasted in 6 stores, so the next store can miss it the same way</li><li>`size > 0` is repeated 3 times</li></ul> |

## Scope: expand to iRODS/pithos through a shared base-class path (recommended)

Move driver resolution, start and shutdown of the cache monitor into `CachingConcreteObjectStore`, as one helper called after the cache shards are built plus `_shutdown_cache_monitor()` in shutdown. Then call it from iRODS and pithos too, and drop the duplicated lines from the other 6 stores.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the same bug in the 2 remaining stores; the docs name iRODS</li><li>Builds the reusable piece rather than an 8th copy</li><li>Removes the `enable_cache_monitor: bool` attribute that iRODS/pithos declare but never set</li><li>Only the inprocess driver is affected: Celery already cleans these stores through `cache_targets()`, so the change is contained</li></ul> | <ul><li>Touches 2 more store modules on a release branch</li><li>iRODS/pithos have their own XML parsers that don't read `<cache monitor=...>`, so they follow the global driver only (acceptable, but per-store override needs a small parser change if wanted)</li><li>iRODS already runs its own connection-pool thread, so shutdown ordering needs a look</li><li>Can't integration-test iRODS without Docker</li></ul> |

<details><summary>Details</summary>

- `CachingConcreteObjectStore.cache_targets()` returns `self._cache_shards.cache_targets`, and both iRODS (`irods.py:278-280`) and pithos (`pithos.py:95`) build `_cache_shards`. So `clean_object_store_caches` (Celery) already evicts their caches. Only the inprocess driver skips them, which is exactly the path this branch turns on by default.
- `irods.shutdown` (`irods.py:322`) only cleans up the session and the connection-pool monitor. Pithos has no `shutdown` override ("No need to overwrite shutdown"). The base-class route could add `_shutdown_cache_monitor()` to `CachingConcreteObjectStore.shutdown` (or the stores call it) so the subclass overrides don't each need it.
- If the shared helper feels too big for 26.2, the minimal version is 2 lines in each of iRODS/pithos `__init__`, plus a shutdown call. The issue still gets fixed for all stores.
- Tests: one unit test per store type is hard (iRODS and kamaki imports). Testing the shared helper on `StubCachingBackend` plus a structural check that iRODS/pithos call it is probably enough.
</details>

## Scope: fold in `CacheTarget.is_bounded`

Add a `CacheTarget.is_bounded` property (`size > 0`) and use it in `fits_in_cache`, `check_cache` and `_start_cache_monitor_if_needed`.

| Pros | Cons |
|---|---|
| <ul><li>Cheap, names a concept the branch now relies on at 3 sites</li><li>The thermo-nuclear review deferred it only for "release branch", a reason the process overrides</li></ul> | <ul><li>Touches untouched lines in `caching.py`</li><li>Pure refactor, no behavior gain</li></ul> |

Recommended alongside the main expansion.

## Scope: align Celery scheduling with per-store drivers

`celery/__init__.py:339` schedules `clean_object_store_caches` only when the *global* driver is `auto`/`celery`. A per-store `monitor: celery` under a global `inprocess`/`external` gets no task. And under global `auto` with Celery on, the task cleans every store's targets, including stores set to `inprocess` (which then also get a thread) or `external`.

| Pros | Cons |
|---|---|
| <ul><li>A related bug in the same resolution logic, flagged by the thermo-nuclear review</li><li>Makes per-store overrides actually honored</li></ul> | <ul><li>Beat scheduling happens at config time, before stores exist. Fixing it means either always scheduling the task or filtering targets in the task by each store's resolved driver: more design than the issue</li><li>The docs tell admins not to use per-store overrides at all</li><li>Rare configs; double cleaning is harmless</li></ul> |

Optional. Not recommended for this PR; worth a note in the PR description or a dev follow-up. A middle ground is filtering in `clean_object_store_caches` so it only cleans stores whose driver resolved to celery. That fixes double cleaning, but not the missing schedule.

## Scope: also warn for `external` with a sized cache

The issue proposed warning when a sized cache resolves to `external`. The branch warns only for `celery` without Celery.

| Pros | Cons |
|---|---|
| <ul><li>Covers everything the issue proposed</li></ul> | <ul><li>The docs recommend `external` (tmpwatch) for production, so every well-configured production server would log a warning on each start</li></ul> |

Not recommended. The branch's choice is right; mention it in the PR description.

## Scope: parse `enable_cache_monitor` in the shared XML parser

The issue's option 2 wanted XML users to be able to set the per-store gate.

| Pros | Cons |
|---|---|
| <ul><li>Symmetry with YAML and rucio</li></ul> | <ul><li>Moot now: the gate defaults on, and XML users can already opt out with `<cache monitor="external">` (`parse_caching_config_dict_from_xml` reads `monitor`)</li></ul> |

Not needed.

## Scope: monitor caches of user-defined stores

User stores are pinned to `external`, so Galaxy never cleans a templated S3 store's cache in-process.

| Pros | Cons |
|---|---|
| <ul><li>Unbounded caches for user stores without Celery</li></ul> | <ul><li>Same as before the branch</li><li>Per-configuration instances would each spawn a thread, and stores get replaced on change</li><li>Needs a shared or registry-level monitor, which is a new design</li></ul> |

Not recommended. That's separate work.

## Scope: contract

Ship only the gate flip, or only the thread hardening.

| Pros | Cons |
|---|---|
| <ul><li>Smaller diffs</li></ul> | <ul><li>The gate flip without hardening hangs CLI scripts (non-daemon thread) and the monitor can die silently</li><li>Hardening alone doesn't fix the issue</li></ul> |

Not recommended. The decomposition above already lets John land the pieces separately if wanted.
