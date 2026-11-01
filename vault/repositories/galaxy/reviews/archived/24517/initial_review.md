# Initial review — galaxy#24517 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort low
- Reviewed commit: `ad4429e15db` ("Read the start of an object from where it is stored"), base `origin/dev` (`87d295c92eb`)
- Tests: the 8 new `get_data_head` unit tests pass locally. Probe script (scratchpad, not committed) used to check missing-object and `size=0` behavior.

## Verdict

Small, well-shaped addition. It follows the existing `get_data_stream` / `_stream_remote` pattern: abstract method on `ObjectStore`, `_invoke` dispatch in `BaseObjectStore`, per-store `_get_data_head`, and a `_read_remote_head` hook that boto3 overrides with a ranged GET. Nested stores dispatch via `_call_method`, same as `_get_data`. It reuses `_stream_remote` and `_get_filename`'s existing "zero-size cache is stale" rule, so it adds little new machinery. Main gap: what happens when the object is missing differs by backend. Everything else is minor. Mergeable after P2 1.

No production caller in this PR; that's stated (split from #23986), so not raised.

## Findings

### P2 1: Missing object raises a raw `botocore` `ClientError` on boto3 but `ObjectNotFound` everywhere else

`S3ObjectStore._read_remote_head` (`lib/galaxy/objectstore/s3_boto3.py`) only special-cases `InvalidRange` and re-raises anything else. A missing key therefore surfaces as `botocore.exceptions.ClientError` (`NoSuchKey`). The other paths raise `galaxy.exceptions.ObjectNotFound`:

- disk: `_get_filename` raises it
- nested: `_call_method(..., ObjectNotFound, True)`
- legacy `s3` and `cloud`: `_stream_remote` returns `None` for a missing key, so they fall back to `_get_filename`, which raises it

Probe at `ad4429e1`:

```
disk missing       -> galaxy.exceptions.ObjectNotFound
boto3 missing      -> botocore.exceptions.ClientError   (isinstance ObjectNotFound: False)
legacy s3 missing  -> galaxy.exceptions.ObjectNotFound
```

Azure is likely the same as boto3: `download_blob()` raises `ResourceNotFoundError` and the generic `_read_remote_head` doesn't catch it. That was not probed.

The intended caller in #23986 checks a header to decide whether outputs are acceptable. It would have to catch a different SDK exception for each backend, which defeats the point of an object-store-agnostic method. The new test `test_get_data_head_boto3_fails_for_a_missing_object` locks in the leaky behavior with `pytest.raises(ClientError)`.

Suggested fix: in boto3 `_read_remote_head`, map `NoSuchKey`/`404` to `ObjectNotFound` (raise, or return `None` so the method falls through to `_get_filename`'s `ObjectNotFound`). Change the test to expect `ObjectNotFound`. Optionally do the same for Azure's `ResourceNotFoundError` in the generic path, or give Azure its own override (see P3 1).

### P3 1: Azure's "stop once enough bytes" still fetches up to `max_single_get_size` (32 MiB default)

The generic `_read_remote_head` iterates `download_blob().chunks()`. The Azure SDK's downloader makes its first GET for `max_single_get_size` bytes (default 32 MiB; configurable in `azure_blob.py` transfer settings). So reading a 16-byte header from an Azure object under 32 MiB downloads the whole object, and for larger objects downloads 32 MiB. That contradicts the docstring's "without pulling the whole object". Azure supports ranges directly, so an override that matches the boto3 one is cheap:

```python
def _read_remote_head(self, rel_path: str, size: int) -> bytes | None:
    return self._blob_client(rel_path).download_blob(offset=0, length=size).readall()
```

(The SDK copes with ranged reads of empty blobs. Confirm, and map `ResourceNotFoundError` per P2 1.) Cloud (cloudbridge) has the same issue for providers whose `iter_content` buffers. That fix is less clear-cut; mention only.

### P3 2: `size <= 0` sends `Range: bytes=0--1` to S3

`get_data_head(obj, 0)` on boto3 sends `Range=bytes=0--1` (confirmed by probe). Per RFC 9110, S3 ignores a syntactically invalid Range and returns the whole object, which `body.read()` then loads into memory. The generic streaming path also reads one full chunk before returning `b""`. No current caller passes 0, but the guard is one line: return `b""` (or raise `ValueError`) for `size <= 0` in `BaseObjectStore.get_data_head`.

### P3 3: Mocked-only S3 semantics; existing SeaweedFS harness could cover the real case

The boto3 tests mock `get_object`, so the `InvalidRange`-on-empty handling and the stale-empty-cache scenario are asserted against assumed S3 behavior. `test/integration/objectstore/test_tee_streaming.py` already runs boto3 and cloud stores against a disposable SeaweedFS container. A small integration test there could:

1. Write an object straight to the bucket.
2. Leave an empty file in the cache.
3. Assert that `app.object_store.get_data_head` returns the remote bytes, for both an empty and a non-empty object.

That would replace much of the mocking with real coverage and exercise the exact Pulsar/extended-metadata failure the PR targets.

### P3 4: Streaming stores ignore a valid (non-empty) cached copy

For stores that can stream (boto3, azure, cloud, legacy s3), `_get_data_head` always goes remote, even when the cache holds a full non-empty copy. Non-streaming stores trust a non-empty cache via `_get_filename`. The PR's own rationale is that the stale case is the *empty* cache file left by `create`. That is the same rule `_get_filename` already applies ("always pull if file size in cache is zero"), and `_get_data_stream` also prefers the cache. Reading a non-empty cached copy first would save a remote round trip on every call and make behavior the same across backends. If there is a real case of a non-empty but stale cache, a one-line note in the docstring would justify the always-remote choice. Minor/design question.

## Non-findings checked

- `PulsarObjectStore` (subclasses `BaseObjectStore`) has no `_get_data_head`, so `get_data_head` would raise `AttributeError` there. That store is self-described as beta/aspirational and already lacks several hooks, so this is not raised.
- No other in-tree subclasses of `ObjectStore` are broken by the new abstract method.
- The nested store's `_get_data_head(self, obj, **kwargs)` forwards `size` through kwargs correctly; the distributed test covers it.
- Remote errors in `_read_remote_head` propagate rather than falling back as `_get_data_stream` does. For a header-validation caller, failing loudly is preferable, so this is not raised.
