# Direct-download URLs live 24 h on aws_s3/generic_s3/cloud, docs promise ~1 h

Found while researching [[Component - Object Store Cache and Direct Access]] (gx_research, 2026-10-28). Verified against `origin/dev` @ `7761eeb3256`.

## Problem

#22895 added `enable_direct_download`: dataset downloads 302 to a presigned URL from the backing store. The URL is a bearer link — anyone holding it can fetch the object until it expires, and revoking Galaxy access doesn't revoke it. The lifetime is hardcoded per backend and inconsistent:

| Backend | Where | Lifetime |
|---|---|---|
| `boto3` | `objectstore/s3_boto3.py:473` `ExpiresIn=3600` | 1 h |
| `azure_blob` | `objectstore/azure_blob.py:334` `expiry=now() + timedelta(hours=1)` | 1 h |
| `aws_s3` / `generic_s3` | `objectstore/s3.py:424` `key.generate_url(expires_in=86400, ...)  # 24hrs` | **24 h** |
| `cloud` | `objectstore/cloud.py:384` `expires_in=86400,  # 24hrs` | **24 h** |

The 86400 values predate #22895: `_get_object_url` existed (unused outside `objectstore/`) and #22895 wired it into the download route without revisiting the lifetime.

## Docs

`lib/galaxy/config/sample/object_store_conf.sample.yml:200-206` (boto3 block): "anyone with the URL can fetch the object until it expires (~1 hour)". The `aws_s3` (`:247-249`), `generic_s3` (`:372-374`) and `cloud` (`:423-425`) blocks say "short-lived presigned URL ... See the boto3 example above for the tradeoffs" — i.e. they inherit the ~1 h claim, but issue 24 h URLs. Admins enabling it on those backends get 24× the exposure window they were told.

## Fix

1. Minimal: make the four backends agree (3600 s default) and keep docs as-is.
2. Better: per-store `direct_download_expires_in` (seconds) config, parsed in `parse_enable_direct_download_from_config_xml`'s neighborhood (`objectstore/__init__.py:857-861`) and stored on `ConcreteObjectStore` alongside `enable_direct_download` (`:930`, `to_dict` `:951`), default 3600, documented in the sample.

Open #24484 already threads `expires_in=None` through every backend `_get_object_url` and `get_direct_download_url` (keeping current defaults, using 900 s for Pulsar staging). Fix 2 is a small follow-on once it lands: `ConcreteObjectStore._get_direct_download_url` passes `expires_in or self.direct_download_expires_in`. If filed before #24484 merges, mention it so the two don't conflict.

## Tests

`test/unit/objectstore/test_objectstore.py` `test_get_direct_download_url_*` (`:814-850`) and `test_cloud_get_direct_download_url_*` (`:2028-2050`) mock the SDK; red test: assert the lifetime passed to `generate_url` / `generate_presigned_url` / `generate_blob_sas` is 3600 (or the configured value) for each backend.

## Labels

kind/bug, area/objectstore, area/configuration, area/security (hardening, not a vuln — behavior is opt-in and visible in source). Related: #22895, #24484, #19255.
