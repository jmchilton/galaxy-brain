# PR 23321 — Tee-stream object-store downloads instead of pulling into the cache first

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23321 |
| **Author** | nuwang (Nuwan Goonasekera) |
| **Base branch** | `dev` |
| **Head reviewed** | `0ce58160107973cbb107d80be355344b79c7ee12` (merge-base `0ce4ee0c765e449df051f990e51c03a3d9a0132c`) |
| **Size** | 10 files, +752 / -5 (3 commits) |
| **State** | OPEN, not a draft, 0 reviews / 0 comments at time of writing; opened 2026-08-19 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23321` |
| **Closes** | #19255 |
| **Complements** | #22895 (presigned-URL redirect, merged `648ec79db7`) |
| **Verdict** | **Approve with comments.** The design is right, the seam is the right seam, the tests are unusually good, and the concurrency fix in commit 2 is a real bug fix that stands on its own. Two things I'd want addressed before merge: the backend the linked issue reports the *worst* failure on (`generic_s3`) is the one backend that doesn't get a `_stream_remote`, and the stream contract has no close hook so an abandoned stream leaks its HTTP body. Neither is large. |

---

## What it does

An uncached dataset download today pulls the entire object into the local cache before the
first byte reaches the client. #19255 reports two consequences: 504s on multi-GB downloads,
and objects larger than the cache being undownloadable at all because `_caching_allowed`
refuses the pull.

This PR proxies the object's bytes to the client while writing them into the cache in
passing, publishing the cache copy atomically once the whole object has streamed.

**Object-store layer.** `ObjectStore` grows an abstract
`get_data_stream(obj) -> Iterator[bytes] | None`
(`lib/galaxy/objectstore/__init__.py:348`), with `BaseObjectStore.get_data_stream` /
`_get_data_stream` no-op default (`:728-734`) and `NestedObjectStore._get_data_stream`
routing to the backend holding the object (`:1351`). The tee is
`CachingConcreteObjectStore._tee_to_cache` (`_caching_base.py:173`), driven by
`_get_data_stream` (`:146`); backends supply only a raw chunk iterator via `_stream_remote`
(`:169`), implemented for `s3_boto3.py:345`, `azure_blob.py:264`, `cloud.py:264`.

**Serving layer.** `_allows_stream(request)` (`api/datasets.py:147`) is true for a plain GET
with no Range header; it becomes `allow_stream` on `DatasetsService.display()`
(`services/datasets.py:781`), which delegates to `_stream_from_object_store` (`:711`) gated
on the existing `is_direct_download_candidate`. The stream falls out through the existing
`GalaxyStreamingResponse` — no new response class, route, or schema.

**Commit 2 (`5b1d97dfe2`) is a separate bug fix**: `_atomic_download` named its temp file
`<cache_path>.tmp`, so two concurrent downloads of the same uncached object shared one path
and the second `open()` truncated what the first was still writing. Now
`f"{cache_path}.{uuid4().hex}.tmp"` (`_caching_base.py:501`). This fixes the pre-existing
`_pull_into_cache` race too.

---

## Verification

- `pytest test/unit/objectstore/ test/unit/webapps/galaxy/services/test_datasets_service.py`
  → **116 passed, 12 skipped** (borrowed venv from `branch/htcondor_pulsar`, `PYTHONPATH=lib:test`).
- `mypy` on all seven changed `lib/` files → **no errors in any file this PR touches**. The 15
  errors reported are all in untouched files (`s3.py` ×12, `pithos.py` ×2,
  `s3_multipart_upload.py` ×1) and are missing-stub noise from the borrowed venv.
- `ruff check` on all changed source and test files → clean.
- Did **not** run `test/integration/objectstore/test_tee_streaming.py` (docker/minio, slow, and
  per standing preference integration suites are run by hand one at a time).
- Python style: every new import is at module top (`Iterator` in five modules, `uuid4` in
  `_caching_base.py`, `STREAM_CHUNK_SIZE` into `s3_boto3.py`). No function-local imports added.
- No test was weakened. The diff to existing tests is purely additive.

---

## Claims I checked

**"Dispatched exactly like `get_direct_download_url`."** Holds, precisely.
`BaseObjectStore.get_data_stream` → `self._invoke("get_data_stream", obj)` (`__init__.py:729`)
mirrors `:717-722`; `_invoke` (`:523-524`) prefixes the underscore. `NestedObjectStore._get_data_stream`
uses `self._call_method("_get_data_stream", obj, None, False, **kwargs)` (`:1351-1353`),
the same shape as `_get_direct_download_url` at `:1340-1349`, and therefore inherits both
`DistributedObjectStore`'s first-backend-that-`exists` scan (`:1378-1402`) and
`HierarchicalObjectStore`'s store-id resolution (`:1627-1635`) for free. Nothing about the
dispatch is bespoke.

**"The tee lives in `CachingConcreteObjectStore`."** Holds. `_tee_to_cache` is 28 lines and
backend-agnostic; each backend contributes exactly one 2–5 line `_stream_remote`. This is not
three near-copies of chunk iteration — the three overrides are genuinely just "hand me the
SDK's chunk iterator". Good.

**"Client disconnects and mid-stream errors discard the temp file — `_atomic_download` already
cleans up on `BaseException`, which covers `GeneratorExit`."** Holds, and I traced it: closing
the generator raises `GeneratorExit` at the `yield chunk` (`_caching_base.py:194`), it
propagates out of `with open(...)` into the `@contextmanager`'s `except BaseException`
(`:506-512`), the temp file is removed and the *same* exception re-raised, so contextlib does
not complain about a swallowed `GeneratorExit`. `test_get_data_stream_discards_partial_cache_when_client_disconnects`
pins it.

**"Temp files orphaned by a hard kill are reaped by the cache monitor."** Holds.
`_get_cache_size_files` (`caching.py:223-241`) walks *every* file under the cache path with no
extension filter, so `.tmp` files count toward the size and are eligible for `_clean_cache`.
They sort by access time, so an in-flight temp file is the *last* candidate — the reaping is
real without being dangerous to a live stream.

**"`Content-Length` comes from the store's metadata."** Holds, but see P3-1 — it's a
*second* set of round trips for a size the store just handed us.

**"`accept-ranges` is deliberately not advertised."** Holds. `GalaxyFileResponse` (Starlette
`FileResponse`) sets `accept-ranges: bytes`; `StreamingResponse` does not. Both the unit test
and the integration test assert its absence on a streamed response and its presence on the
warmed-cache follow-up. Nice touch — asserting the *absence* of a header is how you catch a
future refactor silently claiming range support it doesn't have.

**"`is_direct_download_candidate` means the same thing here."** Holds. Both call sites are
asking "is this a plain whole-file request for the single stored object, with no datatype
processing in the way", and both answer it by delegating the bytes to something that will not
run `display_data`. The only asymmetry is that `direct_download_url` (`services/datasets.py:671`)
hardcodes `filename=None, offset=None, ck_size=None` because its route can't carry them, while
`_stream_from_object_store` (`:728`) passes the real values. That's the correct difference,
not a divergence. **This gate is the right reuse and I have no objection to it.**

---

## The abstraction question

### Is anything being reinvented?

No. I looked for an existing tee or chunked-read helper: `galaxy.util.stream_to_open_named_file`
(`util/__init__.py:1996`) is pull-to-file, not a tee; `util.file_reader` (`:331`) reads a local
fileobj; `api/proxy.py:98 stream_with_cleanup` is an httpx pass-through with no cache side. The
`ObjectStore` API had `get_data(start, count)` (`_caching_base.py:132`), which pulls into cache
first — exactly the thing being avoided. There is no prior art in-tree to reuse, and the new
method is placed on the same seam as the existing sibling feature. This is an addition, not an
accretion.

### Does it leave a reusable abstraction behind?

Mostly yes. `_stream_remote` is a clean per-backend hook with a one-line contract, and the
truncation/atomicity/eligibility policy is written once in a shared place. The two things that
keep it from being *fully* reusable are P2-1 (no close hook on the returned stream, so the
abstraction can't manage the resource it hands out) and P2-2 (`STREAM_CHUNK_SIZE` is declared in
the shared module but honoured by only one of the three backends).

One inconsistency worth naming: `_get_data_stream` computes cache eligibility with
`cache_target.fits_in_cache(remote_size)` (`_caching_base.py:163`) rather than the existing
`_caching_allowed(rel_path, cache_target=..., remote_size=...)` (`:266-277`). That's a
*deliberate* and correct choice — `_caching_allowed` emits `log.critical("... Cannot
download.")`, which would be a lie on the streaming path, where not fitting is a normal
outcome. But the two now express the same policy in two places. If `_caching_allowed` grew a
second condition (a disk-free check, say), the stream path would silently not get it. A
`quiet=True` parameter, or splitting the predicate from the logging, would keep one source of
truth. Judgement call; I'd accept it as-is with a comment saying why the shared helper was
bypassed.

---

## P1 findings

### P1-1 — "Closes #19255" but the backend with the *worst* reported failure gets no `_stream_remote`

The issue reports three backends. Two are `type: boto3` (504 on ≥6 GB) — fixed by this PR. The
third is `pawsey_s3_test`, `type: generic_s3`, and the reporter's words are:

> The downloads appear to succeed, but for sizes 4GB and above, the downloaded files are
> **truncated to about 3GB each**. It would be preferable if it failed with a timeout as it
> does in the other cases.
>
> At this point our test candidates seem unusable, **especially the one in which downloaded
> files are truncated**.

`generic_s3` is `GenericS3ObjectStore` (`s3.py:433`), which extends the **boto2**
`s3.S3ObjectStore` (`s3.py:149`) — a different class from the boto3 `s3_boto3.S3ObjectStore`
(`s3_boto3.py:162`) that got the override. So `s3` and `generic_s3` inherit the no-op
`_stream_remote` and keep today's behavior unchanged. The PR body is honest about this
("no-op default (disk, Pulsar, `generic_s3`, …)"), but pairs it with `Closes #19255`, and the
silent-truncation case is the one the reporter called unusable. It is also the one this PR's
machinery is *best* suited to fix: `_tee_to_cache`'s `streamed_size != expected_size` check
(`_caching_base.py:196-200`) turns exactly that silent truncation into a loud error.

The override is small — boto2's `Key` supports sized reads, and `_get_remote_size`
(`s3.py:275`) and `_download` (`s3.py:305`) already show the key accessor:

```python
def _stream_remote(self, rel_path: str) -> Iterator[bytes] | None:
    key = self._bucket.get_key(rel_path)
    if key is None:
        return None
    return iter(lambda: key.read(STREAM_CHUNK_SIZE), b"")
```

Two paths I'd accept: add that override (plus a unit test alongside the three existing
`test_stream_remote_*` ones), **or** downgrade `Closes #19255` to `Refs #19255` and say
explicitly in the body that `generic_s3` truncation is unaddressed. What I wouldn't do is
close the issue with the reporter's headline complaint still live.

