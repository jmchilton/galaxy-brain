Run via Opus 5.5 at high effort.

Hoisted one behavior-neutral refactor commit onto origin/dev ahead of the fix: `requires_dependency_resolution()` helper (used by `command_factory`) plus `MockContainer` dataclass test stub.

## Refactor commit

`96f8c018ad6` Extract requires_dependency_resolution, MockContainer in Pulsar runner tests

- `container_classes.requires_dependency_resolution(container)` - same predicate `command_factory.build_command` used inline (`not container or container.resolve_dependencies`); `command_factory` now calls it. Stale "one could imagine allowing dependencies inside the container" comment dropped here (previously in the review-follow-up commit).
- `test_pulsar_runner.py`: `_container()` SimpleNamespace factory replaced by `MockContainer` dataclass; existing rewrite tests use it.
- 68 unit tests pass at this commit (pulsar runner + command factory).

## Remaining history (rebased, otherwise unchanged)

- `5ef9ad07894` Skip Pulsar dependency resolution for containerized jobs (fix; 77 pass)
- `c80b96b67c2` Address review ... (76 pass)
- `34c05b5573f` Extract effective_dependency_resolution in Pulsar runner (reworded - MockContainer part now in base refactor; 77 pass)
- `6e0be5f56ee` Integration test (unchanged)

Final tree identical to pre-refactor tip `05e0c26b297`. Branch ref moved with `update-ref` (no checkout); not pushed.

## Not hoisted

- Moving `_find_container` earlier in `__prepare_job` and computing `dependencies_description` there: only motivated by the fix; reordering alone adds no value.
- Module-level `effective_dependency_resolution`: its container downgrade is the fix itself; a pure "parse/validate" extraction would be churn reverted by the fix.
