---
type: research
subtype: component
tags:
  - research/component
  - galaxy/datasets
  - galaxy/api
  - galaxy/admin
  - galaxy/lib
component: "Object Store Cache and Direct Access"
galaxy_areas: [datasets, api, admin, lib]
status: draft
created: 2026-10-28
revised: 2026-10-28
revision: 1
ai_generated: true
summary: "How caching object stores serve bytes via cache pull, tee streaming and presigned redirects, plus shards, eviction and nested dispatch"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-Object-Store-Cache-and-Direct-Access.md"]
related_notes:
  - "[[Component - Dataset Display]]"
  - "[[Component - Private Object Stores]]"
  - "[[Component - Galaxy Pulsar Runner Code Sharing]]"
  - "[[Component - Backend Dependency Management]]"
  - "[[Component - Data Fetch]]"
  - "[[Component - API Tests]]"
related_prs: [22895, 24484, 23321, 23177, 23509]
---

# Object Store Cache and Direct Access

Verified against Galaxy `origin/dev` @ `7761eeb3256`. Paths are relative to the Galaxy root; `objectstore/` means `lib/galaxy/objectstore/`.

## Overview

A caching object store (`CachingConcreteObjectStore`, `objectstore/_caching_base.py:103`) keeps a local copy of remote objects. It hands bytes to Galaxy through three read paths:

| Path | Entry point | Bytes go through | Added by |
|---|---|---|---|
| **Pull into cache** | `get_filename(obj, ..., sync_cache=True)` | backend → local cache → caller reads a file | original design |
| **Tee stream** | `get_data_stream(obj)` | backend → HTTP response, optionally copied into the cache | #23321 |
| **Direct download** | `get_direct_download_url(obj, content_disposition, content_type)` | backend → client via 302 to a presigned URL; Galaxy never touches the bytes | #22895 |

Cache layout comes from #23177 (cache shards). #23509 made downloads atomic and size-checked. Open PR #24484 extends the stream and direct-download paths to metadata and extra files so Pulsar can stage job inputs without a handler-side cache pull (see [Pending in #24484](#pending-in-24484-open)).

**In scope:** the three read paths, cache config/shards/eviction, the `extra_dir`/`extra_dir_at_root`/`alt_name` addressing, `Distributed`/`Hierarchical` dispatch, and callers. The write path appears only where it changes the cache.

**Out of scope:** private/BYOS stores and templates ([[Component - Private Object Stores]]), quota accounting, and the UI display catalog ([[Component - Dataset Display]]).

## Class layering

```
ObjectStore (interface)              __init__.py:192   public x() → _invoke("x") → self._x()  (:613)
└─ BaseObjectStore                   __init__.py:529   no-op _get_direct_download_url / _get_data_stream
   ├─ NestedObjectStore              __init__.py:1352  every _x → _call_method (first hit)
   │  ├─ DistributedObjectStore      __init__.py:1531  routes by obj.object_store_id
   │  └─ HierarchicalObjectStore     __init__.py:1878  first hit; creates in backends[0]
   ├─ PulsarObjectStore              pulsar.py:9       not Concrete → direct download / stream are base no-ops
   └─ ConcreteObjectStore            __init__.py:887   enable_direct_download gate
      ├─ DiskObjectStore             __init__.py:1017
      └─ CachingConcreteObjectStore  _caching_base.py:103
         └─ s3 (aws_s3, generic_s3), s3_boto3, azure_blob, cloud, rucio, irods, onedata, pithos
Cache helpers: objectstore/caching.py (CacheTarget, CacheShard, CacheShardManager, check_cache, InProcessCacheMonitor)
```

The caching base implements the template methods (`_construct_path`, `_get_filename`, `_get_data_stream`, `_exists`, `_create`, `_size`, `_update_from_file`, ...). Backends supply primitives: `_download`, `_get_remote_size`, `_exists_remotely`, `_stream_remote`, `_push_*`, `_download_directory_into_cache`, `_get_object_url` (stubs at `_caching_base.py:569-618`).

### Backend matrix

