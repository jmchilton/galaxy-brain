---
upstream_base_branch: release_25.1
---
# harden_url_abstractions_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:harden_url_abstractions_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/harden_url_abstractions_25.1)

## Status

Status: BLOCKED on a scope decision (route DRS lookups through `ValidatingSession`?); see [implementation debrief](implementation_debrief.md). Base: `release_25.1` (`83296278444`), head `3355e25a9b2`. Worktree: `~/projects/worktrees/galaxy/branch/harden_url_abstractions_25.1`. Alt: `harden_url_abstractions_25.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

No PR yet. CI not yet seen.

## Scope

Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). `validate_non_local` reads the scheme and host the way Galaxy's HTTP clients do, and the http file source, TRS proxy and remote ZIP source check each redirect hop with it before following it.
