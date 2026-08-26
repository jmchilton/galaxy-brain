# PR 23177 — Object Store Multi Cache Sharding — Thermo-Nuclear Review

**Depth:** thermo-nuclear code-quality pass (`jmchilton:thermo-nuclear-code-quality-review`).
A separate standard review lives at `23177_object_store_multi_cache_sharding.md`; this file is
the harsh maintainability/abstraction audit and deliberately does not duplicate it.

| | |
|---|---|
| PR | https://github.com/galaxyproject/galaxy/pull/23177 |
| Title | Add object store multi cache sharding |
| Author | davelopez |
| Base | `dev` |
| Merge base | `532aeebdc814ace7f9ce6b2bb1573ed33e5eef33` |
| Head | `7dc225ae87` (11 commits) |
| Diffstat | 13 files, +680 / −184 |
| Worktree | `/Users/jxc755/projects/worktrees/galaxy/pr/23177` |
| Closes | #20062 (Phase B of discussion #23107) |

## Verdict

**Request changes.**

The feature is well-motivated, the config surface is sensible, and backward compatibility for
single-path caches is genuinely preserved. But three things block:

1. A **new data-loss path**: making `PithosObjectStore` satisfy the cache interface with
   `size=-1` on `config.file_path` turns the celery `clean_object_store_caches` task from a loud
   `AttributeError` into a recursive `os.remove` sweep of Galaxy's primary dataset directory
   (F1).
2. A **production memory leak**: `CacheShardManager._shard_cache` is an unbounded, never-evicted
   dict keyed on every object id the process has ever touched, memoizing a ~1 µs SHA-256 (F2).
3. A **structural regression**: `object_id` is threaded through ~40 call sites across 7 backend
   modules purely as a shard-routing token, when the resolved cache *path* is what every callee
   actually wants. The sharding concept leaks into every backend instead of staying in
   `caching.py` (F3).

F3 is the "code judo" finding. Fixing it should roughly halve the diff and confine sharding to
two files. F1 and F2 are small, local, and must be fixed regardless.

