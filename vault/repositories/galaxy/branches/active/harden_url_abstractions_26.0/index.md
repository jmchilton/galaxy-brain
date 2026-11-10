---
upstream_base_branch: release_26.0
---
# harden_url_abstractions_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:harden_url_abstractions_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/harden_url_abstractions_26.0)

## Status

Status: implemented with DRS lookups hardened. Base: `release_26.0` (`784549f48d6`), head `2ceafdbaf31`; mvdbeek review 1 ported and CI reds fixed 2026-11-09 ([response](review_mvdbeek_response.md)). [Debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/harden_url_abstractions_26.0`.

No PR yet. Fork CI on `2ceafdbaf31`: 20 green; macOS startup and Selenium shard 2 cancelled with no test failures (runner, unrelated), rerun 2026-11-10.

## Scope

Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). Port of [`harden_url_abstractions_25.1`](../harden_url_abstractions_25.1/index.md) to `release_26.0`, whose code differs enough that the 25.1 branch doesn't merge forward cleanly.