Other caching backends also without `_stream_remote` — `irods.py:170`, `pithos.py:86`,
`onedata.py:89`, `rucio.py:318` — are a legitimate "later", since none is named in the issue
and each keeps working exactly as before. Only `generic_s3` is load-bearing here.

### P1-2 — An abandoned stream leaks its remote HTTP body; there is no close hook

Two windows, both real:

**(a) Between opening the stream and returning it.** `_get_data_stream`
(`_caching_base.py:153-166`) opens the remote body *first*:

```python
chunks = self._stream_remote(rel_path)      # :154 — S3 GetObject is now in flight
if chunks is None:
    return None
remote_size = self._get_remote_size(rel_path)   # :157
if remote_size < 0:
    return None                                  # :160 — chunks abandoned, never closed
```

If `_get_remote_size` raises (caught at `:164`) or reports `-1`, we return `None` and fall
back to the pull path with a live `StreamingBody` still holding a pooled connection. Trivially
fixed by hoisting the size lookup above `_stream_remote` — it's a HEAD-equivalent and cheap,
and the `remote_size < 0` bail then costs nothing:

```python
remote_size = self._get_remote_size(rel_path)
if remote_size < 0:
    return None
chunks = self._stream_remote(rel_path)
if chunks is None:
    return None
```

**(b) The returned generator has no way to release the body.** `_tee_to_cache` iterates
`chunks` and, on `GeneratorExit` or a mid-stream error, drops it without calling `.close()`.
For boto3 that abandons a `StreamingBody` mid-response, so urllib3 discards the connection
instead of returning it to the pool, and S3 sees an aborted GET. Under the disconnect pattern
this PR explicitly targets — big downloads over flaky WAN links — that's the common case, not
the rare one.

