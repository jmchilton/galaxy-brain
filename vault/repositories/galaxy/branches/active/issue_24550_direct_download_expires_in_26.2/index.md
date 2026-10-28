---
upstream_base_branch: release_26.2
---

# issue_24550_direct_download_expires_in_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24550_direct_download_expires_in_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24550_direct_download_expires_in_26.2)

## Status

Implemented and hardened (READY) at `c324c6103c9`; needs rebase onto `release_26.2`.

No PR yet.

No CI yet.

## Issue

Fixes [#24550](https://github.com/galaxyproject/galaxy/issues/24550). Issue record: `vault/repositories/galaxy/issues/queued/24550/`.

## Decisions

- Base `release_26.2`: direct download (#22895) first shipped in 26.2.
- Default 3600 shortens s3/cloud URLs from 24 h; PR body must say so and mention #24484 (per-call `expires_in` on dev).
- Not exposed in `ConcreteObjectStoreModel` (no API schema change on release branch).
- Re-scoped once (single XML parse helper); alt `_alt_original_scope`. Declined 7-day cap (S3 SigV4 only).

[Implementation debrief](implementation_debrief.md) · [Initial debrief](initial_implementation_debrief.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md)
