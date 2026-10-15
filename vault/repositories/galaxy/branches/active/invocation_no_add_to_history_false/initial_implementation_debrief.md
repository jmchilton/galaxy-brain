# Initial implementation: honor explicit no_add_to_history false

Extracted from `issue_20900_invocation_validation` onto independent branch `invocation_no_add_to_history_false`, based on `origin/dev` at `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_no_add_to_history_false`.

The fix makes input copying depend on the boolean value of `no_add_to_history`. An omitted flag or explicit `false` copies the input into the target history; `true` leaves it in its source history. The regression invokes a workflow with an HDA from a separate source history and checks destination history contents for all three requests. It uses existing API helpers and adds no broader invocation-validation changes.

## Validation

- API regression node: `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_no_add_to_history` (three parameter cases). Red reproduced the intended bug: omitted flag passed, explicit `false` failed with zero destination datasets instead of one (1 failed, 1 passed in 91.42s; stopped before the third case with `-x`). Applied the one-line fix after this result. Full three-case green run passed: 3 passed in 43.23s.
- `git diff --check`: passed.
- `/Users/jxc755/projects/repositories/galaxy/.venv/bin/black --check lib/galaxy_test/api/test_workflows.py`: passed, one file unchanged. Black warns that Python 3.13 cannot safety-parse future Python 3.15 syntax; this file needs no formatting changes.
- Existing main Galaxy virtualenv reused and exposed through ignored `.venv` symlink; no dependency installation or client build. Activate it before API tests so job subprocesses resolve Python correctly. The first unactivated attempt timed out during upload rather than exercising the flag; definitive runs use `GALAXY_TEST_DEFAULT_WAIT=240`.

Preliminary test starts were interrupted while diagnosing unusually slow Python/pytest startup; these yielded no assertion result and are not counted as passing or failing regressions. The definitive red run uses the activated environment and reproduces the intended assertion failure; the coordinator owns green-run monitoring and final review/handoff.

## Scope

One production line and one API regression covering omitted/false/true. No UI changes. The source branch remains intact. No commits or pushes made by the implementation subagent.

## Definitive API command

```sh
source .venv/bin/activate
GALAXY_TEST_DEFAULT_WAIT=240 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
PYTHONPATH=lib python -u -m pytest \
  lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_no_add_to_history \
  -v --tb=short
```

The red run used the same command with `-x`. Definitive red log: `/tmp/invocation-no-add-definitive-red.log`.