`Iterator[bytes]` is the wrong return type for a resource: it has no `close`. The interesting
fix is also the one that improves the abstraction — return something closable
(`ContextManager[Iterator[bytes]]`, or an object carrying `size` and `close`, which also
retires P3-1), and wrap the tee body in `contextlib.closing`. A cheap interim version is:

```python
try:
    ...
finally:
    getattr(chunks, "close", lambda: None)()
```

but that's a patch over the type, not a fix to it. Given this is a brand-new public
`ObjectStore` method that other backends will implement, I'd rather it get the shape right
now — this is the one place where the PR's abstraction is genuinely under-specified.

Note this is where `get_data_stream` and `get_direct_download_url` stop being analogous.
`-> str | None` hands back an inert string; `-> Iterator[bytes] | None` hands back a live
socket. The `None`-as-"unsupported" sentinel itself is fine and is handled uniformly by the
single caller — it's the *live resource* half of the contract that needs more than an
`Iterator`.

---

## P2 findings

### P2-1 — Per-download temp files multiply transient cache usage for concurrent downloads of the same object

Commit 2 is a genuine fix and I'm glad it's here. But it changes the disk footprint of N
concurrent downloads of one uncached object from 1× to N×: each gets its own
`<cache_path>.<uuid>.tmp` (`_caching_base.py:501`) and each writes a full copy. Tee-streaming
makes this materially more likely — every client now opens its own stream, and the temp file
lives for the duration of a *client-paced* download rather than a server-paced pull, so the
windows overlap far more than they did on the pull path.

`fits_in_cache` (`caching.py:38-46`) only asks whether one object is under the limit; it has
no notion of what's currently in flight. Five people downloading the same 10 GB dataset now
put 50 GB of temp files on a cache sized for 50, and the monitor sorts them last by access
time so it will reap everything *else* first.

I don't think this blocks merge — the old behavior was silent corruption, and N× disk is
strictly better than that — but the trade should be in the PR body next to the existing
"Throughput trade-off" note, and it argues for a follow-up: an in-flight registry so a second
request for an object already being teed either joins the first stream or streams without
writing (`write_cache=False`). That would also cut N remote GETs to one.

Related, and worth a sentence in the body: this makes the cache monitor's window for reaping a
live temp file much longer. `_clean_cache` deleting a `.tmp` mid-write turns the later
`os.rename` into a `FileNotFoundError` — caught by `_atomic_download`'s `except BaseException`,
which then tries `os.remove` on the already-gone path (guarded by `os.path.exists`) and
re-raises into the client's stream. Pre-existing in shape, newly likely in practice. I did not
reproduce this; treat it as reasoned, not observed.

### P2-2 — `STREAM_CHUNK_SIZE` is shared in name only

`STREAM_CHUNK_SIZE = 1024 * 1024` is declared in `_caching_base.py:31` — the shared module,
suggesting it governs the tee — but only `s3_boto3.py:347` passes it. Azure's `.chunks()`
(`azure_blob.py:265`) uses the client's `max_chunk_get_size` (4 MiB by default) and cloudbridge's
`iter_content()` (`cloud.py:268`) uses its own default. So the constant reads like a policy and
behaves like a boto3 parameter.

Either move it to `s3_boto3.py` and name it for what it is, or make it the tee's actual
granularity by rechunking in `_tee_to_cache`. I'd take the first — rechunking costs a copy for
no benefit — but leaving a shared-looking constant that two of three backends ignore is the
kind of thing that gets copied into the fourth backend and quietly does nothing.

### P2-3 — The streamed response drops `X-Content-Type-Options: nosniff`

`Data.display_data` sets it unconditionally at `datatypes/data.py:589`, before any branch, so
every response served through the existing path carries it. `_stream_from_object_store`
(`services/datasets.py:731-735`) builds its header dict from scratch and doesn't.

Exposure is low — `content-type` is `application/octet-stream` and `Content-Disposition` is
`attachment` — and the #22895 redirect path drops it too, since a 302 to S3 carries none of
Galaxy's headers. But #22895 is opt-in behind `enable_direct_download`, and **this path is
default-on for every S3/Azure/cloud deployment**, so the blast radius is different. One line,
and it keeps the two paths' headers a strict superset relationship rather than a diff.

