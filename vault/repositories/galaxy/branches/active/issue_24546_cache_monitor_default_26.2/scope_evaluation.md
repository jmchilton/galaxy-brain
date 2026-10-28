Run via Claude Opus 5.5 at default effort.

# Scope evaluation (round 2, after re-scope)

**Recommendation: expand (modest).** The issue's bug is now fixed for all 8 caching stores. Two gaps remain in code this branch touches:

1. **Pithos XML never parses `<cache>`.** Its `parse_config_xml` (`pithos.py:36-84`) reads only `auth`, `container`, `extra_dir` and `private`. An XML pithos store falls back to the global `object_store_cache_size`/`object_store_cache_path` (`CacheShardManager.from_config`), so it does get the monitor from the global settings. But it can't set a per-store size, path, `dirs` or `monitor`, so the per-store `monitor="external"` opt-out the branch relies on doesn't reach it. That's the same gap `32b5a9841c7` closed for iRODS. The fix is one line (`r["cache"] = parse_caching_config_dict_from_xml(config_xml)`) plus a parse test.
2. **The cache monitor lifecycle should move into `CachingConcreteObjectStore`.** Resolve, start after the shards are built, and stop in a base `shutdown()`/`soft_shutdown()`. Every review deferred this for "release branch" and "touches stores this branch doesn't otherwise change", and the process overrides both reasons. It's also more than cleanup: the bug class here is a caching store that forgets to wire the trio, and that's exactly how iRODS and pithos stayed broken.

Celery per-store scheduling stays out: three reviewers agree it needs design. A round-2 expansion parks the branch as BLOCKED for John's call. Everything listed under "What still applies" survives either way.

## Possible Decompositions

The branch is +237/-36 across 10 files: about 60 lib lines, the rest tests. The current history already splits cleanly:

1. **Baseline tests** (`cd7176a6032`): pins the current `enable_cache_monitor()` resolution, the interval, and `_start_cache_monitor_if_needed`. Lands first on its own.
2. **Monitor thread hardening** (`cd3ba1ea621`): daemon thread, `Event.wait` instead of `Sleeper`, log-and-continue on `check_caches` errors. Valid on base by itself, and a prerequisite for (4), since without it default-on hangs CLI scripts.
3. **iRODS XML uses the shared cache parser** (`32b5a9841c7`): neutral on base, prep for (5). *(Expansion: the pithos one-liner from gap 1 fits here as a sibling prep commit.)*
4. **The fix** (`e84f5111dad`, `Fixes #24546`): the gate defaults to true, per-store `auto` defers to the global driver, the monitor starts only for sized caches, the celery-without-Celery warning, user stores pinned to `external`, and the rucio default. Depends on (2).
5. **iRODS/pithos wiring** (`6fe63109810`): resolve, start and stop in both stores, including iRODS `soft_shutdown`. Depends on (3) and (4). The alt `issue_24546_cache_monitor_default_26.2_alt_original_scope` is (1)+(2)+(4) without it.
6. *(Expansion)* **Base-class lifecycle**: on top of (5), or replacing (5)'s per-store calls if done before it lands. It could also be a separate dev PR if John wants 26.2 to stay per-store.

Cuts John could take: (1)+(2) as a standalone hardening PR, then (3)-(5). Or (1)-(4) via the alt, with (5)/(6) as a follow-up.

## Scope: as implemented

`object_store_cache_monitor_driver` decides in-process monitoring as documented (`auto` without Celery means inprocess) for all 8 caching stores. The monitor thread is hardened, iRODS XML is routed through the shared parser, and user stores are pinned to `external`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the issue for every caching store, including iRODS, which the docs name</li><li>Matches the config docs and the #16052 RFC</li><li>iRODS parser change deletes code (-15 lines)</li><li>Clean commit series, with an alt for the original scope</li></ul> | <ul><li>XML pithos still ignores per-store `<cache>`, including `monitor="external"`, so it follows only the global size and driver</li><li>The resolve/start/stop trio is now copy-pasted in 8 stores, so the next store can miss it the same way</li><li>`size > 0` appears in 3 places</li></ul> |

## Scope: pithos XML parses `<cache>` via the shared parser (recommended)

Add the shared `parse_caching_config_dict_from_xml` call to pithos `parse_config_xml`, mirroring the iRODS prep commit. Pithos `to_dict` echoes `config_dict`, so the parsed cache dict round-trips with no other change.

| Pros | Cons |
|---|---|
| <ul><li>Related gap in a file this branch already changes; same shape as the iRODS fix codex flagged as P1</li><li>Lets XML pithos set per-store size, path, shards and `monitor="external"`</li><li>One line plus one parse test; no kamaki needed</li><li>Every other caching store already calls the shared parser</li></ul> | <ul><li>Behavior change for XML pithos: a `<cache size=...>` element that was silently ignored would now apply</li><li>Pithos is lightly used; the example XML has no `<cache>`</li></ul> |

## Scope: base-class cache monitor lifecycle (recommended)

`CachingConcreteObjectStore` owns the cache monitor's resolve/start/stop. Its `__init__` (or a helper) resolves `enable_cache_monitor()`, one hook starts the monitor once `_cache_shards` exists, and base `shutdown()`/`soft_shutdown()` stop it. The per-store lines come out of all 8 stores. The iRODS/pithos lifecycle tests then test the base hook, plus a check that each store reaches it.

