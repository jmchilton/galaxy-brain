---
upstream_base_branch: release_26.0
---

# issue_24485_collection_count_zero_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24485_collection_count_zero_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24485_collection_count_zero_26.0)

## Status

Implementation in progress.

## Issue

Fixes [#24485](https://github.com/galaxyproject/galaxy/issues/24485). Issue record: `vault/repositories/galaxy/issues/queued/24485/`.

## Decisions

- Base `release_26.0`: regression from `6178df3dcff` (min/max for test output collections, 26.0); `release_25.1` still checks `count is not None`.
