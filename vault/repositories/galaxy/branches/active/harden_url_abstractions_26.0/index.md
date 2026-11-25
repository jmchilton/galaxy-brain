---
upstream_base_branch: release_26.0
pr: 25113
---
# harden_url_abstractions_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:harden_url_abstractions_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/harden_url_abstractions_26.0)

## Status

Status: implemented with DRS lookups hardened. Rebased 2026-11-21 cleanly. Base: `release_26.0` (`99d1b09f33b`), head `197962a4e50`; mvdbeek review 1 ported and CI reds fixed 2026-11-09 ([response](review_mvdbeek_response.md)). [Debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/harden_url_abstractions_26.0`.

PR #25113 opened 2026-11-25 ("[26.0] Check every redirect hop of server-side URL fetches", labels kind/bug, area/security). Fork CI green on `197962a4e50` (CWL conformance skipped), checked 2026-11-22.

## Scope

Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). Port of [`harden_url_abstractions_25.1`](../harden_url_abstractions_25.1/index.md) to `release_26.0`, whose code differs enough that the 25.1 branch doesn't merge forward cleanly.
