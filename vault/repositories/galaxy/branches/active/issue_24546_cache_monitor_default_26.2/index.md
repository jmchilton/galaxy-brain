---
upstream_base_branch: release_26.2
---

# issue_24546_cache_monitor_default_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24546_cache_monitor_default_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24546_cache_monitor_default_26.2)

## Status

Implemented and hardened at `6fe63109810`, re-scoped once (iRODS/pithos). BLOCKED on a scope decision: the second scope eval says expand (pithos XML `<cache>`; base-class monitor lifecycle).

No PR yet.

CI not run.

## Issue

Fixes [#24546](https://github.com/galaxyproject/galaxy/issues/24546). Issue record: `vault/repositories/galaxy/issues/queued/24546/`.

## Decisions

- Base `release_26.2`, not 25.1: enabling the monitor by default is only safe with the `check_cache` non-positive-size guard (`85aa89f8bb0`), which is on 26.2/dev only.
- No startup warning for `external`, which the docs recommend for production. Only `celery` with Celery off warns.
- User-defined stores are pinned to `external`; the per-store gate defaults to true and an explicit false still opts out.
- Original scope (without iRODS/pithos) kept as alt `issue_24546_cache_monitor_default_26.2_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

[Implementation debrief](implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md)