| Pros | Cons |
|---|---|
| <ul><li>Removes the bug class behind iRODS/pithos staying broken; a new store gets it for free</li><li>Drops the bare `enable_cache_monitor: bool` / `cache_monitor_interval: int` declarations that a store could leave unset</li><li>Every deferral reason on record is one the process overrides</li><li>`CacheTarget.is_bounded` can ride along cheaply</li></ul> | <ul><li>Touches 6 stores the branch doesn't otherwise change, on 26.2</li><li>Stores start at different points: end of `_initialize` (s3, pithos), after connection-pool setup (iRODS). The base hook must run after shards exist and after any init that can fail, otherwise a failed init leaks a (daemon) thread</li><li>Some sibling `shutdown()` overrides don't call `super()`, so each override gets touched anyway</li><li>iRODS `soft_shutdown` skips `session.cleanup()`, so the base `soft_shutdown` has to own the stop, not delegate to `shutdown()`</li><li>Re-points 3 lifecycle tests; integration coverage of the real stores still needs Docker</li></ul> |

<details><summary>Details</summary>

- Current sites: azure_blob 125/158/349, cloud 79/129/396, onedata 114/142/295, s3 157/200/433, s3_boto3 209/236/504, rucio 343/353/619, irods 268/308/312+332, pithos 97/112/115.
- A minimal shape: an `_init_cache_monitor(config, config_dict)` called where each store now calls `enable_cache_monitor()`, keeping `_start_cache_monitor_if_needed()` per store (start order really does differ) and moving only the stop into base `shutdown`/`soft_shutdown`. That removes the "forgot to stop" half for free, and leaves only one explicit call per store for the start.
- If John prefers 26.2 to stay per-store, this works as commit (6) in a dev PR. Nothing on the branch blocks it.
</details>

## Scope: fold in `CacheTarget.is_bounded`

A `size > 0` property used in `fits_in_cache`, `check_cache` and `_start_cache_monitor_if_needed`.

| Pros | Cons |
|---|---|
| <ul><li>Names a concept the branch now relies on at 3 sites</li></ul> | <ul><li>Pure refactor; touches unchanged lines</li></ul> |

Optional. Take it with the base-class lifecycle if that's done, otherwise skip it.

## Scope: align Celery scheduling with per-store drivers

`celery/__init__.py:339` schedules `clean_object_store_caches` from the *global* driver only, and the task scans every store's targets. A per-store `celery` under a global `external` gets no task, and a per-store `external`/`inprocess` under a global `auto`+Celery still gets cleaned by the task.

| Pros | Cons |
|---|---|
| <ul><li>Related resolution bug (codex P1, thermo review)</li></ul> | <ul><li>Pre-existing</li><li>Beat schedules at config time, before any store exists, so it needs design (always schedule plus filter in the task)</li><li>The docs tell admins not to use per-store overrides</li><li>Double cleaning is harmless</li></ul> |

Not recommended here. Put a note in the PR description and treat it as a dev follow-up.

## Scope: one monitor per deployment instead of per process

With the gate on by default, every web and handler process spawns one thread per sized store, all scanning the same directories. That's #16052's scaling concern. The only existing gate plumbed to object store config is `disable_process_management` (metadata scripts). No "main process only" signal reaches `enable_cache_monitor()`.

| Pros | Cons |
|---|---|
| <ul><li>Cuts redundant scans in multi-process non-Celery deployments</li></ul> | <ul><li>Restores pre-#16110 behavior, which shipped for years</li><li>Needs a new process-role signal threaded into the object store config, which is new design</li><li>The docs already steer production toward `external`/Celery</li></ul> |

Not recommended. Mention it in the PR description.

## Scope: warn for `external` with a sized cache

Log a startup warning when a sized cache resolves to `external`, as the issue proposed.

| Pros | Cons |
|---|---|
| <ul><li>Covers everything the issue proposed</li></ul> | <ul><li>`external` is the documented production setup, so every well-configured server would warn on start</li></ul> |

Not recommended. The branch warns only for celery without Celery, which is right.

## Scope: monitor user-defined store caches

Let templated user stores run the in-process monitor instead of being pinned to `external`.

| Pros | Cons |
|---|---|
| <ul><li>Unbounded caches for templated stores without Celery</li></ul> | <ul><li>Same behavior as before the branch</li><li>Per-configuration instances would each spawn a thread, so it needs a registry-level monitor</li></ul> |

Not recommended. That's separate work.

## Scope: contract

Ship the alt (original scope) or the hardening alone.

| Pros | Cons |
|---|---|
| <ul><li>Smaller PRs</li></ul> | <ul><li>The alt leaves iRODS (named in the docs) and pithos unmonitored</li><li>Hardening alone doesn't fix the issue</li></ul> |

Not recommended. The decompositions above already allow splitting.

## What still applies if expanded

- Resolution-table, interval, unsized, celery-warning, XML-defers and rucio tests in `test_caching.py`: unchanged.
- Monitor thread tests (subprocess exit, shutdown interrupts sleep, survives check error): unchanged.
- User-store pin and its test: unchanged.
- iRODS parser test: unchanged. A pithos parse test is new.
- iRODS start/soft-shutdown and pithos start tests: they stay valid as behavior tests, but the base-class change would move what they guard. Re-run red checks against a store with its start call removed.
- Earlier codex, thermo-nuclear and test-challenge rounds cover commits (1)-(5). Only the new pieces need review.
