# PR 23177 — Add object store multi cache sharding

<https://github.com/galaxyproject/galaxy/pull/23177> — `davelopez`, base `dev`, merge-base
`532aeebdc814ace7f9ce6b2bb1573ed33e5eef33`, head `7dc225ae87`. 13 files, +680/-184.
Closes #20062; described as Phase B of discussion #23107.

**Verdict: mergeable in shape, no blocking correctness bug found.** The abstraction is the right
one — a single `CacheShardManager` owned by `CachingConcreteObjectStore`, so all eight caching
backends get sharding for free rather than one of them growing a bespoke feature — and the ~50
`_get_cache_path` / `_in_cache` / `_download` / `_push_to_storage` call sites are threaded
consistently (verified by grep; no stragglers). Three things I'd want resolved before merge, none
of them large: an unbounded memoization dict that every deployment pays for including
single-directory ones (finding 1), a silent fallback to the default cache path on a config typo
(finding 3), and a stated design property — metadata files co-locating with their dataset — that
is not true and whose unit test asserts it against a path shape the code never produces
(finding 2).

## What the change actually does

`CachingConcreteObjectStore` previously carried two scalar attributes, `staging_path` and
`cache_size`, each assigned directly by every backend's `__init__`, and derived a single
`CacheTarget` from them. This PR replaces both with one collaborator object,
`_cache_shards: CacheShardManager` (`lib/galaxy/objectstore/caching.py:81`), built once per
backend by `CacheShardManager.from_config(cache_dict, config)` (`caching.py:139`).

The manager holds a list of `CacheShard(path, weight, size)` and answers three questions:

- `get_cache_path(object_id, rel_path)` — which absolute path this object's cache entry lives at
- `get_cache_target(object_id)` — the size budget for *that* shard, used by `_caching_allowed`
- `cache_targets` / `paths` — all shards, for the monitor and the writability check

Shard selection (`caching.py:95-107`) is `sha256(str(object_id))` → 256-bit int → modulo the total
weight → linear scan of a cumulative-weight index. Using sha256 rather than `hash()` is the
correct call and is what makes the "deterministic across processes and restarts" claim in the PR
body actually hold — `hash()` on a str is `PYTHONHASHSEED`-salted and would have shattered the
cache on every restart.

The mechanical consequence is the bulk of the diff: `_get_cache_path(rel_path)` becomes
`_get_cache_path(rel_path, object_id)`, and every method that used to derive a cache path from
`rel_path` alone now also computes `object_id = self._get_object_id(obj)` and passes it down.
`_download`, `_push_to_storage`, `_caching_allowed`, `_get_size_in_cache` and `_pull_into_cache`
all gain a keyword-only `object_id`. That ripples through all eight backends.

Two smaller pieces:

- `InProcessCacheMonitor` now takes `list[CacheTarget]` and calls the pre-existing `check_caches`
  (`caching.py:164`) instead of `check_cache`, so every shard is monitored. The celery monitor
  driver needed no change at all — `lib/galaxy/celery/tasks.py:759` already called
  `object_store.cache_targets()` (plural), which existed on `BaseObjectStore` since before this PR.
- `_ensure_staging_path_writable` (`_caching_base.py:38`) loops over `self._cache_shards.paths`.

Backward compatibility is handled by keeping `staging_path`, `cache_size` and `cache_target` as
read-only properties returning shard 0 (`_caching_base.py:384-397`), which is why the existing
assertions at `test/unit/objectstore/test_objectstore.py:681`, `:881`, `:928`, `:982` pass
untouched.

### On reuse — the priority-1 question

I went looking for prior art before judging this novel. There are three existing pieces in the
tree that overlap:

1. **`DistributedObjectStore`'s weighting** (`lib/galaxy/objectstore/__init__.py:1426-1452`) —
   Galaxy's established idiom is to expand the id list by repeating each id `weight` times, then
   index into it. That is *random* selection (`random.choice` at `__init__.py:1583`), so it can't
   be reused directly for a cache that needs determinism — but the *expansion* half can be.
