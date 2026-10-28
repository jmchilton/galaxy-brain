# Implementation debrief

STATUS: READY. Head `c324c6103c9`, base `release_26.2` (direct download shipped in 26.2).

```
exists /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24550_direct_download_expires_in_26.2/differential-review/snapshots/20261028T201252Z-hardening-c324c6103c94.json
  hardening @ c324c6103c94 vs origin/release_26.2 (merge-base 7302ad24d3e1)
  since 20261028T200225Z-implementation-fd83d4bfe00f:
    commits: 3 same, 0 rebased, 0 changed, 2 new, 0 dropped
    hunks:   10 carried, 5 changed, 0 new, 0 dropped
    new     e847189563cc Drop attribute assertion from direct_download_expires_in parse test
    new     c324c6103c94 Parse direct download XML settings with one helper
```

- Per-store `direct_download_expires_in` (seconds, default 3600, must be > 0) on `ConcreteObjectStore`, in `to_dict`; XML via one `parse_direct_download_config_from_config_xml` helper (s3/boto3/azure; cloud via `s3.parse_config_xml`). s3, cloud, boto3, azure_blob `_get_object_url` use it. Sample YAML documents it.
- **Behavior change:** aws_s3/generic_s3/cloud direct-download URLs drop 24 h → 1 h by default. Call out in PR body.
- Not in `ConcreteObjectStoreModel` (no API schema change on release branch). No `expires_in` kwarg; #24484 (dev) adds that — its merge-forward resolves each backend to `self.direct_download_expires_in if expires_in is None else expires_in`; mention #24484 in PR body.
- Re-scoped once (helper fold); declined 7-day cap (S3-SigV4-only) and example changes. Alt `_alt_original_scope`. Second scope eval: keep.
- Hardening (round 2): test challenge no changes (8 new tests red on base); Codex no findings; thermo-nuclear ship; baseline refactor none. `make format` clean; mypy on changed files matches base count.
- Tests: `test/unit/objectstore/` 207 passed, 16 skipped. Release 26.2 has moved ahead; rebase at polish.
