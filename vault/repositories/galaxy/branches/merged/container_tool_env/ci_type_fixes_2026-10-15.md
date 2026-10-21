# PR #23815: related CI type failures — 2026-10-15

Fixed and pushed `86aea32fe7ec7f4170ccf13fd0b37bd92c87ed43` to the `jmchilton` fork; target remains `release_26.2`. [Reported job](https://github.com/galaxyproject/galaxy/actions/runs/38775438555/job/116561750711?pr=23815).

## Related errors and fix

Copy XML attributes through `dict(element.items())` so lxml’s overloaded attribute mapping does not confuse dict key-type inference. Declare the shared XML/YAML parser test variable as `ToolSource`; cast the deliberately partial command-factory test doubles to their existing runner/wrapper interfaces at the call boundary. No production interfaces, validation behavior or assertions are weakened.

The original Python 3.10 and 3.14 lint jobs both reported these branch-related errors; package jobs also reported the production XML error for #23815 and implicit-reexport error for #24167. The test errors were reproduced before editing. The first local environment lacked CI's lxml stubs, so final type validation used the complete pinned typing requirements in an isolated temporary directory, including mypy 2.4.0, pydantic 2.14.0 and lxml-stubs 0.5.1.

## Validation

- Full repository mypy (`cd lib && mypy . ../test`, with `mypy.ini`): no issues in **2523 source files**.
- Existing regression suites: **295 passed**. Tests: `test/unit/app/jobs/test_command_factory.py test/unit/app/jobs/test_environment.py test/unit/app/jobs/test_job_configuration.py test/unit/app/tools/test_runtime_environment.py test/unit/tool_util/test_runtime_environment.py test/unit/tool_util/test_tool_linters.py test/unit/tool_util/test_output_checker.py`.
- Repository commit hooks pass, including Black, Ruff, Flake8, Prettier and hygiene checks; `git diff --check` passes.
- No additional regression test was needed for this type-only correction; existing behavior/assertions are preserved.
- Container command tests execute generated commands through fake Docker/Singularity frontends; no real containers were started by these local checks.

## Unrelated CI error

Both original lint runs also fail isort on unchanged `test/unit/app/tools/test_expression_basics.py`: the `galaxy.util.wait` import needs ordering ahead of the `galaxy_ext` imports. The file is absent from both PR diffs against their base. This is an inherited formatting failure, not part of either feature; left untouched as requested. The job logs establish this diagnosis; it is not counted as a related regression.

## Publication and tracking

GitHub confirms `86aea32fe7ec7f4170ccf13fd0b37bd92c87ed43`, mergeable against `release_26.2`, open/non-draft. Fresh current-head CI is queued/in progress; local passes are not reported as a completed GitHub run. At this snapshot the known branch-related failures are fixed and locally verified. No rebase, PR comment or draft-state change was made.

Changed-SHA rule: track under `branches_ready_for_final_review`; previous approval does not carry to these changes. Preserve the existing final-read requirement. No automatic undraft is inferred for #24167.