| Backend | Tee stream (`_stream_remote`) | `_get_object_url` | Presign lifetime | `enable_direct_download` from XML |
|---|---|---|---|---|
| boto3 `S3ObjectStore` | yes (`s3_boto3.py:353`) | presigned GET with disposition/type (`:458-479`) | **3600 s**, hardcoded (`:473`) | yes |
| boto `aws_s3` / `generic_s3` | yes (`s3.py:322`) | `key.generate_url` (`:414-427`) | **86400 s**, hardcoded (`:424`) | yes |
| `azure_blob` | yes (`azure_blob.py:266`) | SAS token (`:322-342`) | **1 h**, hardcoded (`:334`) | yes |
| `cloud` (cloudbridge) | yes (`cloud.py:315`) | `key.generate_url` (`:378-390`) | **86400 s**, hardcoded (`:384`) | yes, via s3 parser |
| `rucio` | no | returns None | n/a | n/a |
| `irods` | no | returns an iRODS **logical path**, not a URL (`irods.py:653-664`) | n/a | YAML only |
| `onedata` | no | returns None | n/a | no |
| `pithos` | no | `publish_object` (`pithos.py:249-260`) | none | no |
| `DiskObjectStore` | no (base None) | returns None | n/a | n/a |

No presign lifetime is configurable at the SHA. The sample config says "~1 hour" (`config/sample/object_store_conf.sample.yml:200-206`), which is true only for boto3 and Azure.

## Cache configuration, shards and eviction

### Config

- Per-store `cache:` block. XML parsed by `parse_caching_config_dict_from_xml` (`caching.py:243-264`): `size` (GB, default -1 = unbounded), `path`, `monitor` (default `auto`), `cache_updated_data` (default True), optional `<dirs><dir path weight size/></dirs>`.
- Global defaults in `config_schema.yml`: `object_store_cache_path` (`:1279`), `object_store_cache_size` (`:1288`), `object_store_cache_monitor_driver` = `auto|inprocess|celery|external` (`:1250`), `object_store_cache_monitor_interval` = 600 (`:1268`).
- Each backend's `__init__` builds `self._cache_shards = CacheShardManager.from_config(cache_dict, self.config)` (e.g. `s3_boto3.py:222-223`).

### Shards

- `CacheShardManager` (`caching.py:81-158`) picks a shard by `sha256(str(object_id)) % total_weight` over cumulative weights; one shard short-circuits. `dirs` takes precedence over `path`/`size`.
- The key is `_get_object_id(obj)` (`__init__.py:601-611`): `obj.<store_by>` (`id` or `uuid`). A dataset and its extra files share a shard. A **`MetadataFile` hashes on its own id**, so it may land on a different shard (`test/unit/objectstore/test_caching.py:60-88`; noted in the sample config).
- `staging_path`, `cache_size` and `cache_target` report the **first shard only** (`_caching_base.py:533-551`). `cache_targets()` and `get_disk_paths()` cover all shards; job runners mount the latter (`jobs/runners/__init__.py:665,704`).

### Eviction

- `CacheTarget(path, size, limit=0.9)`; the 0.9 limit is hardcoded (`caching.py:111-121`).
- `fits_in_cache(bytes)` rejects a single object larger than `size × 0.9`. It compares against the whole budget, not free space (`:38-46`).
- `check_cache` walks a shard, sorts by `st_atime` and deletes oldest files until under the limit (`:166-219`). Atime-based (degraded under `noatime`), files only, and in-flight `*.tmp` files count.

### Who runs eviction

- **Celery:** `clean_object_store_caches` (`celery/tasks.py:760-762`), scheduled when the driver is `auto` or `celery` (`celery/__init__.py:339-340`).
- **In-process thread:** `InProcessCacheMonitor` (`caching.py:287-323`), started only when `enable_cache_monitor()` returns True (`caching.py:267-284`). That requires the **store's own config dict to set `enable_cache_monitor: true`**, and only rucio's XML parser emits that key (`rucio.py:91,141`).
- **Consequence:** with Celery off and no per-store YAML flag, nothing evicts, despite the `auto` description in `config_schema.yml:1255-1263`. iRODS and pithos never start a monitor.

## Read path 1: pull into cache

`CachingConcreteObjectStore._get_filename` (`_caching_base.py:423-458`):

1. `rel_path = _construct_path(obj, **kwargs)`. `base_dir` + `dir_only` + `obj_dir` (job working dir) returns a local path with no cache involved.
2. `cache_path` is resolved in the object's shard.
3. **`sync_cache=False` returns `cache_path` immediately**: the expected path, no download.
4. A cached file with size > 0 is returned. **A zero-byte cached file is re-pulled.**
5. `dir_only`: a cache dir containing any file is trusted; an empty one is re-downloaded with `_download_directory_into_cache` (no-op on pithos, irods, onedata).
6. Otherwise `_exists()` then `_pull_into_cache` → backend `_download`. Failure raises `ObjectNotFound`.

