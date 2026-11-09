Run via Opus 5.5 at high effort.

Verdict: approve as-is. No structural regressions; no code changes made (no commits). Diff is small, reuses `Container.resolve_dependencies` via one shared predicate used by both `command_factory` and the Pulsar runner, and replaces the old `__dependency_resolution` helper rather than adding a parallel one. Unit tests: 77 passed (`test_pulsar_runner.py`, `test_command_factory.py`).

Not acted on:
- `__prepare_job` return tuple grows 5 -> 6. Pre-existing pattern; a named result type would be a refactor larger than this fix. Follow-up candidate.
- `effective_dependency_resolution` guard `container and ...` is redundant given `requires_dependency_resolution(None) is True`, but dropping it needs an `assert container` for mypy on `container.container_id`. Tried, reverted: not a net win.
- `raise Exception` for bad `dependency_resolution` is pre-existing (moved, not added).
- `pulsar.py` already 1576 lines before this branch; +~30 lines. Not this PR's job to split.

<details>
<summary>Full review</summary>

1. Structural: `requires_dependency_resolution` in `container_classes.py` is the right layer (owner of `resolve_dependencies`) and removes the duplicated `not container or container.resolve_dependencies` idiom between Galaxy-side and Pulsar-side resolution. Good code-judo: one predicate, two consumers.
2. Container lookup moved earlier in `__prepare_job` so resolution mode is computed once from the actual container; `dependencies_description` now derives from the same effective mode instead of re-reading destination params in `queue_job`. Removes a second source of truth.
3. `effective_dependency_resolution` is a pure module function, easily unit-tested (parametrized table covers all mode x container combos plus invalid value). Logs the downgrade; no silent fallback.
4. Tuple widening of `__prepare_job` (see above) is the only smell; acceptable for scope.
5. Tests: `MockContainer` dataclass replaces `SimpleNamespace` helper - clearer shape. Integration test uses a sourcing marker plus host control case, so assertion cannot pass without the behavior.
</details>