**What I could not verify** — see the [Not verified](#not-verified) section at the bottom. Short
version: I ran **no** tests (no `.venv` in the worktree, and the brief forbade heavy suites), so
everything here is static reading. My behavioral claims about `check_cache` and `_clean_cache`
are read off the code, not observed.

---

## F1 — Pithos now hands Galaxy's `file_path` to the cache reaper (severity: high, blocking)

`lib/galaxy/objectstore/pithos.py:97`

```python
self._cache_shards = CacheShardManager([CacheShard(path=self.config.file_path, weight=1, size=-1)])
```

The comment above it is honest about intent ("satisfies the interface without enabling
multi-shard behavior"), but satisfying the interface is exactly the problem. Trace it:

- `CachingConcreteObjectStore.cache_targets()` (`_caching_base.py:399`) now returns
  `[CacheTarget(config.file_path, -1, 0.9)]` for Pithos.
- `lib/galaxy/celery/tasks.py:759` — `clean_object_store_caches` calls
  `check_caches(object_store.cache_targets())` over every backend, unconditionally.
- `check_cache` (`caching.py:169`) has **no guard for non-positive size**:

  ```python
  cache_size_in_gb = cache_target.size * ONE_GIGA_BYTE          # -1 GB
  if total_size > (cache_limit := cache_size_in_gb * cache_target.limit):   # x > -966_367_641 → always
      delete_this_much = total_size - cache_limit               # total_size + 966 MB
      _clean_cache(file_list, delete_this_much)
  ```

- `_clean_cache` (`caching.py:196`) then `os.remove`s entries from the recursive walk until
  `deleted_amount >= delete_this_much` — which, because `delete_this_much > total_size`, is
  *every file under the path*.

Before this PR, `CachingConcreteObjectStore.cache_target` read `self.cache_size`, and
`cache_size: int` was only a **class annotation** — never assigned by Pithos. So `cache_targets()`
raised `AttributeError` and the celery task failed loudly. The PR replaces that loud failure with
a silent recursive delete of `config.file_path`.

Note `CacheTarget.fits_in_cache` *does* have the guard (`if not (self.size > 0): return True`).
`check_cache` was simply never given the matching one.

**Fix — two parts, both small:**

```python
# caching.py — mirror the guard fits_in_cache already has
def check_cache(cache_target: CacheTarget):
    if not (cache_target.size > 0):
        return  # unbounded cache — nothing to enforce
    ...
```

```python
# pithos.py — Pithos has no cache; do not advertise one
def cache_targets(self) -> list[CacheTarget]:
    return []
```

The `check_cache` guard is worth having on its own merits: `object_store_cache_size` **defaults
to `-1`** (`lib/galaxy/config/schemas/config_schema.yml:1238`) and
`parse_caching_config_dict_from_xml` defaults `size` to `-1.0`, so *any* caching backend
configured without an explicit cache size already hits this branch and has its entire cache
wiped on every monitor tick. That part is pre-existing and not this PR's fault — but
`CacheShardManager.from_config` is now the canonical home for cache-size defaulting, so this is
the right PR to close it.

## F2 — `_shard_cache` is an unbounded memo of a 1 µs hash (severity: high, blocking)

`lib/galaxy/objectstore/caching.py:93,97,105`

```python
self._shard_cache: dict[str, CacheShard] = {}
...
def _select_shard(self, object_id: ObjectId) -> CacheShard:
    key = str(object_id)
    shard = self._shard_cache.get(key)
    if shard is not None:
        return shard
    digest = hashlib.sha256(key.encode()).digest()
    ...
    self._shard_cache[key] = shard
```

Object stores are process-lifetime singletons. `_select_shard` runs on essentially every cache
path construction, and the dict is never evicted, never bounded, never cleared. One entry per
distinct object id the process has ever seen: a 36-char UUID key plus dict overhead is on the
order of 150 bytes, so a busy handler touching a million datasets carries ~150 MB of dead
weight, per caching backend, forever. In a `distributed` store with several caching backends
that multiplies.

What it buys: skipping one `hashlib.sha256` over ≤36 bytes plus an `int.from_bytes` and a
2–3 iteration loop. Sub-microsecond. The memo is strictly worse than the thing it replaces on
every axis except a microbenchmark nobody will run. It is also mutated without a lock from
request threads — benign under CPython's GIL today, not something to rely on.

**Fix:** delete `_shard_cache` entirely. Three lines removed, one field removed, no behavior
change.

## F3 — `object_id` is plumbed through 7 backends when the callees only want a path (severity: high, structural)

This is the code-judo finding and the reason the diff is +680 instead of ~+250.

The PR's shape is: "the shard depends on `object_id`, therefore every function that needs a
cache path must receive `object_id`." That propagates the parameter to:

- `_get_cache_path(rel_path, object_id)` — **~40 call sites** across `_caching_base.py`,
  `s3.py`, `s3_boto3.py`, `azure_blob.py`, `cloud.py`, `onedata.py`, `irods.py`, `pithos.py`,
  `rucio.py`
- `_in_cache(rel_path, object_id)`, `_pull_into_cache(rel_path, *, object_id)`,
  `_get_size_in_cache(rel_path, *, object_id)`, `_caching_allowed(rel_path, *, object_id, ...)`
- `_download(rel_path, *, object_id)` and `_push_to_storage(rel_path, source_file, from_string, *, object_id)`
  in **every** backend
- `_register_file(rel_path, file_name, *, object_id)` in rucio
- nine freshly-added `object_id = self._get_object_id(obj)` lines
- a new exported type alias `ObjectId` imported into seven modules

Now look at what the callees actually do with it. Every single `_download` implementation:

```python
def _download(self, rel_path, *, object_id: ObjectId):
    local_destination = self._get_cache_path(rel_path, object_id)   # first line, every backend
    ...
```

`object_id` is never used again except to reach `_caching_allowed`, which only uses it to pick a
`CacheTarget`. `_push_to_storage` uses it for exactly one thing:
`source_file = source_file or self._get_cache_path(rel_path, object_id)`. None of these
functions care about the object. They care about *where the cache entry lives*.

**The judo move: resolve the shard once per public entry point and pass paths downward, not ids.**

```python
def _download(self, rel_path: str, cache_path: str) -> bool: ...
def _pull_into_cache(self, rel_path: str, cache_path: str, **kwargs) -> bool: ...
def _caching_allowed(self, rel_path: str, cache_target: CacheTarget, remote_size: int | None = None) -> bool: ...
def _push_to_storage(self, rel_path, source_file, from_string=None): ...   # source_file now required
```

Consequences, all subtractive:

- `ObjectId` disappears. The alias is `int | UUID | str`, i.e. "anything with a `__str__`" — it
  buys no type safety and mypy will never catch a swapped argument with it. Deleting it removes
  an import from seven modules.
- `_in_cache` can be **deleted outright**. It is `os.path.exists(self._get_cache_path(...))`, and
  every one of its ~8 callers already has `cache_path` in hand two lines earlier. `_get_filename`
  is the clearest case: it computes `cache_path` at `_caching_base.py:287`, then re-derives it at
  292 via `_in_cache(rel_path, object_id)`, then re-derives it a third time inside
  `_pull_into_cache` at 308.
- `_get_size_in_cache` likewise collapses to `os.path.getsize(cache_path)` at its single caller.
- The sharding concept stays inside `caching.py` + `_caching_base.py`. Backends see one honest
  signature improvement (`_download` gains the destination it was computing itself anyway) rather
  than a routing token they must forward.
- `_push_to_storage(rel_path, source_file=None, from_string=None, *, object_id)` — a *required*
  keyword-only after two optional positionals — is a shape that only happens when a parameter is
  bolted on. It goes away.

A slightly more principled variant, if you prefer one parameter to two: pass the resolved
`CacheShard` and give it the two helpers it needs.

```python
class CacheShard(NamedTuple):
    path: str
    weight: int
    size: float

    def cache_path(self, rel_path: str) -> str:
        return os.path.abspath(os.path.join(self.path, rel_path))

    @property
    def target(self) -> CacheTarget:
        return CacheTarget(self.path, self.size, CACHE_LIMIT)
```

`CacheShardManager` then collapses to a selector (`select(object_id) -> CacheShard`) and
everything downstream deals in shards, which is the concept the downstream code actually has an
opinion about.

**One reframing I considered and rejected**, for the record: deriving the shard from `rel_path`
itself, since `rel_path` always begins with `directory_hash_id(object_id)`
(`_caching_base.py:77`). That would make the diff ~30 lines. It does not work, because
`extra_dir_at_root=True` prepends `extra_dir` ahead of the hash components
(`_caching_base.py:80-81`) and `directory_hash_id` is variable-length, so the prefix is not
reliably locatable. Passing the resolved path down is the correct version of that instinct.

Worth noting: the codebase already has a canonical "give me the cache path for this object" API —
`_construct_path(obj, in_cache=True)`, used by `lib/galaxy/model/__init__.py:4916`. The PR does
not use it internally anywhere. If you want both paths at an entry point, an internal
`_construct_paths(obj, **kwargs) -> tuple[str, str]` reusing the existing safety checks would let
`object_id` vanish from `_caching_base.py` below line ~100 entirely.

---

## F4 — top-level `cache.size` becomes a *per-dir* budget, silently multiplying the disk footprint (severity: medium-high)

`caching.py:141,154-157`

```python
default_size = cache_dict.get("size") or config.object_store_cache_size
...
size = d.get("size")
if size is None:
    size = default_size
```

Given:

```yaml
cache:
  size: 1000
  dirs:
    - path: /a
    - path: /b
```

every shard gets `size=1000`, so the real budget is 2000 GB. Nothing in the config says so. An
admin reading `cache.size: 1000` will read it as the total. The PR description documents the
fallback chain but never states the multiplication, and the test suite **enshrines** the
behavior — `test_caching.py:143-154` asserts `{"dirs": [{"path": "/a"}, {"path": "/b", "size": 200}], "size": 100}`
yields sizes `[100, 200]`.

This matters more than a docs nit because `object_store_cache_size` is described in
`config_schema.yml` as "Default cache size, in GB, for caching object stores" — a per-store
quantity — and it is now silently reused as a per-*directory* quantity.

Pick one and be explicit:

- split the top-level `size` across dirs by weight (`size * w_i / Σw`), which matches how weights
  are meant to be read; or
- require an explicit per-dir `size` whenever `dirs` has more than one entry, and raise otherwise; or
- at minimum `log.warning` when a multi-dir cache inherits the top-level size, and document the
  multiplication in both samples.

Related, same function: `cache_dict.get("size") or ...` treats `size: 0` as unset. Pre-existing
`or`-sloppiness, but `from_config` is now the one place it lives, so it is cheap to fix here.

## F5 — three "first shard" properties that are lies, kept alive only by tests (severity: medium)

`_caching_base.py:385-397`

```python
@property
def staging_path(self) -> str:
    """First shard's cache path. For shard-aware operations, use ``_cache_shards``."""

@property
def cache_size(self) -> float:
    """First shard's cache size. ..."""

@property
def cache_target(self) -> CacheTarget:
    """First shard's cache target. For all targets, use ``cache_targets()``."""
```

Under sharding these return an arbitrary shard and are wrong for every other one. A docstring
saying "this is only shard 0" does not make a silent fallback safe — it documents the trap
instead of removing it. Their only consumers, repo-wide:

| Property | Consumers |
|---|---|
| `staging_path` | `test_objectstore.py:682, 964, 1077`; `test_caching.py:257` |
| `cache_size` | `test_objectstore.py:681, 965, 1076`; `test_caching.py` (via fixture) |
| `cache_target` | `test_objectstore.py:1114-1197` (10× `reset_cache(object_store.cache_target)`); `test_caching.py:258` |

Zero production callers. These exist so seven test assertions did not have to change — which is
the mirror image of weakening tests to fit an implementation, and no better. And
`test_backend_first_shard_properties` (`test_caching.py:255`) actively locks the trap in place by
asserting `backend.staging_path == cache_a`.

**Fix:** delete all three. Update the assertions to `object_store.cache_targets()[0].size == -1`
etc., and add the missing `reset_caches(targets)` sibling to the `check_caches(targets)` this PR
introduced — the ten `reset_cache(object_store.cache_target)` sites in `test_objectstore.py` want
it, and its absence is why `cache_target` had to survive.

## F6 — weighted selection reinvented, with a dead branch, next to an existing idiom (severity: medium)

`caching.py:86-107`

```python
total_weight = sum(s.weight for s in shards)
self._weighted_index: list[tuple[int, CacheShard]] = []
cumulative = 0
for shard in shards:
    cumulative += shard.weight
    self._weighted_index.append((cumulative, shard))
self._total_weight = total_weight
...
point = hash_value % self._total_weight
for cumulative, shard in self._weighted_index:
    if point < cumulative:
        ...
        return shard
return self.shards[-1]
```

Three problems in twenty lines:

- `return self.shards[-1]` is **unreachable**: the last `cumulative` equals `_total_weight` and
  `point < _total_weight` by construction. It is dead code that obscures the invariant, and it is
  the one return path that skips the memo — so it reads as if it were a real case.
- `total_weight` is computed by `sum()`, then recomputed incrementally by the loop, then assigned
  from the first version after the loop. Pick one.
- `DistributedObjectStore` already has the codebase's idiom for weighted selection
  (`objectstore/__init__.py:1426-1452`): expand into a repeat list, index into it. Reusing it
  here deletes `_weighted_index`, `_total_weight`, the scan, and the dead branch:

  ```python
  self._ring = [shard for shard in shards for _ in range(shard.weight)]
  ...
  return self._ring[int.from_bytes(hashlib.sha256(key.encode()).digest(), "big") % len(self._ring)]
  ```

  Same caveat as `DistributedObjectStore` (huge weights expand), same practical tolerance.
  If you'd rather not expand, `bisect.bisect_right` over a plain cumulative-weights list is the
  stdlib answer and still deletes the loop and the dead branch.

Combined with F2, `CacheShardManager` should end up around twenty lines.

## F7 — rucio `to_dict()` loses `monitor` / `monitor_interval` (severity: medium)

`rucio.py:347` changes `self.cache_config = cache_dict` (the raw admin dict) to
`self.cache_config = self._cache_config_to_dict()`, and `rucio.py:331` puts that straight into
`to_dict()`. `_cache_config_to_dict` emits only `path`/`size` (or `dirs`) plus
`cache_updated_data`.

`enable_cache_monitor` (`caching.py:266-282`) reads `cache.monitor` and `cache.monitor_interval`.
So a rucio backend configured with `cache: {monitor: false}` serializes to a dict that, when
rebuilt, silently re-enables the monitor. Rucio was the one backend that previously round-tripped
the raw cache dict; the others already dropped `monitor` (pre-existing). Narrow, but it is a
regression introduced here, and the honest fix is for `_cache_config_to_dict` to carry `monitor`
and `monitor_interval` through for everyone rather than for rucio to be quietly downgraded to
match.

## F8 — misconfiguration is silent, and `weight` is never coerced (severity: medium)

`caching.py:144-161`

```python
for d in dirs:
    path = d.get("path")
    if not path:
        continue                     # silently dropped
    weight = d.get("weight", 1)
    if weight <= 0:
        continue                     # silently dropped
...
return cls([CacheShard(path=default_path, weight=1, size=default_size)])   # silent fallback
```

An admin who typos `paths:` in every entry gets a Galaxy that boots fine and caches everything
into `object_store_cache_path`, with no log line anywhere. For an admin-facing config surface
that is a support ticket generator. The PR description frames "zero or negative weight dirs are
silently excluded" as a feature; for a *typo* it is not. `log.warning` on each dropped entry and
on the fallback costs three lines.

Separately, `weight` is not coerced. The XML path does `int(d.get("weight", 1))`
(`caching.py:74`), the YAML path does not — so `weight: "3"` in YAML raises
`TypeError: '<=' not supported between instances of 'str' and 'int'` at startup, from inside a
config parser, with no context. `int(d.get("weight", 1))` in `from_config` fixes both that and
the XML/YAML asymmetry.

## F9 — irods hand-rolls the cache dict the canonical parser already produces (severity: low-medium)

`irods.py:105-120` now builds `cache_dict` (`size`, `path`, `cache_updated_data`) *and* calls
`parse_cache_dirs_from_xml` itself — ten new lines reproducing what
`parse_caching_config_dict_from_xml` (`caching.py:241`) does, minus `monitor`. The duplication
predates the PR, but the PR *extends* it rather than removing it: this was the moment to have
irods call the canonical parser.

```python
cache_dict = parse_caching_config_dict_from_xml(config_xml)
```

`test/unit/objectstore/test_irods.py:40-41` asserts `config["cache"]["path"]` and
`["size"]`, both of which the canonical parser emits, so the swap should be covered.

---

## Lower-severity notes

- **Argument order is inverted between the two halves of the API.**
  `CacheShardManager.get_cache_path(object_id, rel_path)` vs.
  `CachingConcreteObjectStore._get_cache_path(rel_path, object_id)`. Both arguments are
  string-ish, so a transposition type-checks and produces a plausible-looking wrong path. Pick
  one order. (Moot if F3 is applied.)
- **`cache_targets` is a property on `CacheShardManager` and a method on
  `CachingConcreteObjectStore`.** Same name, same concept, different call syntax, in files that
  import each other.
- **`0.9` is hardcoded twice** in `CacheShardManager` (`get_cache_target`, `cache_targets`) where
  it was hardcoded once before. Make it a module constant or fold it into `CacheShard.target`.
- **Unreachable default in the XML parser** (`caching.py:75`):
  `float(d.get("size", -1)) if d.get("size") is not None else None` — the `-1` default can never
  be used, because the guard already caught the missing case. Write `float(size)` inside the
  guard.
- **Heterogeneous shard sizes produce confusing hard failures.** With `[{size: 500}, {size: 200}]`
  and no cross-shard fallback, a 300 GB dataset succeeds or fails purely on which shard its id
  hashes to, and the `log.critical` in `_caching_allowed` names a limit the admin never
  configured for that dataset. At minimum log the shard path in that message.
- **XML sample not updated.** The PR adds `<dirs><dir/></dirs>` parsing and documents it in the
  PR body, but only `object_store_conf.sample.yml` gained docs;
  `lib/galaxy/config/sample/object_store_conf.xml.sample` (which documents `<cache>` in ~10
  places) was left alone.
- **File sizes are fine.** `caching.py` 321 lines, `_caching_base.py` 458. Nothing near the 1k
  threshold; no decomposition concern.

## Test quality

The `CacheShardManager` unit tests (`test_caching.py:35-192`) are good: distribution ratio,
same-shard-for-same-object, and a solid parametrized table over the fallback matrix. No tests
were weakened or deleted; `test_objectstore.py`'s single change
(`InProcessCacheMonitor([cache_target], ...)`) is a mechanical signature fix. Credit where due.

The `StubCachingBackend` half is weaker:

- `_get_object_id(self, obj): return obj` (`test_caching.py:205`) returns the **`MagicMock`
  itself**, not `obj.id`. So `test_backend_create_and_delete`, `test_backend_update_and_size`
  and the `_delete` calls shard on `str(<MagicMock id='0x7f...'>)`. Self-consistent within a
  test, so they pass — but they never exercise the realistic `store_by="id"` integer key, and
  `directory_hash_id` is being fed a `MagicMock` repr. Return `obj.id`.
- `test_backend_pull_into_cache_writes_to_correct_shard` (`test_caching.py:303`) creates the file
  under `object_id=42` (an int) but its `# Cleanup` line calls `backend._delete(obj)` with the
  `MagicMock`, which resolves to a completely different rel_path *and* a different shard. The
  cleanup is a no-op. Harmless with `tmp_path`, but it means the test reads as verifying
  something it doesn't.
- `test_backend_first_shard_properties` should be deleted along with the properties (F5).

Gaps I'd want covered:

- No round-trip test for `to_config_dict()` → `from_config()`, in either the single- or
  multi-shard shape, despite `to_dict()` being how object store config reaches remote job
  execution.
- No test that a legacy single-path config produces the exact same absolute cache path as
  pre-PR. `get_cache_path` with one shard reduces to `abspath(join(path, rel))`, which is
  identical by inspection, but a one-line regression guard on the thing the PR promises
  ("no migration required") is cheap.
- No test for the multi-shard `_ensure_staging_path_writable` creating all shard directories.

## What is good

Worth saying plainly, because the findings above are unsparing:

- Backward compatibility genuinely holds. Single-shard `get_cache_path` is byte-identical to the
  old `os.path.abspath(os.path.join(self.staging_path, rel_path))`.
- The shard key is the *same* value `_construct_path` already uses to build `rel_path`
  (`_get_object_id(obj)`), so shard selection cannot desynchronize from path construction. That
  is the right invariant and it is not obvious — a sloppier version of this feature would have
  hashed `rel_path` and split `extra_files` across shards.
- `configured_cache_size` was deleted with zero remaining references repo-wide (verified). Clean
  removal, not a leftover.
- `parse_cache_dirs_from_xml` being shared between `caching.py` and `irods.py` is the right
  instinct (see F9 for the rest of the way).
- Two genuine drive-by cleanups in `_caching_base._exists`: duplicated `dir_only`/`base_dir`
  reads removed, and `object_id` hoisted so `_get_object_id` isn't called twice in `_create`.
- The `to_config_dict` docstring explaining *why* `weight` is omitted for the single-shard case
  is exactly the kind of comment that should exist.

## Suggested order of work

1. F1 — `check_cache` size guard + Pithos `cache_targets() -> []`. Two small edits, closes a
   data-loss path.
2. F2 — delete `_shard_cache`.
3. F3 — the restructuring. Do this before the cosmetic items; it deletes several of them
   (`ObjectId`, `_in_cache`, `_get_size_in_cache`, the argument-order nit) for free and should
   substantially shrink the backend diffs.
4. F6 — `CacheShardManager` internals, after F2/F3 so the class is already small.
5. F4, F5, F7, F8, F9 — independent, any order.
6. Test-quality items and the XML sample.

## Not verified

Stated plainly, since the brief asked:

- **No tests were run.** The worktree has no `.venv`, and the brief forbade heavy suites and
  allowed at most one fast unit run; bootstrapping an environment was not a good use of that
  budget. Every claim here is from static reading of the worktree at `7dc225ae87`.
- **F1's execution path is read, not observed.** I traced
  `clean_object_store_caches` → `cache_targets()` → `check_cache` → `_clean_cache` and read the
  arithmetic; I did not run it against a Pithos config. I am confident in the arithmetic
  (`-1 * 2**30 * 0.9 < 0 ≤ total_size`) and in `_clean_cache`'s unconditional `os.remove`, but
  someone should confirm empirically before treating it as settled.
- **Pithos's pre-PR `AttributeError`** is inferred from `cache_size: int` being a bare class
  annotation in `_caching_base.py` (removed by this diff) with no assignment in
  `PithosObjectStore.__init__`. Not executed.
- **No mypy / linting run.** Signature-compatibility of the `_download` and `_push_to_storage`
  overrides was checked by grepping every call site (all appear updated), not by a type checker.
- **Real-world weight distribution** is asserted by the PR's own test at n=10000; I did not
  independently verify SHA-256 modulo uniformity for small weight totals.
- **No live multi-shard deployment exercised** — the F4 disk-footprint multiplication is read off
  `from_config` and confirmed against the PR's own parametrized test expectations, not measured.
- I did not review the concurrent standard review of this PR, so there may be overlap.