Backend `_download`s check `_caching_allowed` (`:350-361`). An object that doesn't fit the cache is **unreadable through `get_filename`**; only the stream path can serve it. Writes go through `_atomic_download` (`:575-601`): unique `.tmp` file, size check, `os.replace` (#23509). Only boto3 and legacy S3 pass `expected_size`; the other backends get no truncation check.

### `_exists` has side effects

`_exists` (`_caching_base.py:286-315`) always does a remote HEAD (`_exists_remotely`), even for a cached file. If the file is in the cache but not remote, it **pushes it to storage**. It runs:

- inside `Dataset.get_file_name`, before `get_filename`, **even with `sync_cache=False`** (`model/__init__.py:4917-4931`);
- at the start of every backend `_get_object_url`;
- on every first-hit probe of a Nested store.

## Read path 2: tee streaming

`ObjectStore.get_data_stream(obj) -> DataStream | None` (`__init__.py:427-437`) takes **only `obj`**, so it always serves the primary file. `DataStream` is a Protocol (`__iter__`, `__next__`, `close()`); a consumer that stops early must `close()` it.

`CachingConcreteObjectStore._get_data_stream` (`_caching_base.py:213-240`):

1. If the object is already in the cache (**any size, including 0**), return None so the caller serves the cached file with Range and X-Accel support. This is the opposite of `_get_filename`'s zero-byte rule.
2. `remote_size = _get_remote_size(rel_path)`; negative means unknown → None.
3. `write_cache = cache_target.fits_in_cache(remote_size)`. At the SHA `write_cache` is a local, not a parameter. Oversized objects stream through uncached.
4. `stream = self._stream_remote(rel_path)`, opened last. None or an exception → None (fall back to pull).
5. Return `_ClosingIterator(_tee_to_cache(...), stream.close)`.

`_tee_to_cache` (`:251-284`) writes chunks to an `_atomic_download` tmp file while yielding, and publishes only if the streamed size matches. A client disconnect unlinks the tmp file. `RemoteDataStream` (`:45-72`) pairs an SDK chunk iterator with its release call, because closing a botocore `iter_chunks` generator doesn't release the connection. Chunks are 1 MiB.

Rucio, irods, onedata and pithos have no `_stream_remote`, but still pay a `_get_remote_size` call before returning None.

## Read path 3: direct download

- `ObjectStore.get_direct_download_url(obj, content_disposition=None, content_type=None)` (`__init__.py:414-425`). There are **no addressing kwargs and no `expires_in`** at the SHA.
- `ConcreteObjectStore._get_direct_download_url` (`:968-975`) returns None unless `enable_direct_download` is set, then calls `self._get_object_url(...)`.
- The flag is read per concrete store (`:930`; XML via `parse_enable_direct_download_from_config_xml`, `:857-861`). In a Distributed store each backend element is parsed by its own class, so **the flag is per backend** and not inherited from the root.
- The public `get_object_url` has **no callers outside `objectstore/`**. `_get_object_url` is reached in practice only through `get_direct_download_url`.

## Addressing kwargs

`CachingConcreteObjectStore._construct_path` (`_caching_base.py:123-176`):

1. Validates `extra_dir` (must be normalised) and `alt_name` (`safe_relpath`, then `normpath`), raising `ObjectInvalid`.
2. Base is `directory_hash_id(object_id)`, e.g. `000/` (by id) or `b/5/e/` (by uuid).
3. `extra_dir`: with `extra_dir_at_root` → `extra_dir/<hash>`; otherwise `<hash>/extra_dir`.
4. `obj_dir` appends `/<object_id>`.
5. `base_dir` → `extra_dirs[base_dir]/rel_path`, a local path that **bypasses the cache**.
6. Unless `dir_only`, appends `alt_name` or `dataset_<object_id>.dat`.
7. `in_cache=True` returns the shard path; otherwise the remote key.

`DiskObjectStore._construct_path` applies `obj_dir` *before* `extra_dir` (`__init__.py:1196-1205`), so layouts differ when both are used without `extra_dir_at_root`. `_create` re-implements this logic inline instead of calling `_construct_path` (`_caching_base.py:317-348`; rucio copies it).

### How model code addresses objects

| Object | kwargs | Where |
|---|---|---|
| Primary dataset file | none | `Dataset.get_file_name`, `model/__init__.py:4917-4935` |
| Extra files dir | `dir_only=True, extra_dir=<dataset_N_files>` | `Dataset.get_extra_files_path`, `:4967-5011` |
| Single extra file | `extra_dir=<dataset_N_files>, alt_name=<relpath>` | `services/datasets.py:794-800,828-831`, `datatypes/data.py:601-604`, `managers/datasets.py:187-192` |
| `MetadataFile` | `obj=<the MetadataFile>, extra_dir="_metadata_files", extra_dir_at_root=True, alt_name=f"metadata_{id}.dat"` | `model/__init__.py:11372-11396` |
| Job working dir | `base_dir="job_work", dir_only=True, obj_dir=True` | `job_execution/setup.py:457-472` |

