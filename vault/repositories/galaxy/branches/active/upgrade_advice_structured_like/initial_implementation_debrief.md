# upgrade_advice_structured_like — initial implementation debrief (redo on dev)

Fixes galaxyproject/galaxy#23884. Redone 2026-10-27 as one commit `3add2c03d01` on `dev` @ `a9a68082414`; force-pushed to `jmchilton`. Previous take (`051335c00d1`, debrief in `earlier_drafts/1/`) conflicted with dev's output-reference linter rework and was dropped rather than rebased.

## What changed
- `ProfileMigration26_0` (24.2 → 26.0) emits `26_0_fix_unqualified_structured_like` (`must_fix`) per collection output whose bare `structured_like` resolves only through the legacy alias of a nested input; message lists qualified name(s). Same condition as the pre-26.0 warning in `_check_structured_like_reference`.
- Dropped `18_01_consider_structured_like`; `latest_supported_version` 24.2 → 26.0.
- Moved dev's `_InputReference`/`_InputReferences`/`_param_name` from `linters/output.py` to `linters/_util.py` as `InputReference`/`InputReferences`, plus `legacy()` lookup now used by both linter checks and the advisor.

## Dropped from old take
- `iter_output_input_references` / `_collect_param_qualified_paths` — dev's `InputReferences` replaces them.
- XSD note — dev already documents that 26.0 requires qualified names.
- `lint.py` GenericAlias skip — no module-level alias added now, so not needed.

## Tests
- `test_1801_consider_structured_like` replaced by 26.0 tests (conditional, section, qualified, top-level, 24.2 target). `test/unit/tool_util/upgrade` + `test_tool_linters.py`: 162 passed. Pre-commit green. mypy on changed files: no new errors vs dev.

## Snapshot
```
created .../differential-review/snapshots/20261027T162039Z-implementation-3add2c03d018.json
  implementation @ 3add2c03d018 vs origin/dev (merge-base a9a68082414f)
  first snapshot: 1 commit, 5 files, 21 hunks
```
