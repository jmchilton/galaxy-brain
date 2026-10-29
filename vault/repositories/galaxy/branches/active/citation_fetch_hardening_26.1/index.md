---
upstream_base_branch: release_26.1
---
# citation_fetch_hardening_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:citation_fetch_hardening_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/citation_fetch_hardening_26.1)

## Status

`READY`: implemented, re-scoped once (shared `cached_fetch`, Tool Shed fix), re-hardened; head `cda4733996f`. See [implementation_debrief.md](implementation_debrief.md).

No PR.

No CI run yet.

## Scope (John, 2026-10-29)

Harden tool citation handling for every tool source (XML, YAML, user-defined tools): bounded DOI fetches, uniform per-tool citation caps, and reusable cached-fetch infrastructure. Unblocks user-tool citation resolution on [yaml_tool_model_validation_26.1](../yaml_tool_model_validation_26.1/index.md).

- Target release_26.1 for all of it.
- One citation cap for every tool; over-cap entries dropped with a warning, no profile gating.
- Redirect hops checked with the existing `validate_non_local`; no host allowlist.
- Commits structured so the work can split into several PRs.

Original scope kept as `citation_fetch_hardening_26.1_alt_original_scope` ([alt](alts/original_scope.md)).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md)
