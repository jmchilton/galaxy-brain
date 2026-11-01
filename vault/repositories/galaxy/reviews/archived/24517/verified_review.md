### P2 1: boto3 raises botocore's `ClientError` for a missing object; every other store raises `ObjectNotFound` (implementation verified)

`S3ObjectStore._read_remote_head` special-cases only `InvalidRange` and re-raises every other error. A missing key therefore escapes `get_data_head` as `botocore.exceptions.ClientError` (`NoSuchKey`). The other stores raise `galaxy.exceptions.ObjectNotFound`:

- disk, from `_get_filename`
- nested stores, from `_call_method`
- legacy `s3` and `cloud`, whose `_stream_remote` returns `None` so they fall back to `_get_filename`

A caller such as the Crypt4GH header check in #23986 would need to catch an SDK-specific exception for each backend. `test_get_data_head_boto3_fails_for_a_missing_object` pins the leaky behavior with `pytest.raises(ClientError)`.

The suggested fix maps `NoSuchKey`/`404` to `ObjectNotFound` in `_read_remote_head`, the same way `_exists_remotely` already treats `404`. It also replaces the missing-object test with one parametrized over disk, distributed and boto3 that expects `ObjectNotFound`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the parametrized unit test and the SeaweedFS integration test (P2 2) both failed on boto3 before the fix (the real bucket returned `NoSuchKey`) and passed after.

</details>

### P2 2: The S3 behavior this PR exists for is only tested against a mocked client (implementation verified)

The boto3 tests replace `_client` with a `MagicMock` and hand-build `ClientError(InvalidRange)`. They show that the branches exist, but not that an S3-compatible backend behaves as assumed, for example that a ranged GET on an empty object gives `InvalidRange`. The motivating case is a stale empty cache file plus remote data, and it never runs against a real store. `test/integration/objectstore/` already has SeaweedFS-backed base classes for boto3 (behind a hierarchical store) and for cloud (cloudbridge).

The suggested fix adds an integration test on those bases. It should cover a stale zero-byte cache file (which must return the remote bytes and stay empty), a size larger than the object, an empty object, and a missing object. The cloud subclass exercises the generic stream-and-stop path.

<details><summary>Details</summary>

`pr_24517_review_0` adds `test/integration/objectstore/test_get_data_head.py`. It reuses `BaseSeaweedFSObjectStoreIntegrationTestCase` and `BaseCloudObjectStoreIntegrationTestCase`, and both classes pass locally. Caching stores skip pushing empty files, so the empty-object case writes the object straight to the bucket. The mocked unit tests are kept because they pin the request shape (`Range`, `body.close`).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort and by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `TestBoto3GetDataHeadIntegration` and `TestCloudGetDataHeadIntegration` (3 tests each) pass against SeaweedFS.

</details>

### P3 1: `size <= 0` sends `Range: bytes=0--1` to S3 (implementation verified)

`get_data_head(obj, 0)` on boto3 builds `Range=bytes=0--1`. That range is syntactically invalid, so S3 ignores it and returns the whole object, which `body.read()` then loads into memory. On the generic streaming path, `size=0` still opens a remote read and pulls one chunk. On disk, a negative size reaches `f.read(-1)` and reads the whole file.

The suggested fix returns `b""` for `size <= 0` once, in `BaseObjectStore.get_data_head`, and adds a unit test.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the new unit test failed before the guard (a `get_object` call was made) and passed after.

</details>

### P3 2: On Azure, reading a few header bytes can still download up to 32 MiB

Azure falls through to the generic `_read_remote_head`, which iterates `download_blob().chunks()`. The Azure SDK's first GET fetches `max_single_get_size` bytes (32 MiB by default). Reading a 16-byte header therefore downloads any blob under 32 MiB in full, and 32 MiB of anything larger. That contradicts the docstring's "without pulling the whole object". A missing blob probably also escapes as `azure.core.exceptions.ResourceNotFoundError` rather than `ObjectNotFound`, the same problem P2 1 fixes for boto3.

The suggested fix gives Azure its own ranged override, like boto3's. Map a missing blob to `ObjectNotFound`, and confirm how the SDK behaves for a ranged read of an empty blob.

<details><summary>Details</summary>

```python
def _read_remote_head(self, rel_path: str, size: int) -> bytes | None:
    try:
        return self._blob_client(rel_path).download_blob(offset=0, length=size).readall()
    except ResourceNotFoundError:
        raise ObjectNotFound(...)
```

`test_get_data_head_stops_streaming_once_it_has_enough_bytes` runs on `azure_simple.yml`. With this override, that test would need to move to another streaming store (for example `cloud`) to keep covering the generic path. Cloudbridge providers whose `iter_content` buffers have a similar problem, with no obvious fix.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 3: The fallback tests patch away boto3's own override; use a store that really cannot stream (implementation verified)

`test_get_data_head_reads_the_cached_copy_when_the_backend_cannot_stream` and `..._refreshes_an_empty_cached_copy_...` patch `_read_remote_head` to return `None` on a boto3 store. boto3 overrides that method, so this configuration cannot happen. Pithos has no `_stream_remote`, and the file already has `UninitializedPithosObjectStore`.

The suggested fix runs both tests on `PITHOS_TEST_CONFIG_YAML` and drops the `_read_remote_head` patch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: both tests pass on Pithos without patching `_read_remote_head`.

</details>

### P3 4: Function-local `ClientError` imports in tests (implementation verified)

Two new tests import `from botocore.exceptions import ClientError` inside the function, while the rest of the file imports at module top. botocore is a dev requirement, and `test_s3_boto3_delete.py` already imports it at top level.

The suggested fix imports `ClientError` once, at the top of the module.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the fix is in `pr_24517_review_0` and the tests pass.

</details>