While in there: `_serve_file_download` forwards `**kwd` to `download_content_disposition`
(`data.py:535`, supporting `hdca` / `element_identifier` / `filename_pattern`), and
`_stream_from_object_store:734` calls it with no kwargs. `display()` receives those via
`**kwd` from `get_query_parameters_from_request_excluding`, so `/display?to_ext=data&filename_pattern=...`
gets one filename today and a different one after this PR. I couldn't find an in-tree caller
that passes `filename_pattern` to `/display` (the collection-download path builds its own
names in `services/dataset_collections.py:412`), so this is a theoretical client-visible
change rather than a broken feature — but passing `**kwd` through is free.

### P2-4 — Default-on with no opt-out, and no `DRS` coverage

The PR body raises this itself ("Happy to gate it behind a per-store flag if reviewers
prefer"), so this is an answer rather than a complaint: **I'd merge it default-on.** The old
behavior is worse on every axis this touches, and `enable_direct_download` needs a flag
because it changes *who the client talks to*; tee-streaming doesn't leave Galaxy. Adding a
config surface here mostly guarantees it stays off where it's needed.

What I *would* want is that the fallback is total, and it nearly is: `_get_data_stream` wraps
its whole setup in `try/except Exception` (`_caching_base.py:153-166`) and returns `None`, so
a backend that misbehaves at open time degrades to today's path. It's only failures *after*
the first byte that can't be recovered, which is inherent to streaming. Good.

Two coverage notes while here:

- `drs.py:80` calls `service.display(..., raw=True)` and casts to `IOBase`. DRS is precisely
  the multi-GB-download API, and it gets no benefit. Out of scope for this PR (it would need
  the `raw=True` cast unwound), but worth a line in the body so it isn't assumed covered.
- The "objects too big for the cache can be downloaded at all" fix applies to `/display` only.
  `_get_filename` still routes through `_pull_into_cache` → `_caching_allowed`, so **running a
  job** on a bigger-than-cache dataset still fails. The PR body's framing ("objects too big for
  the cache can be served at all", `objectstore/__init__.py:353`) reads broader than what
  ships.

---

## P3 findings

### P3-1 — `Content-Length` costs two extra remote round trips for a size already in hand

`_stream_from_object_store:737` calls `trans.app.object_store.size(dataset_instance.dataset)`.
For an uncached object `_size` (`_caching_base.py:325-337`) does `_exists_remotely` **and**
`_get_remote_size` — and `_get_data_stream` computed `remote_size` moments earlier
(`:157`) and is already validating the stream against it (`:196`).

The existing path doesn't pay this at all: `_serve_file_download` uses `file_size` from
`_get_file_size` (`data.py:185-192`), which reads `dataset.file_size` off the DB row and only
falls back to the object store when it's zero.

Three extra HTTP round trips per uncached download on a route whose entire point is
time-to-first-byte. Best fix is the one from P1-2(b): have `get_data_stream` hand back the
size alongside the stream. Second best is mirroring `_get_file_size`'s DB-first lookup — though
note the store's `remote_size` is the more trustworthy number here, since it's what the
truncation check compares against.

### P3-2 — Truncation is only caught when the object is being cached

`_tee_to_cache`'s `write_cache=False` branch is a bare `yield from chunks`
(`_caching_base.py:184-186`) with no byte count. So a bigger-than-cache object — the case the
PR adds support for — gets `Content-Length: N` and, if the backend truncates, N−k bytes with no
server-side error. That is exactly the #19255 `generic_s3` symptom, in the one path where this
PR can't detect it. Counting bytes and raising is two lines and needs no temp file; the client
still sees a short response, but the server logs it and the ops team has something to grep for.

### P3-3 — Test coverage gaps (the suite is strong; these are the holes)

The 16 new object-store tests and 7 new service tests are genuinely good — they assert on
observable outcomes (bytes on disk, absence of `.tmp` leftovers, `_stream_remote` not called)
rather than restating the implementation, and `test_get_data_stream_does_not_cache_a_truncated_object`
and `test_atomic_download_concurrent_downloads_do_not_share_a_temp_file` each pin a specific
failure mode with a comment explaining why it matters. `_leftover_temp_files` asserted in five
tests is a nice invariant to have factored out. Missing:

- **No dispatch test.** `NestedObjectStore._get_data_stream` (`__init__.py:1351`) is the piece
  most likely to be wrong and is untested for both `DistributedObjectStore` and
  `HierarchicalObjectStore`. `test_get_data_stream_disk_store_returns_none` mirrors the
  existing direct-download test, but neither covers nesting. A distributed config with one
  streaming and one non-streaming backend would cover the `_call_method` wiring.
- **No test that the leaked-body path is closed** — because there's nothing to test yet (P1-2).
  Whatever shape the close hook takes, a `MagicMock` chunk iterator asserting `.close()` was
  called on disconnect belongs beside `test_get_data_stream_discards_partial_cache_when_client_disconnects`.
- **`write_cache=False` truncation** (P3-2) has no test, consistent with there being no check.
- `TestCloudTeeStreamingIntegration(TestTeeStreamingIntegration)` (`test_tee_streaming.py:186-188`)
  re-runs all five parent tests against a second minio container. That's the right coverage,
  but it doubles an already docker-heavy suite; worth confirming CI time is acceptable.

### P3-4 — Nits

- `_get_data_stream`'s `except Exception` (`_caching_base.py:164`) uses `log.exception`, so a
  legitimately-missing key produces a full traceback at ERROR before the pull path raises the
  real `ObjectNotFound`. `log.warning` with the exception text would be quieter for the
  expected case; the current level is right for genuine backend failures, so this is a wash —
  mentioning it only because ops teams grep for tracebacks.
- The `_stream_remote` base (`_caching_base.py:169-171`) is a plain `return None` while its
  siblings `_get_remote_size` / `_exists_remotely` / `_download` (`:480-515`) are
  `raise NotImplementedError()`. The difference is deliberate (opt-in vs required) but a
  half-line comment saying so would stop someone "fixing" it to match.
- `is_direct_download_candidate`'s docstring (`services/datasets.py:103-108`) still says
  "eligible for a direct backing-store **link**". It now gates two different mechanisms; worth
  a two-word widening.
- Adding an `@abc.abstractmethod` to `ObjectStore` (`__init__.py:347`) is technically a
  breaking change for any out-of-tree store subclassing `ObjectStore` directly. In-tree
  everything descends from `BaseObjectStore` (including `PulsarObjectStore`,
  `objectstore/pulsar.py:9`), so nothing breaks here, and it matches how
  `get_direct_download_url` was added at `:335`. Non-issue, noting for completeness.

---

## Verdict

**Approve with comments.** This is a well-shaped change: the object-store seam matches the
existing `get_direct_download_url` dispatch exactly rather than inventing a parallel one, the
tee is written once in the shared base with a genuinely minimal per-backend hook, the serving
layer reuses `is_direct_download_candidate` and `GalaxyStreamingResponse` with no new route or
response type, and the PR body is unusually honest about its own trade-offs. The `.tmp`
collision fix in commit 2 is a real latent-corruption bug found in passing and fixed properly
rather than worked around.

The two I'd want addressed:

- **P1-1** — `generic_s3` is the backend #19255 calls unusable, and it's the one backend
  without a `_stream_remote`. Either add the ~5-line boto2 override or stop claiming to close
  the issue.
- **P1-2** — `Iterator[bytes]` can't release a socket. Hoisting the size lookup fixes the easy
  half; the returned stream needing a close hook is the part that actually improves the
  abstraction, and it's cheapest to get right before a fourth backend implements it.

**Is this the right abstraction?** Yes, with one gap. The seam, the dispatch, and the
division of labour between base and backend are all correct and reuse what's already there.
The one thing under-specified is the *lifetime* of the thing being returned — which is the
half of the contract `get_direct_download_url` never had to think about, and therefore the half
the copied pattern doesn't cover.

---

## Not verified

- Integration suite (`test/integration/objectstore/test_tee_streaming.py`) not run — docker/minio,
  and integration suites are run by hand here.
- No live S3/Azure/cloudbridge backend exercised. The connection-leak reasoning in P1-2 is from
  botocore/urllib3 semantics, not observed.
- The cache-monitor-reaps-a-live-temp-file interaction in P2-1 is reasoned from
  `caching.py:167-241`, not reproduced.
- Did not measure the throughput trade-off the PR body flags (single sequential read vs boto3
  `TransferConfig` parallel multipart).

---

## Draft review comment

> Posted by Claude (AI assistant) on jmchilton's behalf.
>
> Really like the shape of this — `get_data_stream` sits on the same seam as
> `get_direct_download_url` rather than inventing a parallel dispatch, the tee is written once
> in `CachingConcreteObjectStore` with a genuinely minimal per-backend hook, and the temp-file
> collision fix is a real latent-corruption bug found and fixed properly. The tests are strong;
> asserting `accept-ranges` is *absent* on the streamed path is exactly right.
>
> Two things before merge:
>
> **1. `generic_s3` doesn't get a `_stream_remote`, and it's the backend #19255 calls
> unusable.** The issue reports `pawsey_s3_test` (`type: generic_s3`) silently truncating 4 GB+
> downloads — "especially the one in which downloaded files are truncated". `GenericS3ObjectStore`
> extends the boto2 `s3.S3ObjectStore`, not `s3_boto3.S3ObjectStore`, so it keeps today's
> behavior. And `_tee_to_cache`'s `streamed_size != expected_size` check is precisely the
> medicine for that symptom. boto2's `Key` supports sized reads, so it's small:
>
> ```python
> def _stream_remote(self, rel_path: str) -> Iterator[bytes] | None:
>     key = self._bucket.get_key(rel_path)
>     if key is None:
>         return None
>     return iter(lambda: key.read(STREAM_CHUNK_SIZE), b"")
> ```
>
> Either that, or drop to `Refs #19255` and call out the gap — I'd just rather the issue not
> close with the reporter's headline complaint still live.
>
> **2. Nothing closes the remote body.** Two windows:
>
> - `_get_data_stream` opens `chunks` before calling `_get_remote_size`, so the
>   `remote_size < 0` and `except Exception` returns abandon a live `StreamingBody`. Hoisting
>   the size lookup above `_stream_remote` fixes this for free.
> - `_tee_to_cache` drops `chunks` on `GeneratorExit` without `.close()`, so on a client
>   disconnect — the case this PR targets — urllib3 discards the connection rather than
>   returning it to the pool.
>
> `Iterator[bytes]` has no `close`, which is where the analogy to `get_direct_download_url`
> breaks down: that one returns an inert string, this returns a live socket. Since this is a
> new public `ObjectStore` method that other backends will implement, worth getting the type
> right now — something closable, or an object carrying `size` + `close`. The size half would
> also let you drop the `object_store.size()` call in `_stream_from_object_store`, which
> currently costs two more remote round trips (`_exists_remotely` + `_get_remote_size`) for a
> number `_get_data_stream` just computed. On a route whose whole point is time-to-first-byte,
> that's worth reclaiming.
>
> Smaller things:
>
> - `_stream_from_object_store` builds its headers from scratch and so drops
>   `X-Content-Type-Options: nosniff`, which `Data.display_data` sets unconditionally. Low
>   exposure given `octet-stream` + `attachment`, but this path is default-on for every S3/Azure
>   deployment where `enable_direct_download` was opt-in. It also doesn't forward `**kwd` to
>   `download_content_disposition`, so `?filename_pattern=` produces a different filename than
>   the non-streamed path.
> - `STREAM_CHUNK_SIZE` lives in `_caching_base.py` but only `s3_boto3` honours it — azure uses
>   `max_chunk_get_size`, cloudbridge its own default. Either move it next to its only user or
>   make it the tee's real granularity.
> - The `write_cache=False` branch is a bare `yield from chunks` with no byte count, so
>   bigger-than-cache objects — the new capability — are the one path where a truncated stream
>   goes undetected. Two lines to count and raise.
> - Per-download temp files mean N concurrent downloads of one object now use N× the cache
>   space, and tee-streaming makes those windows client-paced rather than server-paced.
>   Strictly better than the corruption it replaces, but worth a line in the body next to the
>   throughput note — and it argues for an in-flight registry later so the second requester
>   joins the first stream instead of opening its own.
> - No test covers `NestedObjectStore._get_data_stream` for `Distributed` / `Hierarchical`.
>
> On "default-on, no new config flag": I'd keep it default-on. `enable_direct_download` needs a
> flag because it changes who the client talks to; this doesn't leave Galaxy, and the fallback
> in `_get_data_stream` is total for any failure before the first byte. A flag here mostly
> guarantees it stays off where it's needed.

---

## The P1 fix branch

Branch `23321-review-followups` on `jmchilton/galaxy`, cut from nuwang's head `0ce5816010`
(not from `dev`), so it PRs cleanly against `objectstore-tee-streaming`. Two commits,
7 files, +258 / −51.

### `3f892cb5fd` — release the remote read when a streamed download is abandoned (P1-2)

`_stream_remote` now returns `AbstractContextManager[Iterator[bytes]] | None` instead of a
bare iterator, built by a new `closing_stream(chunks, close)` helper in `_caching_base.py`.
`_tee_to_cache` enters it, so the connection is released on every exit — full read, client
disconnect, or mid-stream error.

The cheap version the review floated (`finally: getattr(chunks, "close", ...)()`) would
have been *wrong*, not just inelegant, and reading botocore is what settled it:
`StreamingBody.iter_chunks` is a plain generator over `self.read(chunk_size)`
(`botocore/response.py:165-173`), so it *does* have a `.close()` — the generator's. Calling
it ends the loop and leaves `self._raw_stream` open. The thing that has to be closed is
`StreamingBody.close()` (`:190`), which the chunk iterator gives no access to. A
`getattr`-based fix would have looked like it worked and leaked anyway.

Per backend:

- `s3_boto3` — `closing_stream(body.iter_chunks(...), body.close)`.
- `cloud` — cloudbridge's `iter_content()` promises `Iterable[bytes]` and nothing more, and
  the concrete type differs per provider (AWS `BucketObjIterator` wrapping the boto3 body
  with its own `close`, an OpenStack swift generator, a GCP `io.BytesIO`, an Azure
  `io.RawIOBase`). So: close it if it knows how, `getattr(content, "close", lambda: None)`.
- `azure_blob` — `nullcontext`. `StorageStreamDownloader` exposes no `close`, and its
  `chunks()` pulls each chunk with its own ranged request rather than holding one response
  open, so there is nothing to release. **Not verified** — azure-storage-blob is not
  installed in any worktree here; this is from the SDK's documented shape, and is the one
  claim in the branch nuwang should check.

Ordering, the (a) half of P1-2: `_get_data_stream` now does the size lookup and the
cache-fit decision *before* `_stream_remote`, so every bail-out that returns `None`
happens while there is nothing open. Same move in `_stream_from_object_store`
(`services/datasets.py`) — headers and `object_store.size()` first, the open last.

Residual, stated rather than papered over: a generator that is never started never enters
its `with`, so if something between `get_data_stream()` returning and the ASGI server
consuming the response raises, the read is still only released on GC. Reordering removes
every *reachable* failure point inside Galaxy's code (`size()` is a remote call and was the
real one); `trans.log_event` remains after the open because moving it earlier would log a
download event for requests that fall back to the pull path and log again there.