`MetadataFile` builds these kwargs inline at the SHA; there is no `object_store_path_kwargs()` helper yet (#24484 adds it). Its remote key is `_metadata_files/<hash(mf id)>/metadata_<id>.dat`. `MetadataFile.get_file_name` copies the dataset's `object_store_id` onto itself when unset (`:11378-11379`), so a Distributed store routes it to the dataset's backend. `MetadataFile.update_from_file` calls `get_file_name()` just to derive `alt_name`, which syncs the cache by default.

Extra files are written per file via `persist_extra_files_for_dataset` → `update_from_file(dataset, extra_dir=..., alt_name=f, create=True)` (`objectstore/__init__.py:2351-2371`). The same pattern is used by storage relocation (`managers/dataset_storage_operations.py:1500-1517`) and data-manager bundles (`tools/__init__.py:3754-3763`).

## Nested dispatch

`NestedObjectStore` implements every `_x` (including `_get_filename`, `_get_data_stream`, `_get_direct_download_url`, `_get_object_url`) by calling the chosen child's private `_x`.

| | Hierarchical (`NestedObjectStore._call_method`, `__init__.py:1493-1517`) | Distributed (`__init__.py:1747-1755`) |
|---|---|---|
| Backend selection | first child where `store.exists(obj, **addressing)` is true; **each probe on a caching child is a remote HEAD** that may push | `obj.object_store_id` (`__get_store_id_for`, `:1797-1837`); if None and `search_for_missing`, probes each backend and **writes back `obj.object_store_id`** |
| `_get_filename` miss | `ObjectNotFound` | `ObjectNotFound` |
| stream / direct URL miss | None | None |
| `_construct_path` / `_create` | `backends[0]` (`:1947-1952`) | `backends[obj.object_store_id]` (`:1718-1719`) |

`_get_direct_download_url` forwards only `content_disposition` and `content_type` (`:1449-1458`). The direct-download flag and presign lifetime belong to whichever concrete backend is selected.

## Callers per path

### Direct download (#22895)

- `GET /api/datasets/{id}/download` and `GET /api/histories/{history_id}/contents/{id}/download` (`webapps/galaxy/api/datasets.py:372-415`) → `_download` (`:417-437`).
- HEAD returns `download_head_headers` (`services/datasets.py:685-711`): no redirect, no cache pull.
- GET calls `DatasetsService.direct_download_url` (`services/datasets.py:657-683`). It is gated by `is_direct_download_candidate` (`:105-116`): no `filename`/`offset`/`ck_size`, not an archive or composite download, and `raw` or `to_ext` set.
- When no URL comes back the route **still 302s**, to the `display` route (`api/datasets.py:426-437`). Every download is a redirect.

### Tee stream (#23321)

- `GET .../display` → `_display` (`api/datasets.py:439-476`) with `allow_stream` true for GET without a `Range` header (`:147-155`).
- `DatasetsService.display` → `_stream_from_object_store` (`services/datasets.py:713-750`) when not `raw`. It sets `Content-Length` from `object_store.size()`, then calls `get_data_stream` last.
- `GalaxyStreamingResponse` (`webapps/base/api.py:236`) closes the stream on completion or failure and releases the DB session once streaming starts.
- No other `get_data_stream` callers at the SHA. Legacy WSGI display routes (eye icon, Markdown) never reach it; see [[Component - Dataset Display]].

### Pull into cache (`sync_cache=True`)

- Job inputs: `get_input_dataset_fnames` pulls the primary file, every `MetadataFile` and the extra-files dir (`job_execution/setup.py:212-220`); `get_input_path` (`:249-260`). These handler-side pulls are what #24484 targets for Pulsar.
- Extra-file display and hashing (the `alt_name` callers above).

### Expected path only (`sync_cache=False`)

- Job outputs (`job_execution/setup.py:297`), metadata `filename_override` (`metadata/__init__.py:209`), admin `file_name` serializer (`managers/datasets.py:320`). All still pay `Dataset.get_file_name`'s `exists()` HEAD.

## Write path, as it affects the cache

`_update_from_file` (`_caching_base.py:502-531`): optional `_create` (empty cache file + empty remote object), copy into the cache **only if `cache_updated_data`**, then `_push_to_storage`.

With `cache_updated_data=False` the cache keeps `_create`'s 0-byte placeholder. A later `get_filename` re-pulls it, but `get_data_stream` sees it as cached and returns None, so the request falls back to the pull path.

## Pending in #24484 (open)

Described from the PR diff (head `baeca0d7dc6c`), not from dev.

- Adds `MetadataFile.object_store_path_kwargs()` and refactors `get_file_name` to use it.
- `get_direct_download_url` gains `extra_dir`, `extra_dir_at_root`, `alt_name` and `expires_in`. `get_data_stream` gains `write_cache=True` plus the same addressing kwargs. Nested and Concrete layers pass `**kwargs` through.
- Each backend `_get_object_url` takes `expires_in=None` and keeps its current default (rucio ignores it). User downloads keep store defaults.
- New HMAC-signed staging route `GET|HEAD /api/jobs/{job_id}/staging/inputs/{dataset|metadata_file}/{id}`. It tries a 15-minute direct URL when `redirect`, then `get_data_stream(write_cache=False)`, then `get_filename` for disk stores.
- Pulsar runner destination param `object_store_staging: stream|redirect`; inputs are staged by URL and the handler calls `get_input_paths(..., sync_cache=False)`.
- Depends on galaxyproject/pulsar#553. Composite-input extra files are deferred to a follow-up. It concerns the Pulsar job runner, not `objectstore/pulsar.py`.

## Tests

- `test/unit/objectstore/test_caching.py`: shard selection, weights, `from_config`, a `StubCachingBackend` for `get_filename(sync_cache=False)` and shard-correct pulls.
- `test/unit/objectstore/test_objectstore.py`: direct-download parsing and URLs (`:801-850`, cloud `:2015-2050`), `test_get_data_stream_*` (`:895-1140`), per-backend `test_stream_remote_*` (`:1187-1271`), monitor and eviction (`:2150-2203`), Distributed cache targets (`:580`).
- `test/unit/objectstore/test_s3_cache_download.py`: atomic, size-checked downloads.
- `test/unit/webapps/galaxy/services/test_datasets_service.py`: `is_direct_download_candidate` and stream gating.
- Integration (SeaweedFS): `test/integration/objectstore/test_direct_download_redirect.py` (boto3 and cloud), `test_tee_streaming.py`, `test_remote_objectstore_cache_operations.py` (including the metadata file and `cache_updated_data=False`).

## Gotchas

1. The in-process cache monitor needs a per-store `enable_cache_monitor: true`; only rucio's XML parser sets it. Without Celery, nothing evicts.
2. The eviction limit is hardcoded at 0.9 and atime-based. `fits_in_cache` caps a single object at 90% of the budget, so oversized objects fail `get_filename` and can only be streamed.
3. Zero-byte cached files: re-pulled by `get_filename`, treated as hits by `get_data_stream`.
4. `_exists` is not read-only: a remote HEAD on every call, and it pushes cache-only files.
5. `staging_path`, `cache_size` and `cache_target` see only the first shard; a MetadataFile may sit on another.
6. On dev, streaming and direct download serve only the primary file. Metadata and extra files always go through the cache pull.
7. Presign lifetimes are hardcoded and inconsistent: 1 h (boto3, Azure) vs 24 h (legacy S3, cloud).
8. iRODS `_get_object_url` returns a logical path; with `enable_direct_download` the redirect target wouldn't be a URL.
9. Pithos `_download` never returns True, so `get_filename` raises after a successful download; pithos also never sets `cache_updated_data`.
10. iRODS `_get_remote_size` uses `data_obj.__sizeof__()` (`irods.py:442`), which looks wrong (not confirmed).
11. `PulsarObjectStore` subclasses `BaseObjectStore`, so its `_get_object_url` is never reached.
12. Path construction differs between disk and caching stores (`obj_dir`/`extra_dir` order), and `_create` duplicates it.

## Notes

- [[Component - Dataset Display]] covers the UI side of the display/download routes.
- [[Component - Private Object Stores]] covers user stores, which share Distributed's backend resolution and `ObjectStoreAuth` (only rucio consumes auth here).
- [[Component - Galaxy Pulsar Runner Code Sharing]] covers the Pulsar runner and `pulsar-galaxy-lib` pin that #24484 touches.
- [[Component - Backend Dependency Management]] covers the optional SDKs behind each backend.
- [[Component - Data Fetch]] writes primary datasets and extra files through `update_from_file`.
- [[Component - API Tests]] covers the test plumbing the objectstore integration tests build on.
