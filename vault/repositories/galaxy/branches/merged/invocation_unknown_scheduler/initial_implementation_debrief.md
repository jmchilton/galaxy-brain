# Initial implementation: reject unknown workflow schedulers

Extracted the scheduler guard from `issue_20900_invocation_validation` onto independent branch `invocation_unknown_scheduler`, based on `origin/dev` at `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_unknown_scheduler`.

The workflow service checks an explicitly supplied nonempty scheduler ID against the existing injected scheduling manager's registry before building invocation run configurations. Unknown IDs return HTTP 400 with the requested ID in the error message. Omitted IDs retain normal default selection, and registered IDs remain accepted. No other service validation, injection changes, or completion-hook behavior was extracted.

The API test checks omitted, registered `default`, and `not_a_scheduler` requests. It is placed near the batch invocation tests, away from the other extracted API insertions, with the original batch test's decorators preserved.

## Validation

Red: omitted and `default` cases passed; unknown scheduler failed because the API accepted it with HTTP 200 instead of expected 400. Log: `/tmp/invocation-unknown-scheduler-red.log`.

Green: all three cases passed in 26.57s; log `/tmp/invocation-unknown-scheduler-green.log`.

```sh
source .venv/bin/activate
GALAXY_TEST_DEFAULT_WAIT=240 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
PYTHONPATH=lib python -u -m pytest \
  lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_with_scheduler \
  -v --tb=short
```

Existing main Galaxy virtualenv reused through ignored `.venv` symlink, with no dependency installation or client build. `git diff --check` and Black check of both changed files accompany the green run.

The source branch remains intact. No commits, pushes, or shared queue edits by the implementation subagent. The coordinator owns final review and handoff.
