---
upstream_base_branch: release_25.1
---
# harden_url_abstractions_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:harden_url_abstractions_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/harden_url_abstractions_25.1)

## Status

Status: in implementation. Base: `release_25.1` (`9eb3271d60a`). Worktree: `~/projects/worktrees/galaxy/branch/harden_url_abstractions_25.1`.

No PR yet. CI not yet seen.

## Scope

Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). `validate_non_local` reads the scheme and host the way Galaxy's HTTP clients do, and the http file source, TRS proxy and remote ZIP source check each redirect hop with it before following it.
