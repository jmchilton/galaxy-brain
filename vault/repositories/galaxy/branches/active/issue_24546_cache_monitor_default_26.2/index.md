---
upstream_base_branch: release_26.2
---

# issue_24546_cache_monitor_default_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24546_cache_monitor_default_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24546_cache_monitor_default_26.2)

## Status

Implementation in progress.

## Issue

Fixes [#24546](https://github.com/galaxyproject/galaxy/issues/24546). Issue record: `vault/repositories/galaxy/issues/queued/24546/`.

## Decisions

- Base `release_26.2`, not 25.1: enabling the monitor by default is only safe with the `check_cache` non-positive-size guard (`85aa89f8bb0`), which is on 26.2/dev only.