2. **`JobRuleHelper.choose_one(lst, hash_value)`** (`lib/galaxy/jobs/rule_helper.py:164-178`) —
   deterministic hash-to-index selection, `md5` → int → `% len(lst)`. Exactly the second half of
   `_select_shard`, minus weighting.
3. **`HandlerAssignmentMethods._get_single_item`** (`lib/galaxy/web_stack/handlers.py:307-315`) —
   the same `collection[index % len(collection)]` shape, and notably it short-circuits
   `if len(collection) == 1` before doing any work.

So weighted-deterministic selection *is* genuinely new; (1) is deterministic-free and (2) is
weight-free. But the composition of the two established idioms — expand by weight as in (1), index
by hash as in (2) — would collapse `_weighted_index`, `_total_weight`, the cumulative loop and the
unreachable fallback into about three lines, and would read as Galaxy code rather than as new
machinery. Worth at least a comment saying why the cumulative-weight form was preferred (it is
better for very large weights, which is a real if unlikely argument).

On priority 2 — does it leave a reusable abstraction? Yes, clearly. `CacheShardManager` lives in
`caching.py`, not in a backend, is constructed identically by all eight backends, and Pithos plugs
into it with a one-line degenerate shard (`pithos.py:97-100`) rather than being special-cased in
the base class. `parse_cache_dirs_from_xml` (`caching.py:59`) is shared between the generic XML
parser and iRODS' bespoke one. That is the right shape.

## Findings

### 1. CONFIRMED — `_select_shard`'s memo dict grows without bound, and single-directory deployments pay for it too

`lib/galaxy/objectstore/caching.py:93` allocates `self._shard_cache: dict[str, CacheShard] = {}`,
and `caching.py:97-105` memoizes every object id ever routed. Nothing ever evicts. The manager
lives for the lifetime of the object store, which lives for the lifetime of the process.

Critically, there is **no `len(self.shards) == 1` short-circuit**, so a deployment with the legacy
single `cache.path` — i.e. every existing Galaxy — starts accumulating this dict after this PR,
for a lookup whose answer is always the same shard.

Measured with a standalone transcription of the class (see "How this was verified"):

```
--- 3. _shard_cache growth for a LEGACY SINGLE-DIR deployment ---
shards: 1 entries: 100000  approx bytes: 11544864
bytes per cached uuid entry: 115.44864
```

~115 bytes retained per distinct object id, per object store backend, per process. A handler that
touches 5M datasets over its lifetime holds ~575 MB it can never release. `_get_cache_path` is on
the path of `exists`, `size`, `get_filename` and `update_from_file`, so "distinct object ids seen"
converges on "datasets this process has ever touched".

What the memo buys:

```
sha256+modulo: 268 ns per call
dict.get:        9 ns per call
```

260 ns, against an `os.path.exists` or a network round trip in the same call. That is not a trade
worth unbounded retention.

Fix is small — short-circuit the single-shard case the way `web_stack/handlers.py:311` already
does, and either drop the dict or bound it (`functools.lru_cache` on a module-level helper):

```python
def _select_shard(self, object_id: ObjectId) -> CacheShard:
    if len(self.shards) == 1:
        return self.shards[0]
    ...
```

### 2. CONFIRMED — metadata files do **not** co-locate with their dataset, and the test that says they do is testing a path shape that never occurs

The PR body states: "All cache entries for the same dataset — including `extra_files` and metadata
files — resolve to the same shard by hashing the dataset's object id."

Extra files: **true.** `DatasetInstance.get_extra_files_path`
(`lib/galaxy/model/__init__.py:4908-4916`) passes `self` — the dataset — with
`extra_dir=self._extra_files_rel_path`, so `_get_object_id` returns the dataset's id and the shard
matches.