Cost of the reorder: `object_store.size()` is now called before we know streaming applies.
Disk stores pay a `stat`; caching stores with no `_stream_remote` (irods, pithos, onedata,
rucio) pay the remote size lookup on this route, immediately before pulling the whole
object into cache anyway. Judged negligible, but it is a real change and worth naming.

### `c454ea595b` — stream boto2 S3 downloads too (P1-1)

`_stream_remote` on `S3ObjectStore` in `s3.py`, which `GenericS3ObjectStore` inherits, so
both `aws_s3` (boto2) and `generic_s3` get it. `iter(lambda: key.read(STREAM_CHUNK_SIZE), b"")`
over boto2's `Key`, closed with `fast=True` — `Key.close()` defaults to reading the rest of
the response first (`boto/s3/key.py:365-385`), which on an abandoned 4 GB download is
exactly the wrong thing.

This is what makes `Closes #19255` true rather than aspirational: the reporter's headline
complaint is silent truncation on `generic_s3`, and `_tee_to_cache`'s
`streamed_size != expected_size` check converts it into a raised `OSError` instead of a
corrupt cached object.

### Verification

- `pytest test/unit/objectstore/test_objectstore.py -k "stream or atomic_download"` →
  **22 passed** (borrowed venv from `branch/htcondor_pulsar`, `PYTHONPATH=lib:test`).
