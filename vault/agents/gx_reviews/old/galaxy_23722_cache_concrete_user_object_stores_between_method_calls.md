# PR 23722 — [26.1] Cache concrete user object stores between method calls

- PR: https://github.com/galaxyproject/galaxy/pull/23722
- Author: mvdbeek
- Base: `release_26.1` (not draft), +226/-3, 4 files
- Head: `71725423d7d` (2 commits: `82ce4ad1115` cache, `71725423d7d` importorskip for iRODS test)
- Worktree: `~/projects/worktrees/galaxy/pr/23722`
- CI (2026-09-25): 56 pass, 1 skipping (a generic `Test` job), 0 fail
- No review comments or reviews yet. No linked issue; motivation is usegalaxy.eu tracing (`GET /api/datasets/{id}` p50 27 ms -> 248 ms after the 26.1.2.dev0 deploy, dominated by boto3 `HeadBucket` on every store rebuild).
- Unit tests not run locally (no `.venv` in worktree).

## Summary

`DistributedObjectStore._resolve_backend` rebuilt a concrete store for every `user_objects://` call (several per dataset show; a boto3 client plus `HeadBucket` each time). The PR adds `UserObjectStoreCache` (`lib/galaxy/objectstore/__init__.py:115`), which the `DistributedObjectStore` owns: an `OrderedDict` LRU (64 entries) keyed by uri. Each entry holds a sha256 of the resolved `ObjectStoreConfiguration`. Config is still resolved on every call (DB row + vault reads + template sort), so it catches secret rotation, template upgrades, variable edits and purges without cross-process invalidation. The store is built outside the lock. The loser of a build race gets `shutdown()`. Replaced or evicted stores get a new `soft_shutdown()`, which defaults to `shutdown()`. iRODS overrides it to leave the session open. The whole cache gets `shutdown()` when the distributed store shuts down.

Verdict: **approve, with minor comments**. The design fits a release branch: it is small, contained and correct across processes. It detects changes by comparing configs rather than using a TTL. I don't see any correctness bugs. The comments cover leftover per-call cost, iRODS session lifetime and a possible shared seam on `dev`.

## Verified correctness points

- **Cache key**: the key is the uri, and the value is guarded by a hash of the fully resolved config. That config includes secrets (`recover_secrets`), the environment (vault secrets and env vars), the template version and the sorted templates (`lib/galaxy/managers/object_store_instances.py:386-400`). All of these are deterministic (`lib/galaxy/managers/_config_templates.py:136-155, 269-294`), so the cache won't miss on every call. `app_config` (cache path, umask, ...) is not in the hash, but it is fixed per process.
- **Invalidation**: secret updates only touch the vault, but they change the resolved config. Upgrades change template version and variables. Purge deletes vault secrets. Hide/deactivate never blocked resolution before, so behaviour there is unchanged. The existing integration test `TestPerUserObjectStoreWithSecretsIntegration.test_creation_with_secrets` (`test/integration/objectstore/test_per_user.py:257-284`) rotates `sec1` and checks that the new path is used. `test_create_and_upgrade` covers upgrades. Both now go through the cache, and CI is green.
- **Multi-process**: each web, handler and celery process has its own cache and compares configs locally, so there is no stale-cache window.
- **Thread safety**: all dict mutation happens under `self._lock`. The build outside the lock is re-checked on insert, so the duplicate is discarded (`:144-158`). A failed build (exception) caches nothing.
- **Memory**: bounded at 64 per `DistributedObjectStore` (so per process).
- **Soft vs full shutdown**: user stores are never `start()`ed, and templates don't set `enable_cache_monitor`, so neither caching stores nor iRODS have running monitor threads. For every type except iRODS, `soft_shutdown()` -> `shutdown()` -> `_shutdown_cache_monitor()` is effectively a no-op, and in-flight users aren't affected.
- **Protocol change**: `object_store_from_config` is added to `UserObjectStoreResolver`. The only implementations are `UserObjectStoreResolverImpl` and test mocks, all via `BaseUserObjectStoreResolver`, so nothing breaks.
- Imports (`hashlib`, `OrderedDict`) are at module top. Comments are purposeful.

## Findings (ranked)

1. **(Question / perf) Per-call resolution cost remains**: `lib/galaxy/objectstore/__init__.py:133`. Every `_resolve_backend` still runs a `UserObjectStore` query, one vault read per persisted secret and environment secret, and `sort_templates`. This happens several times per dataset request. With the database vault this is cheap. With HashiCorp Vault each read is an HTTP round trip, which could become the next hot span on usegalaxy.eu. This isn't a blocker; the PR description consciously trades this for correctness. Worth checking the post-deploy traces. If vault reads show up, a short TTL (a few seconds) on the *resolved config* would keep the "config compare" semantics with bounded staleness. The resolved config could also be memoised per request/session.

