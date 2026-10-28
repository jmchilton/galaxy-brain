# Direct-download URLs from aws_s3, generic_s3 and cloud object stores last 24 hours, not the documented ~1 hour

With `enable_direct_download: true`, the `aws_s3`, `generic_s3` and `cloud` object stores redirect dataset downloads to presigned URLs that stay valid for 24 hours, while the sample config says they expire in about an hour.

| Store type | Presigned URL lifetime on `dev` | What `object_store_conf.sample.yml` says |
| --- | --- | --- |
| `boto3` | 1 h (`ExpiresIn=3600`) | "anyone with the URL can fetch the object until it expires (~1 hour)" |
| `azure_blob` | 1 h (`timedelta(hours=1)`) | "short-lived SAS URL … See the boto3 example above for the tradeoffs" |
| `aws_s3` / `generic_s3` | **24 h** (`expires_in=86400`) | "short-lived presigned URL … See the boto3 example above for the tradeoffs" |
| `cloud` | **24 h** (`expires_in=86400`) | "short-lived presigned URL … See the boto3 example above for the tradeoffs" |

A presigned URL is a bearer link. Anyone holding it can fetch the object until it expires, and removing someone's access to the dataset in Galaxy doesn't revoke it. An admin who reads the boto3 note and turns this on for an `aws_s3` or `cloud` store gets a window 24 times longer than they were told. None of the four lifetimes can be configured.

<details><summary>Reproduction</summary>

A unit test against `dev`, built on the helpers in `test/unit/objectstore/test_objectstore.py`, enables direct download on each store, mocks the SDK, and records the lifetime it is asked to sign:

```
boto3: 3600 s (1 h)
aws_s3 (type: s3): 86400 s (24 h)
cloud: 86400 s (24 h)
```

The existing `test_cloud_get_direct_download_url_forwards_response_headers` already asserts `expires_in=86400` for `cloud`.

Code:
- `lib/galaxy/objectstore/s3_boto3.py`: `ExpiresIn=3600`
- `lib/galaxy/objectstore/azure_blob.py`: `expiry=now() + timedelta(hours=1)`
- `lib/galaxy/objectstore/s3.py`: `key.generate_url(expires_in=86400, ...)  # 24hrs`
- `lib/galaxy/objectstore/cloud.py`: `expires_in=86400,  # 24hrs`

The 24 h values come from `_get_object_url`, which existed before direct download. Nothing outside the object store package called it until 🔀 #22895 wired it into the download route.

</details>

## Context

Direct downloads were added in 🔀 #22895 (for 🎯 #19255). The open 🔀 #24484 threads an `expires_in` argument through `get_direct_download_url` to each presigning backend's `_get_object_url` (its Pulsar staging asks for 15 minutes), but a call without it keeps the backend's current default, so this gap remains after it merges.

## Proposed Approach

Add a per-store `direct_download_expires_in` setting in seconds, defaulting to 3600, parsed from YAML and XML and stored on `ConcreteObjectStore` next to `enable_direct_download`. `_get_direct_download_url` then passes it to `_get_object_url` unless the caller supplies its own `expires_in`, which is how #24484 requests its shorter staging lifetime. Document the setting once in the sample config, and update the cloud test (and #24484's per-store lifetime tests, if merged first) to expect the configured value.

## Alternative Approaches

Changing the two hardcoded 86400 values to 3600, with no new setting, is the smallest fix and makes the docs true. It still leaves admins no way to choose shorter or longer windows. A setting costs little once #24484 threads `expires_in` through, so we prefer it. Changing the docs to say 24 h would match the code but keep the longer exposure for no clear reason.

<details><summary>Alternatives In Detail</summary>

### Alternative: Align hardcoded values only

<details><summary>Description</summary>

#### Details

Change `s3.py` and `cloud.py` to 3600 and fix the cloud unit test. No config surface.

#### Why the proposed approach is preferred

It is about the same amount of work once `expires_in` is threaded through (#24484), and sites that serve very large files to slow clients may need longer URLs while sensitive sites may want shorter ones.

</details>

### Alternative: Document 24 h for these backends

<details><summary>Description</summary>

#### Details

Leave the code alone and change the sample comments for `aws_s3`, `generic_s3` and `cloud`.

#### Why the proposed approach is preferred

It keeps a 24 h bearer-link window as the default for no stated reason, and the backends would keep behaving differently for the same setting.

</details>

</details>
