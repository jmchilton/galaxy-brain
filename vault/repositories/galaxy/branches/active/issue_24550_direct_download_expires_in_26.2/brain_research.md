```yaml
documents:
  - path: vault/research/Component - Object Store Cache and Direct Access.md
    why: Direct-download path, backend matrix with hardcoded presign lifetimes (boto3 3600, aws_s3/cloud 86400, azure 1h), ConcreteObjectStore flag parsing/to_dict/to_model, Nested dispatch forwarding, tests and gotcha 7.
  - path: vault/repositories/galaxy/issues/queued/24550/proposal.md
    why: The issue text; proposed per-store direct_download_expires_in (default 3600) parsed from YAML and XML, passed to _get_object_url unless caller supplies expires_in.
    load_when: Scoping the change or writing the PR description.
  - path: vault/repositories/galaxy/issues/queued/24550/raw.md
    why: File/line map for each backend lifetime, sample-config quote locations and the suggested test locations.
    load_when: Locating edit sites and docs to fix.
  - path: vault/repositories/galaxy/reviews/active/24484/risks.md
    why: Open PR #24484 changes get_direct_download_url/_get_object_url signatures (expires_in=None, addressing kwargs); this branch must stay conflict-compatible.
    load_when: Deciding how _get_direct_download_url passes the lifetime (release_26.2 has no expires_in param yet).
  - path: vault/repositories/galaxy/reviews/active/24484/verified_review.md
    why: Verified findings on the same direct-download/staging code, including the 15-minute Pulsar staging URL default that overrides the store setting.
    load_when: Reviewing interaction between per-call expires_in and the per-store default.
  - path: vault/research/Component - Private Object Stores.md
    why: Confirms user-defined store templates are a separate config path; check whether the new setting needs template/model exposure (enable_direct_download is not in templates today).
    load_when: Checking whether config surfaces beyond object_store_conf need the new key.
research_requests: []
```

Notes (non-schema, for implementers):

- Base is `release_26.2` (`7302ad24d3e`); #24484 is still open against `dev`, so `expires_in` does not exist on `_get_object_url` / `get_direct_download_url` here. The change must add the per-backend lifetime parameter itself (or use `self.direct_download_expires_in` inside each `_get_object_url`) in a form #24484 can rebase onto.
- Edit sites on 26.2: `objectstore/__init__.py` (`parse_enable_direct_download_from_config_xml` ~857, `ConcreteObjectStore.__init__` ~930, `to_dict` ~951, `to_model` ~964, `ConcreteObjectStoreModel` ~1999, `_get_direct_download_url` ~968); backends `s3.py:424`, `s3_boto3.py:473`, `azure_blob.py:334`, `cloud.py:384`; each backend's `parse_config_xml` (`s3.py:98`, `s3_boto3.py:143`, `azure_blob.py:93`) emits `enable_direct_download` -- cloud reuses the s3 parser. `ConcreteObjectStoreModel` is an API model; regenerate client schema only if the field is added there.
- Docs/config: `lib/galaxy/config/sample/object_store_conf.sample.yml` (flag documented at lines 200-206, 247-249, 372-374, 401, 425); examples in `lib/galaxy/objectstore/examples/{boto3,cloud}_direct_download.{xml,yml}`.
- Tests: `test/unit/objectstore/test_objectstore.py` (`test_config_parse_enable_direct_download` ~800, `test_get_direct_download_url_*` ~814-850, cloud ~2010-2050 which pins `expires_in=86400`); integration `test/integration/objectstore/test_direct_download_redirect.py`.
- Gaps: no stale or conflicting vault notes found. Research note was ingested at `origin/dev` `7761eeb3256`; line numbers differ slightly on 26.2. The pending `gx_research/todo/object_store_cache_and_direct_access.md` request is already satisfied by the existing note; no new research requests queued.