Metadata files: **false.** `MetadataFile.get_file_name` (`lib/galaxy/model/__init__.py:11248-11272`)
passes `self` — the `MetadataFile` — with `extra_dir="_metadata_files"`,
`extra_dir_at_root=True`, `alt_name=f"metadata_{identifier}.dat"` where `identifier =
getattr(self, store_by)` on the `MetadataFile`. `MetadataFile` is its own mapped class
(`model/__init__.py:11206`) with its own `id` and its own `uuid` column, drawn from an id space
entirely independent of `Dataset`. So `_get_object_id` returns the metadata file's id and the shard
is uncorrelated with the dataset's:

```
--- 4. dataset vs its metadata file land on different shards? ---
1000/2000 datasets have their metadata file on a different shard (50.0%) - expected ~50% for 2 equal shards
```

This is **not a runtime correctness bug** — writes and reads for a metadata file both key on the
same `MetadataFile`, so lookups are self-consistent and nothing is lost. But it invalidates a
stated design property, and if co-location was a locality requirement from #20062 (a `.bai` on a
different mount from its `.bam`) then the implementation does not deliver it.

The test that appears to cover this doesn't. `test_caching.py:47-61`:

```python
main_path  = mgr.get_cache_path(obj_id, "000/dataset_12345.dat")
extra_path = mgr.get_cache_path(obj_id, "000/dataset_12345_files/extra.txt")
meta_path  = mgr.get_cache_path(obj_id, "000/metadata_12345.dat")
```

All three are handed the *same* `obj_id`, so the assertion is tautological — it can only fail if
`_select_shard` is nondeterministic. And `000/metadata_12345.dat` is not a path Galaxy produces:
because of `extra_dir_at_root=True` the real rel_path is
`_metadata_files/<directory_hash_id(metadata_file_id)>/metadata_<id>.dat`. The test would still
pass if metadata sharding were completely broken.

Either correct the PR description and drop the metadata leg of the test, or — if co-location is
wanted — route `MetadataFile` through its owning dataset's id, which would need `_get_object_id`
to grow a notion of "shard key" distinct from "path key". The latter is a real design decision, not
a tweak.

### 3. CONFIRMED — an invalid `dirs` block silently falls back to the default cache path, with no log line

`caching.py:144-161`. Entries with a falsy `path` are skipped, entries with `weight <= 0` are
skipped, and if the survivor list is empty the manager falls through to
`cache_dict.get("path") or config.object_store_cache_path`. Nothing is logged at any of the three
points.