- Full file → **63 passed, 12 skipped**. `test_datasets_service.py` → **16 passed**.
- Red-to-green on P1-1: reverting `s3.py` alone makes
  `test_stream_remote_s3_reads_key_in_chunks` fail with a `TypeError` (the base returns
  `None`), and passes with it.
- `mypy` on all six changed `lib/` files plus the test file → no errors in anything this
  branch touches. The 6 reported are `unused-ignore` noise in untouched files, from the
  borrowed venv's missing stubs.
- `ruff`, `flake8`, and the repo's full pre-commit hook set → clean on both commits.
- Not run: the integration suite (`test_tee_streaming.py`, docker/minio), and no live
  S3/Azure/cloudbridge backend. The connection-release behaviour is pinned by unit tests
  against mocks, not observed against a real store.

### Tests added

Seven, all failing before their commit:

- `_stream_remote` is not called when the size is unknown, and not called when the size
  lookup raises — the two ways the old ordering stranded an open read.
- the read is released when the client disconnects, when the stream errors, and on the
  bigger-than-cache path that skips the tee entirely.
- boto3 closes the response *body*, not just the chunk iterator — asserts `body.close` is
  untouched mid-iteration and called exactly once on exit.
- boto2 reads the key in `STREAM_CHUNK_SIZE` chunks and closes with `fast=True`; and
  returns `None` for a missing key.

