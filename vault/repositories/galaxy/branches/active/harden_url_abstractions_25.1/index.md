---
upstream_base_branch: release_25.1
---
# harden_url_abstractions_25.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:harden_url_abstractions_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/harden_url_abstractions_25.1)

## Status

Status: mvdbeek review 1 applied 2026-11-09 ([response](review_mvdbeek_response.md)), P3-3 deferred to dev. Base: `release_25.1` (`7650883076c`), head `35b29a37c80`. Worktree: `~/projects/worktrees/galaxy/branch/harden_url_abstractions_25.1`. Alt: `harden_url_abstractions_25.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

No PR yet. Fork CI pending on `35b29a37c80` (previous head `c7579bb67cb` green).

## Scope

Part of [URL Abstraction Hardening](../../../../../projects/url_abstraction_hardening/index.md). `validate_non_local` reads the scheme and host the way Galaxy's HTTP clients do, and the http file source, TRS proxy, remote ZIP source and DRS lookups check each redirect hop with it before following it.

## Rebase 2026-11-06

Onto `release_25.1` `7650883076c`, which added the TRS bounded timeout and error handling (`e93f3b56572`, `272d9957804`). `TrsServer._get` keeps them inside the session factory. `test_slow_server_reported_as_timeout` now allowlists `127.0.0.1` because `ValidatingSession` blocks local user URLs. `test_trs_proxy.py` + `test/unit/files`: 185 passed, 17 skipped.

DRS servers on non-public addresses now need a `fetch_url_allowlist` entry; include this in the release note.