The PR body frames this as intentional ("Zero or negative weight dirs are silently excluded. Empty
or invalid `dirs` falls back to legacy single-path behavior"), and the fallback itself is right.
The silence is the problem, specifically for the setup this PR exists to enable. An admin who
writes `paths:` instead of `path:`, or indents one `dirs` entry wrong, does not get an error — they
get Galaxy quietly caching every dataset to `database/object_store_cache` on the root filesystem
instead of the NVMe they provisioned, and they find out when the root volume fills. `log` is
already module-level in this file (`caching.py:19`); a warning per skipped entry plus one on the
fallback is a few lines.

Same argument applies more weakly to the per-entry skips even when *some* entries survive: a
three-shard config that silently becomes two-shard is a capacity surprise.

### 4. Minor — XML `<dirs>` support is implemented but undocumented and untested

`parse_cache_dirs_from_xml` (`caching.py:59`) is wired into both the generic XML parser
(`caching.py:257-259`) and iRODS' own (`irods.py:113-119`), and the PR body advertises the XML
form. But:

- `lib/galaxy/config/sample/object_store_conf.sample.yml` gained the `dirs` example (lines 21-31);
  `lib/galaxy/config/sample/object_store_conf.xml.sample` did not. That file documents `<cache>` in
  its header block (lines 11-20) and repeats a `<cache .../>` line for each backend — it is where
  an XML admin looks.
- No test constructs a `<cache><dirs>` element. `parse_cache_dirs_from_xml` has zero coverage;
  `git grep dirs test/unit/objectstore/` only hits the dict-shaped `from_config` cases.

### 5. Minor — the stub backend's `_get_object_id` returns the object, not its id, so the backend-level tests exercise `repr(MagicMock)` as an identifier

`test/unit/objectstore/test_caching.py:205-206`:

```python
def _get_object_id(self, obj):
    return obj
```

Real `_get_object_id` (`lib/galaxy/objectstore/__init__.py:498-508`) returns
`getattr(obj, self.store_by)`. With the stub, `_create(obj)` where `obj = MagicMock(); obj.id = 99`
feeds the MagicMock itself into `directory_hash_id`, producing:

```
rel_path = 000/<Ma/gic/Moc/k i/d='/436/441/337
```

The tests pass — nothing rejects those characters on POSIX — but `test_backend_create_and_delete`,
`test_backend_update_and_size` and the `_delete` calls are operating on paths derived from a
memory address, not from an id. Concretely,
`test_backend_pull_into_cache_writes_to_correct_shard` creates its file under `object_id=42`
(`test_caching.py:311`) and then "cleans up" with `backend._delete(obj)` (`test_caching.py:332`),
which routes on the MagicMock and so targets a different path in a possibly different shard. The
cleanup is inert.

`return obj.id` makes all of these exercise realistic ids and realistic `directory_hash_id`
output, at no cost.

### 6. Minor — rucio's `to_dict()["cache"]` loses `monitor` and `monitor_interval`

`rucio.py:347` changes `self.cache_config = cache_dict` to
`self.cache_config = self._cache_config_to_dict()`, and `rucio.py:331` puts that under `rval["cache"]`.
Rucio was the only backend that echoed the raw cache dict, so it was the only one whose `to_dict()`
preserved `monitor` / `monitor_interval`. Since `to_dict()` output is fed back through
`build_object_store_from_config` when reconstructing stores in job and metadata contexts, and
`enable_cache_monitor` (`caching.py:265-268`) reads exactly those two keys, a reconstructed rucio
store now falls back to `config.object_store_cache_monitor_driver` instead of the configured
driver.

This makes rucio consistent with the other seven backends, so it may well be the intended
direction — but it is an undocumented behaviour change riding along in a refactor. Alternatively
`_cache_config_to_dict` could carry the two keys through for everyone.

### 7. Minor — dead code and a dead default

- `caching.py:107` `return self.shards[-1]` is unreachable: `point < self._total_weight` always
  holds and the last cumulative entry equals `_total_weight`. Harmless as a guard, but note it also
  skips the memo write, so if it ever *were* reachable it would behave differently from the loop.
- `caching.py:75` — `float(d.get("size", -1)) if d.get("size") is not None else None`. The `-1`
  default can never be used; the guard already returns `None` in exactly the case the default
  covers. `float(d.get("size"))` would do.

### 8. Minor / SPECULATIVE — `_ensure_staging_path_writable` will `makedirs` an unmounted shard

`_caching_base.py:38-47` now loops and calls `os.makedirs(path, exist_ok=True)` for every shard.
The PR's recommended deployment is "two or more cache directories on different mount points". If
`/fast` fails to mount at boot, Galaxy creates `/fast` on the root filesystem and starts caching
there — no error, no warning, until the root volume fills. This is pre-existing behaviour for the
single-path case, but the PR multiplies the number of mounts in play and makes the multi-mount case
the headline feature. A `mountpoint`-style check is probably out of scope; logging each shard path
at startup would at least make it diagnosable.

### 9. Minor / SPECULATIVE — no validation that shard paths are distinct or non-nested

`CacheShardManager.__init__` (`caching.py:82-93`) validates only that the list is non-empty.
Duplicate paths, or nesting (`/cache` and `/cache/fast`), are accepted. `check_caches`
(`caching.py:164-166`) then walks the shared tree once per shard with an independent budget, and
`_clean_cache` deletes against a stale file list on the second pass. Unlikely, but cheap to reject
in the constructor next to the existing non-empty check.

### 10. Minor — `weight` is not coerced to int on the YAML path

`caching.py:151` — `weight = d.get("weight", 1)`, then `if weight <= 0`. The XML path coerces
(`caching.py:74`, `int(d.get("weight", 1))`) and so does `DistributedObjectStore`
(`__init__.py:1480`, `int(b.get("weight", 1))`). A YAML `weight: "3"` therefore raises
`TypeError: '<=' not supported between instances of 'str' and 'int'` at startup rather than being
accepted. It fails loudly, so this is low severity, but matching the existing idiom is free.

### 11. SPECULATIVE — direct construction with all-zero weights raises `ZeroDivisionError`

Reproduced:

```
--- 6. zero total weight when constructed directly ---
ZeroDivisionError integer modulo by zero
```

`caching.py:102`. Unreachable via `from_config`, which filters `weight <= 0`, and Pithos hardcodes
`weight=1`. But `__init__` already validates one precondition (non-empty); validating
`total_weight > 0` beside it keeps the class safe for the next caller.

## Non-findings (checked, clean)

- **`configured_cache_size` removal is a genuine dead-code deletion.**
  `git grep -n configured_cache_size 532aeebdc8` finds only the definition at
  `caching.py:143` — zero call sites at the merge-base, zero at HEAD. It was the only place that
  converted GB→bytes, and its absence does not change `CacheTarget.size` semantics, which have
  always been gigabytes (`caching.py:35`, `fits_in_cache` at `:44`, `check_cache` at `:176`).
- **All call sites threaded consistently.** Grepped every
  `_get_cache_path` / `_in_cache` / `_pull_into_cache` / `_download` / `_push_to_storage` /
  `_caching_allowed` / `_get_size_in_cache` reference across `lib/` and `test/`. Every one passes
  `object_id`; no overload left on the old signature. The keyword-only `*` on the new parameters is
  what makes this safe — a missed call site is a `TypeError` at import-adjacent time, not a silent
  wrong path.
- **`_download_directory_into_cache` correctly left alone.** It receives an already-resolved
  `cache_path` from `_get_filename` (`_caching_base.py:305`), so the four implementations
  (`azure_blob.py:263`, `cloud.py:263`, `s3.py:408`, `s3_boto3.py:382`) need no shard awareness.
- **The celery cache monitor needed no change.** `lib/galaxy/celery/tasks.py:759` already called
  `object_store.cache_targets()`, and `DistributedObjectStore.cache_targets`
  (`__init__.py:1252-1257`) already flattened across backends. The new override at
  `_caching_base.py:399` slots straight in, so the celery driver monitors every shard for free.
  This is the reuse working.
- **Cross-process determinism holds.** sha256, not `hash()`. Verified that a `UUID` object and its
  `str()` form select the same shard, which matters because `_get_object_id` returns a `UUID` for
  `store_by="uuid"` but the `ObjectId` alias also admits `str`.
- **Weight distribution is correct.** 3:1 over 100k ids → 75.11% / 24.89%.
- **No tests deleted, no assertions weakened, no test data edited.** The only edit to an existing
  test is `test/unit/objectstore/test_objectstore.py:1026`,
  `InProcessCacheMonitor(cache_target, …)` → `InProcessCacheMonitor([cache_target], …)`. That is a
  required signature adaptation, not a loosened assertion — the surrounding cleaning assertions are
  untouched.
- **Imports.** No function-level imports added anywhere in the diff
  (`git diff … | grep -E '^\+[[:space:]]+(import |from .* import )'` → empty). No `type: ignore` or
  `noqa` added. The `from typing import (Any,)` → `from typing import Any` tidy in
  `_caching_base.py` is incidental and fine.
- **Backward compatibility for existing configs.** A `cache:` block with `path`/`size` and no
  `dirs` produces exactly one shard at the same path with the same size, and `staging_path` /
  `cache_size` / `cache_target` still answer with it. Existing populated caches keep resolving.
- **`to_dict()` → `from_config` round trip survives sharding.** `to_config_dict`
  (`caching.py:125-137`) emits `dirs` for multi-shard and the legacy `path`/`size` pair for single,
  and `from_config` consumes both. This matters because serialized object store config is
  reconstructed in metadata/job scripts.
- **Pithos is handled cleanly.** `pithos.py:97-100` uses a degenerate `CacheShard` on
  `config.file_path` rather than being special-cased upstream. Incidentally it fixes a latent bug:
  Pithos never set `cache_size`, so `cache_target` would have raised `AttributeError`; it now
  returns `-1` (unbounded).
- **No new concurrency hazards.** No new locking was needed and none was removed;
  `_pull_into_cache` still goes through `_atomic_download`. The `_shard_cache` dict is
  GIL-safe for concurrent get/set. Sharding does not create cross-shard races because a given
  object id maps to exactly one shard for the process's lifetime.

## Test coverage assessment

**Net: good unit coverage of the new class in isolation, thin coverage of it in context.**

`test/unit/objectstore/test_caching.py` is 332 new lines, ~18 tests. The `from_config` fallback
matrix (`test_caching.py:108-168`) is the strongest part — a parametrized table covering empty
`dirs`, all-invalid `dirs`, empty dict, partial filtering, and the two-level size fallback. That is
the config-parsing surface an admin will actually hit, and it is covered properly.

What is not covered:

- **XML `<dirs>` parsing** — see finding 4. Zero tests for `parse_cache_dirs_from_xml`, in either
  the generic or the iRODS path, despite XML being an advertised config format.
- **`to_config_dict` → `from_config` round trip.** Untested in both directions. This is the path
  that keeps sharding working when an object store is reconstructed from serialized config in a
  metadata or job script, so it is arguably the highest-value missing test and the cheapest to add.
- **Per-shard size budgets.** `_caching_allowed` (`_caching_base.py:202`) now consults
  `get_cache_target(object_id)`, which is the entire point of per-`dir` `size`. No test asserts
  that a file too large for the small shard is rejected while the same file would fit the large one.
- **Cache monitoring across shards.** `_start_cache_monitor_if_needed` (`_caching_base.py:411`) now
  hands N targets to `InProcessCacheMonitor`. `test_objectstore.py:1023` still exercises exactly
  one, wrapped in a list. Nothing verifies that two shards both get cleaned.
- **Shard-count / weight change on a populated cache.** The PR explicitly scopes this out ("Runtime
  drain or weight changes are not part of this initial implementation. Old cache entries expire
  through normal LRU cleanup") — but the LRU-expiry claim itself is untested and only holds while
  the removed directory is still in `dirs`. A path dropped from the config is no longer walked by
  `check_caches` and leaks permanently.
- **Concurrent access.** Nothing, though I do not think sharding introduces a new race.
- **End-to-end.** No integration test. The natural home already exists:
  `test/integration/objectstore/test_remote_objectstore_cache_operations.py::TestCacheOperation`
  runs against a real Swift backend and asserts `files_count(self.object_store_cache_path)` after
  upload and after cache wipe. A sharded subclass overriding the config and asserting the file
  lands in exactly one of two shard dirs — and that a wipe of that shard triggers re-download —
  would cover findings 1 and 2's real-world shape for very little code. The PR ticks "I've included
  appropriate automated tests", which is defensible for a unit-testable class, but the stub-based
  tests never see a real `Dataset` or `MetadataFile`, which is precisely how finding 2 slipped
  through.

Finding 5 is the coverage-quality issue: the four `StubCachingBackend` tests look like
integration-shaped coverage but route on `repr(MagicMock)`.

## How this was verified

**I ran no Galaxy test suite.** The worktree has no `.venv`, and bootstrapping one would have
written into a worktree another review agent is using concurrently — the task explicitly forbade
modifying it. Everything empirical below comes from a standalone transcription of
`CacheShardManager` (verbatim apart from replacing the two NamedTuple imports), run outside the
worktree:

```sh
uv run --python 3.12 python \
  /private/tmp/.../scratchpad/shard_probe.py
```

```
--- 1. weighted distribution, 3:1 over 100k int ids ---
{'/fast': 75114, '/slow': 24886} fast fraction = 0.75114

--- 2. _shard_cache growth after 100k distinct ids (multi-shard) ---
entries: 100000  approx bytes: 8433754

--- 3. _shard_cache growth for a LEGACY SINGLE-DIR deployment ---
shards: 1 entries: 100000  approx bytes: 11544864
bytes per cached uuid entry: 115.44864

--- 4. dataset vs its metadata file land on different shards? ---
1000/2000 datasets have their metadata file on a different shard (50.0%)

--- 5. determinism across processes (sha256, not hash()) ---
shard for uuid 135ee48a-4f51-470c-ae2f-ce8bd78799e6: /a

--- 6. zero total weight when constructed directly ---
ZeroDivisionError integer modulo by zero

--- 7. UUID object vs str key ---
UUID obj -> /a | str -> /a
```

The 268 ns / 9 ns figures in finding 1 are `timeit` over 1M iterations of
`int.from_bytes(sha256(k).digest(),'big') % 4` versus `dict.get(k)` on a 36-char UUID string.

Everything else — call-site completeness, dead-code status of `configured_cache_size`, the
`MetadataFile` and extra-files object identity, import placement, the absence of weakened
assertions — was established by reading and `git grep`, with commands shown inline above.

**What I could not verify:** that the eight backends still work end to end (no live S3/Azure/Swift
backend, no test run); that mypy is clean on the property-overriding-attribute change in
`_caching_base.py:384-397`; and whether Pulsar, which consumes `galaxy.objectstore` as a shipped
package (`packages/packages_for_pulsar_by_dep_dag.txt` lists `objectstore`), has any out-of-tree
subclass that assigns `self.staging_path` or `self.cache_size` — both are now read-only properties,
so such an assignment becomes an `AttributeError`. All in-tree assignments were removed correctly.

## Open questions for the author

1. Is the `_shard_cache` memo load-bearing for something I'm not seeing? At 260 ns saved per call
   against unbounded retention — and paid by single-directory deployments that get no benefit — it
   looks like a clear net negative. Happy to be corrected if there's a profile behind it.
2. Was metadata-file co-location a requirement from #20062, or does the PR body overstate what
   `extra_files`-level co-location gives you? If it *is* a requirement, routing `MetadataFile`
   through its owning dataset needs a shard key distinct from the path key — worth deciding now
   rather than after deployments exist.
3. Should an invalid or partially-invalid `dirs` block warn rather than silently fall back? The
   failure mode is "quietly caches to the root filesystem", which is hard to notice.
4. `<dirs>` XML support is implemented and advertised but absent from
   `object_store_conf.xml.sample` and untested — intentional (XML being de-emphasised), or an
   oversight?
5. Was dropping `monitor` / `monitor_interval` from rucio's `to_dict()["cache"]` (finding 6) a
   deliberate normalization across backends, or a side effect of reusing `_cache_config_to_dict`?
6. Did you consider the expand-by-weight + hash-index composition of the two existing Galaxy idioms
   (`DistributedObjectStore.weighted_backend_ids` and `JobRuleHelper.choose_one`) instead of the
   cumulative-weight index? Not a blocker — but if there's a reason (very large weights), a comment
   would keep the next reader from "simplifying" it back.
7. Any appetite for a sharded subclass of
   `test_remote_objectstore_cache_operations.py::TestCacheOperation` before merge? It is the one
   test that would have caught the metadata-file assumption.
