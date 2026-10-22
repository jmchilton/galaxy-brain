# Editor untyped-parameter lint: skip renames backed by a parameter input

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:untyped_param_lint_declared_labels?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/untyped_param_lint_declared_labels)

## Status

Implemented and pushed (head `6bb6d2cab4d`, base `dev`); see [research.md](research.md) and [implementation_debrief.md](implementation_debrief.md).

No PR yet. No CI yet.

## Issue

[#24379](https://github.com/galaxyproject/galaxy/issues/24379), filed 2026-10-22; tracked in `vault/repositories/galaxy/issues/wip/24379/`.

## Context

Surfaced while writing gxformat2#271 / galaxy-tool-util-ts#195 (untyped param lint), which already exempt declared-label renames.
