Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: `baeca0d7dc6ce8144de0ca0d95e6b5abb93a9ac4`

The one-way risks are a new unauthenticated-by-session, signature-authorized route (`/api/jobs/{job_id}/staging/inputs/...`) and URL/signature format that Pulsar deployments will start depending on, plus widened `ObjectStore.get_data_stream` / `get_direct_download_url` signatures that third-party object stores must follow; the feature itself is opt-in per destination, so default deployments are unaffected.

<details><summary>Risk Details</summary>

- New route outside the documented API (`include_in_schema=False`) authorized only by an HMAC in the query string; once Pulsar 0.16.x clients rely on it, changing path shape, `exp`/`sig`/`redirect` params, or the `v1|job|kind|id|path|exp` message requires versioning (`KEY_PURPOSE` already carries `v1`).
- Signing key is derived from `id_secret`; rotating `id_secret` invalidates in-flight staging URLs for queued/running Pulsar jobs.
- Staging URLs are issued at submit with a 7-day lifetime, bounded earlier only by the job leaving `non_ready_states`; bearer credentials in query strings can leak through proxy/access logs (sample config warns, but nothing enforces it).
- Abstract `ObjectStore` method signatures change (`write_cache`, `extra_dir`, `extra_dir_at_root`, `alt_name`, `expires_in`); out-of-tree object store plugins overriding `_get_direct_download_url` / `_get_data_stream` without `**kwargs` will break when called by this path.
- `MetadataFile.get_file_name` refactor (`object_store_path_kwargs`) touches every metadata file path lookup, not just Pulsar staging.
- Hard dependency on unreleased Pulsar (galaxyproject/pulsar#553): `ClientInput(url=...)` fails on the pinned `pulsar-galaxy-lib==0.16.0`, so merge order and the pin bump must be coordinated.
- Redirect mode is gated on Pulsar >= 0.15.16, a version gate that must be kept in sync with Pulsar's actual curl redirect behavior.
- Metadata file ids are matched back from paths (`_metadata_file_with_path`); a mismatch silently falls back to the job files API rather than failing.
- Composite-input extra files are explicitly deferred to a stacked PR, so `object_store_staging` users still need shared disk/cache for those inputs.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the endpoint and signer as a long-lived contract: confirm the authorization model (job must be active, object must be one of the job's inputs, purged inputs refused) is what Galaxy wants to commit to, whether a 7-day URL lifetime is appropriate, and whether the route/param naming is one Galaxy is happy to keep stable with Pulsar. Security-minded review of `lib/galaxy/managers/job_object_staging.py` and `lib/galaxy/security/staging_signer.py` is warranted.

Object store maintainers should confirm the widened abstract signatures are acceptable for all in-tree backends and plugins, and that skipping the cache (`write_cache=False`) has no side effects on cache accounting. Merge should be sequenced with the Pulsar release and the `pulsar-galaxy-lib` pin bump.

</details>
