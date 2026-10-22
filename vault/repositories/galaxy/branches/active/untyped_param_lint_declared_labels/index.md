# Editor untyped-parameter lint: skip renames backed by a parameter input

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:untyped_param_lint_declared_labels?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/untyped_param_lint_declared_labels)

## Status

Hardened and re-scoped (backend run-form narrowing added), READY; head `e953ff7344a` on base `release_26.1`; see [implementation_debrief.md](implementation_debrief.md).

No PR yet.

No CI yet.

## Issue

[#24379](https://github.com/galaxyproject/galaxy/issues/24379), filed 2026-10-22; tracked in `vault/repositories/galaxy/issues/wip/24379/`.

## Decisions

- Retargeted in place from `dev` to `release_26.1` per scope evaluation. Original client-only `dev` scope kept as alt `untyped_param_lint_declared_labels_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

## Context

Surfaced while writing gxformat2#271 / galaxy-tool-util-ts#195 (untyped param lint), which already exempt declared-label renames.
