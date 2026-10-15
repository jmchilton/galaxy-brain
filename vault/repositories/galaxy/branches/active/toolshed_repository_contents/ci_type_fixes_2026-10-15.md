# PR #24167: related CI type failures — 2026-10-15

Fixed and pushed `8d3dbaa0f7ea67d69ac4d17f71f67dfb8945b28f` to the `jmchilton` fork; target remains `release_26.2`. [Reported job](https://github.com/galaxyproject/galaxy/actions/runs/38780545377/job/116579295316?pr=24167).

## Related errors and fix

Import `hg_util` from `tool_shed.util` directly in the repository-files guard test, then patch that module. It is the same module object used by the manager; assertions and production behavior are unchanged. This removes the forbidden implicit re-export access `repositories_manager.hg_util`.

The original Python 3.10 and 3.14 lint jobs both reported these branch-related errors; package jobs also reported the production XML error for #23815 and implicit-reexport error for #24167. The test errors were reproduced before editing. The first local environment lacked CI's lxml stubs, so final type validation used the complete pinned typing requirements in an isolated temporary directory, including mypy 2.4.0, pydantic 2.14.0 and lxml-stubs 0.5.1.

## Validation

- Full repository mypy (`cd lib && mypy . ../test`, with `mypy.ini`): no issues in **2526 source files**.
- Existing regression suites: **29 passed**. Tests: `test/unit/tool_shed/test_repositories_manager.py test/unit/tool_shed/test_repository_files.py`.
- Repository commit hooks pass, including Black, Ruff, Flake8, Prettier and hygiene checks; `git diff --check` passes.
- No additional regression test was needed for this type-only correction; existing behavior/assertions are preserved.
- The initial local test invocation lacked `hg` on PATH; reran with the Tool Shed virtualenv’s bin directory on PATH. All 29 Mercurial-backed tests passed.

## Unrelated CI error

Both original lint runs also fail isort on unchanged `test/unit/app/tools/test_expression_basics.py`: the `galaxy.util.wait` import needs ordering ahead of the `galaxy_ext` imports. The file is absent from both PR diffs against their base. This is an inherited formatting failure, not part of either feature; left untouched as requested. The job logs establish this diagnosis; it is not counted as a related regression.

## Publication and tracking

GitHub confirms `8d3dbaa0f7ea67d69ac4d17f71f67dfb8945b28f`, mergeable against `release_26.2`, draft. Fresh current-head CI is queued/in progress; local passes are not reported as a completed GitHub run. At this snapshot the known branch-related failures are fixed and locally verified. No rebase, PR comment or draft-state change was made.

Changed-SHA rule: track under `branches_ready_for_final_review`; previous approval does not carry to these changes. Preserve the existing final-read requirement. No automatic undraft is inferred for #24167.