2. **(Low) Retired iRODS stores never clean up their session**: `lib/galaxy/objectstore/irods.py:291-295`. `soft_shutdown()` only sets the monitor stop event. That monitor is never started for user stores, since the cache doesn't call `start()`. So on replace or evict, the iRODS session and its pooled connections live until the store is garbage-collected. This is strictly better than before, when every call leaked a session and nothing was ever shut down, so it's fine for 26.1. Question for the author: does python-irodsclient release pooled connections on GC? If not, deferred cleanup could be added later (e.g. `weakref.finalize(store, session.cleanup)`). Relatedly, the new iRODS unit test calls `object_store.start()`, which is not how user stores are used. It verifies the method, not the user-store path.

3. **(Low / reuse, dev follow-up) One-off cache vs shared seam**: `UserDefinedFileSourcesImpl._file_source` (`lib/galaxy/managers/file_source_instances.py:609`) has the same shape. It resolves secrets and environment, then rebuilds a plugin on every call. It would likely benefit from the same "resolve config, reuse the instance while its config hash matches" cache. `UserObjectStoreCache` is tied to `ConcreteObjectStore` (it calls `shutdown`/`soft_shutdown` and `resolve_object_store_uri_config`). A generic `ConfigKeyedCache[T]` in `galaxy.util` could work for both, with a key->config resolver, a builder, and dispose/soft-dispose callbacks. Keep the specific class for the release branch and suggest the extraction on `dev`. The hand-rolled `OrderedDict` LRU is justified over `cachetools.LRUCache` for two reasons. cachetools is pinned in Galaxy but is not a `galaxy-objectstore` package dependency (`packages/objectstore/setup.cfg`). And eviction needs a dispose hook plus the build-outside-lock race handling.

4. **(Nit) Hashing**: `:134`. Hashing `model_dump_json()` with sha256 works. Comparing the pydantic model directly (`cached_config == object_store_configuration`) would avoid serializing and hashing on every call. The store already holds the secrets in memory, so keeping the config object leaks nothing new. This is optional.

5. **(Nit / question) `maxsize=64` is hard-coded**: `:126`. Each entry can hold a boto3 client, a few MB. That's fine for most deployments, but a large multi-tenant web worker could evict often. Is a config option wanted, or is 64 deliberately fixed for the backport?

## Test assessment

- `test/unit/objectstore/test_user_object_store_cache.py` is meaningful. The repeated-call test fails without the fix (20 builds). The other tests cover config change -> rebuild with a soft shutdown of the old store, full shutdown on distributed shutdown, LRU order, and the concurrent duplicate being discarded via the re-entrant `during_next_build` hook, which is neat and deterministic. The tests reuse existing fixtures (`Config`, `MockDataset`, `DISTRIBUTED_TEST_CONFIG_YAML`, `TEST_URI`) rather than new scaffolding. They use the private `_resolve_backend`, which is acceptable.
- End-to-end invalidation (secret rotation, upgrade) is already covered by the existing integration tests in `test/integration/objectstore/test_per_user.py`, which now exercise the cache. The premise that "secret changes change the resolved config" is therefore tested with the real resolver and vault. It would help to point this out in the PR description.
- Gap (minor): nothing asserts that the cache is hit across *requests* in the integration suite, e.g. by counting builds. That would stop a future change (say, a non-deterministic field in the config) from silently turning the cache into a miss every time. A unit test on `UserObjectStoreResolverImpl` that resolves twice and checks equal hashes would be cheap insurance.
- The iRODS test is fine. The importorskip placement in commit 2 is correct.

## Draft GitHub review comment

> Posted by Claude (AI assistant) on behalf of jmchilton
>
> This looks good to me for 26.1. Detecting changes by comparing the resolved config is correct across web, handler and celery processes without any invalidation plumbing. I checked that the resolved config is deterministic and includes secrets, environment and template version, so secret rotation, upgrades and purges all rebuild. The existing `test_per_user.py` integration tests (`test_creation_with_secrets`, `test_create_and_upgrade`) now exercise this path, which is worth mentioning in the description.
>
> A few non-blocking comments:
>
> 1. Resolution still runs a `UserObjectStore` query plus one vault read per secret on every `_resolve_backend` call, several times per dataset request. That's cheap with the database vault, but with HashiCorp Vault it's an HTTP round trip each time. It might be worth watching the post-deploy traces. If it shows up, a short TTL on the resolved config would keep these semantics with bounded staleness.
> 2. iRODS: user stores are never `start()`ed, so `soft_shutdown()` only sets an event for a monitor that isn't running. Replaced or evicted stores keep their session and pooled connections until they're garbage-collected. That's still much better than before. Does python-irodsclient release pooled connections on GC? If not, `weakref.finalize(store, store.session.cleanup)` or similar could be a follow-up.
> 3. For `dev`: `UserDefinedFileSourcesImpl._file_source` rebuilds user file source plugins per call in the same way. A generic config-keyed cache (key -> resolved config, builder, dispose/soft-dispose hooks) could serve both instead of keeping this one object-store-specific. Not for this backport.
> 4. Nit: comparing the pydantic config directly (`==`) instead of hashing `model_dump_json()` on every lookup would be slightly cheaper. The store already holds the secrets in memory anyway.
> 5. Question: is `maxsize=64` intentionally not configurable?