### Left alone

Everything else in the note. P2-1 through P2-4 and P3-1 through P3-4 are untouched — in
particular P3-1 (`Content-Length` costing extra round trips) would have been retired by
having `get_data_stream` hand back the size alongside the stream, but that changes the
*public* signature, and the public `Iterator[bytes] | None` is fine as it stands: the tee
generator is itself closable and the ASGI server closes it. The under-specified contract
was the internal `_stream_remote` hook, and that is the only one this branch reshapes.

### `163ce88b9b` — close abandoned streams before their first chunk

Third commit, added after the branch was first pushed. It closes the residual hole the
section above named: a generator never started never enters its `with`, so a failure
between `get_data_stream()` returning and the ASGI server consuming the body left the read
to GC. Three layers, and they are complementary rather than redundant — the first gives the
iterator a meaningful `close()`, the other two make sure someone calls it:

- `closing_stream` becomes a class, `RemoteDataStream`, with an idempotent `close()` that
  works whether or not the context manager was ever entered.
- `_get_data_stream` wraps the tee generator in `_ClosingIterator`, whose `close()` closes
  the generator *and* the underlying `RemoteDataStream`.
- `GalaxyStreamingResponse` closes sync response content on normal completion, on send
  failure, and on `__init__` failure; `_stream_from_object_store` closes the stream if
  `trans.log_event` raises.

**Verified.** 182 passed / 12 skipped across `test/unit/objectstore/` and
`test/unit/webapps/`. `ruff` and `flake8` clean. mypy: 11 errors, none in any touched file —
and I A/B'd the one that looked new (`objectstore/s3.py:17`, `Unused "type: ignore"` on
`boto = None`) by reverting `s3.py` to nuwang's head and re-running: identical 11 errors,
same line. It is borrowed-venv stub noise, not ours.

**Blast radius checked.** `GalaxyStreamingResponse` now closes *any* sync content exposing
`close()`, which is every streaming endpoint in Galaxy, not just this feature. Walked all
callers:

- async generators (`api/events.py` SSE, `api/plugins.py`) expose `aclose`, not `close`, so
  `_close_content` is `None` and they are untouched.
- `BytesIO`/`StringIO` (`api/pages.py` PDF, `api/workflows.py` report PDF,
  `api/common.py:serve_workbook`, `api/datasets.py`) get closed after streaming — the
  buffers are locally constructed and nothing reads them afterwards.
- sync generators (`util/zipstream.py:response` behind three `history_contents.py`
  archive routes, `api/proxy.py:stream_with_cleanup`) — closing an exhausted generator is a
  no-op, and closing a partly-consumed one runs its `finally`, which is an improvement for
  `stream_with_cleanup`.

No breakage found, but it is a behaviour change outside the object-store feature and should
be said out loud in the PR body rather than left for a reviewer to find.

**Race checked and cleared.** `stream_response`'s `finally` could in principle close the tee
generator while a threadpool `next()` is still running it (`ValueError: generator already
executing`). It cannot: Starlette's `iterate_in_threadpool` uses `anyio.to_thread.run_sync`
without `abandon_on_cancel`, so a cancel scope waits for the in-flight `next()` to return
before the `finally` runs. Reasoned from anyio's semantics, not observed.

**Nits, none blocking.**

- `closing_stream` is now a one-line factory for `RemoteDataStream`; both names are
  exported and imported across four backend modules. One of them should go.
- `_ClosingIterator.close()` reaches for `getattr(self.iterator, "close", None)`, but that
  iterator is always the tee generator this module creates. Typing it
  `Generator[bytes, None, None]` would let it call `.close()` outright — and commit 1's own
  message argues that a `getattr`-based close is the wrong shape, so the tension is worth
  removing before a reviewer points at it.
- `_stream_from_object_store` does the same `getattr` dance, unavoidably: it is the price of
  leaving `ObjectStore.get_data_stream` declared as `Iterator[bytes] | None`.
- The commit body is three unwrapped lines where the other two wrap at ~80.

Azure remains the one unverified claim, unchanged: `lambda: None` asserts there is nothing
to release, and azure-storage-blob is not installed in any worktree here.

### `46058bc890` — collapse `closing_stream` into `RemoteDataStream`

The two nits from the check above, cleaned up rather than carried into review.
`closing_stream` is gone; every signature already named `RemoteDataStream`, so the four
backends construct one directly. `_ClosingIterator.__init__` now takes
`Generator[bytes, None, None]` (and `_tee_to_cache` declares that as its return type), so
`close()` is called outright instead of fished out with `getattr` — the one place in this
branch where we genuinely do know what we are holding.

The third nit — commit-body wrapping — was left alone by choice.

