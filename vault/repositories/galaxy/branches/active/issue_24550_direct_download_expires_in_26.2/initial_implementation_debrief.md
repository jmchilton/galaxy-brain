# Initial implementation debrief

```
created .../differential-review/snapshots/20261028T200225Z-implementation-fd83d4bfe00f.json
  implementation @ fd83d4bfe00f vs origin/release_26.2 (merge-base 7302ad24d3e1)
  first snapshot: 3 commits, 7 files, 15 hunks
```

- Base `release_26.2` (direct download shipped in 26.2 via #22895).
- `edcff857f56` Baseline tests: pin boto3 3600, s3 86400, azure 3600 lifetimes (cloud already pinned).
- `dd24bf34834` Fix: `direct_download_expires_in` on `ConcreteObjectStore` (default 3600, in `to_dict`), XML classmethod parse for s3/boto3/azure (cloud via `s3.parse_config_xml`); s3/cloud/boto3/azure `_get_object_url` read it. Sample YAML documents it in boto3 block; "~1 hour" text points at the setting.
- `fd83d4bfe00` Reject non-positive values (review nit).
- Choices: no `expires_in` kwarg (left to #24484; avoids leaking kwarg into irods/pithos `_exists(**kwargs)` and rucio/pulsar signatures); not in `ConcreteObjectStoreModel` (no API schema change on release branch).
- Unit tests: `test/unit/objectstore/` 207 passed, 16 skipped. Worktree `.venv` symlinked to issue_24546's 26.2 venv.
