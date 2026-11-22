---
upstream_base_branch: release_26.1
---
# harden_url_abstractions_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:harden_url_abstractions_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/harden_url_abstractions_26.1)

## Status

Status: implemented with DRS lookups hardened. Rebased 2026-11-21 cleanly. Base: `release_26.1` (`12da14a1c7f`), head `bb56b720f97`; mvdbeek review 1 ported and CI reds fixed 2026-11-09 ([response](review_mvdbeek_response.md)). [Debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/harden_url_abstractions_26.1`.

No PR yet. Fork CI on `bb56b720f97`: 24 green; reds unrelated and rerun 2026-11-22 — Unit tests 3.14 job (log unavailable, 3.10 job green) and Selenium `test_history_dataset_update_annotation_and_info` (dataset attributes alert timeout).

## Scope

Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). Port of [`harden_url_abstractions_25.1`](../harden_url_abstractions_25.1/index.md) to `release_26.1`, whose code differs enough that the 25.1 branch doesn't merge forward cleanly.