Left as a separate commit rather than folded into `163ce88b9b`, so the attribution stays
honest. It also leaves the history readable: commits 1–2 introduce the context manager as a
function, which was the right minimal shape until commit 3 needed a `close()` callable
before the manager is entered. The function becoming a class is the story, not churn.

Re-verified after the cleanup: 182 passed / 12 skipped, ruff and flake8 clean, mypy 11
errors in 8 untouched files — byte-identical to the A/B baseline taken with `s3.py` reverted
to nuwang's head.

**Branch is pushed and ready to PR** against `nuwang:objectstore-tee-streaming`. Four
commits, 10 files, +428 / −63.

### Delivered

PR opened against nuwang's branch: **https://github.com/nuwang/galaxy/pull/5** —
`jmchilton:23321-review-followups` → `nuwang:objectstore-tee-streaming`, four commits.
Body leads with the Claude-on-behalf-of marker, no @-mentions.

It states the two P1s, and deliberately surfaces three things rather than letting a reviewer
find them: the `GalaxyStreamingResponse` blast radius beyond this feature (with the caller
walk), the unverified azure `close` claim, and the `object_store.size()` cost the reorder
adds on the fallback path.

Ball is theirs now.

---

## Re-review 2026-08-21 at `ae7e1ef343`

nuwang merged nuwang/galaxy#5 and added two commits of his own. Our four landed rebased under
new SHAs (`9fc615389c`, `c78de27659`, `09ccb41271`, `556a3d95c2`); `git diff 46058bc890 556a3d95c2`
is **empty** — content-identical, nothing reshaped on the way in.

**No blockers.** P1-1 and P1-2 are closed, and `ae7e1ef343` closes the abstraction gap the verdict
named — the *lifetime* of the returned object. `get_data_stream` now returns a `DataStream`
Protocol (`__iter__`/`__next__`/`close`) instead of `Iterator[bytes]`, and
`services/datasets.py` drops its `getattr(stream, "close", None)` probe for a plain
`stream.close()`. That is the right fix and it is better than what we proposed: the obligation is
in the type rather than in a comment. `_ClosingIterator` and `RemoteDataStream` both satisfy it.

Verified at head: 64 pass / 12 skip in `test/unit/objectstore/test_objectstore.py`; mypy clean on
the seven touched files (the 12 `s3.py` errors under `--follow-imports=skip` reproduce identically
on `dev`, so they are an artifact of that flag). CI red is unrelated — four shards died in setup
(`sudo` exit 1) and Integration Selenium failed on `test_trs_import` hitting Dockstore.

### N1 — the version floor is a same-day release, and it can't enforce itself

`dac85e51c0` requires `cloudbridge>=4.4.0` in `conditional-requirements.txt`, `pyproject.toml`
and both pin files. 4.4.0 was published **2026-08-21**, the same day the commit landed (nuwang
maintains cloudbridge, so this is coordination, not a surprise dependency).

Checked both wheels off PyPI:

```
4.3.1  def iter_content(self)
4.4.0  def iter_content(self, chunk_size: int | None = None)   # interface + aws/azure/gcp/openstack
```

So the kwarg is real, and an older install raises `TypeError: iter_content() got an unexpected
keyword argument 'chunk_size'`. Because cloudbridge is a *conditional* requirement, admins install
it themselves — the floor documents the need, it doesn't enforce it. The failure is caught by
`_get_data_stream`'s `except Exception` and falls back to the cache pull, so nothing breaks for a
user; it just writes a full traceback via `log.exception` on **every** download from a cloud store.
A one-line feature detect, or catching `TypeError` and retrying bare, turns that into a single
startup line.

### N2 — under 4.4.0 the close hook is a no-op for two of the four providers

`cloud.py:275` is unchanged from our branch:

```python
return RemoteDataStream(iter(content), getattr(content, "close", lambda: None))
```

What 4.4.0 actually hands back:

| provider | returns | `close()` releases the read? |
|---|---|---|
| aws | `BucketObjIterator` | **yes** — `close()` calls `body.close()` on the boto3 `StreamingBody` |
| openstack | swiftclient `_ObjectBody` | yes |
| azure | a bare generator (`blob_iterator()`) | **no** — that is the *generator's* `close`, which raises `GeneratorExit` in the loop and never touches `downloader` |
| gcp | successive ranged GETs | n/a — nothing is held open |

So on the azure-via-cloudbridge path the `getattr` finds *a* close that is not *the* close, and
P1-2 quietly does not reach it: the response is released whenever the GC gets to `downloader`.
This is the same failure mode `RemoteDataStream` exists to prevent, and `getattr` is what hides it —
the probe cannot tell a real release from a coincidence of naming. Now that `DataStream` says
closing is part of the contract, the honest version is for the cloud backend to map provider to
release explicitly and use the `lambda: None` where there genuinely is nothing to release.

The comment above that line also still describes the 4.3.1 return types — "a swift generator, a
BytesIO" — neither of which 4.4.0 returns.

### N3 — P2-2 got a third meaning rather than a fix

`STREAM_CHUNK_SIZE` is now the read size on one held-open connection (aws, openstack, azure) *and*
the size of each range request (gcp). cloudbridge's own docstring for the gcp path says to "prefer a
large `chunk_size` when streaming a large object" for exactly that reason: at 1 MiB a 10 GB object
is ~10,240 separate GETs. `onedata.py:38` still declares its own unrelated `STREAM_CHUNK_SIZE`.
Not a blocker — worth a sentence saying the constant is a read size and gcp reinterprets it.

### Status

Not posted. N1–N3 are all small enough to be one comment, and none of them should hold the merge.

---

**Merged into `dev` 2026-08-21.** Worktree removed. N1-N3 above were never posted and now
describe merged code; N2 (the `getattr` close hook not reaching the azure/gcp cloudbridge
providers) is the one that is still a real gap rather than a nit.
