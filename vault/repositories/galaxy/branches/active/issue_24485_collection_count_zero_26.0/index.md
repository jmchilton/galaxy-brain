---
upstream_base_branch: release_26.0
---

# issue_24485_collection_count_zero_26.0

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:issue_24485_collection_count_zero_26.0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24485_collection_count_zero_26.0)

## Status

Implemented and hardened (READY) at `8eb7779ec8a`; awaiting polish.

No PR.

Fork CI pending.

## Issue

Fixes [#24485](https://github.com/galaxyproject/galaxy/issues/24485). Issue record: `vault/repositories/galaxy/issues/queued/24485/`.

## Decisions

- Base `release_26.0`: regression from `6178df3dcff` (min/max for test output collections, 26.0); `release_25.1` still checks `count is not None`.
- Scope as implemented (scope eval); Codex no findings.

[Implementation debrief](implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Baseline refactor](baseline_refactor.md)
