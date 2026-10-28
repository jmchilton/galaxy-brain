# Re-scope debrief

Scope eval 1 recommended modest expansion (3 items). Original scope kept as `_alt_original_scope` @ `e847189563c` (see `alts/original_scope.md`).

- Done: one `parse_direct_download_config_from_config_xml` helper replaces per-site `enable_direct_download` + `direct_download_expires_in` XML parse in s3/boto3/azure (`c324c6103c9`). Fully annotated so mypy count matches base.
- Declined: 7-day upper cap. 604800 is S3 SigV4's limit only; Azure SAS and legacy boto (SigV2) have no such cap, so a global cap is wrong. Unverified against provider docs.
- Declined: set setting in `boto3_direct_download.*`/`cloud_direct_download.*` examples. Those examples back the default-lifetime tests; YAML+XML parse already tested via `.replace()` on them.
- Post-rescope review: ship, no bugs (`subagents/normal_review_2_rescope.md`).
