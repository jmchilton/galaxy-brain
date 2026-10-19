# Initial implementation: missing invocation inputs return 404

Extracted the missing-object fix from `issue_20900_invocation_validation` onto independent branch `invocation_missing_input_404`, based on `origin/dev` at `c63ffc2ccae4875976677b468dce3ac3e1ba74d8`.

Working directory: `/Users/jxc755/projects/worktrees/galaxy/branch/invocation_missing_input_404`.

The existing input resolver now raises `ObjectNotFound` for absent HDA, LDDA, LD, and HDCA references. The message identifies the workflow input, source type, and requested encoded ID. Existing access checks and copy behavior remain in the original resolver. The HDCA precheck holds the retrieved object and passes the original encoded ID to the existing collection manager, preserving that manager's access checks and call contract. No resolve/materialize split or other submission validation was extracted.

The API regression submits one nonexistent encoded ID for each of the four source types and checks both HTTP 404 and the input-specific message. It uses the existing request helper directly.

## Validation

Red: all four cases failed before the patch, returning HDA 500, LDDA 403, LD 403, and HDCA 400 instead of 404 (4 failed in 30.84s). Log: `/tmp/invocation-missing-input-red.log`.

Green: all four new cases plus existing `test_run_with_optional_collection_specified` passed (5 passed in 29.04s); log `/tmp/invocation-missing-input-green.log`.

```sh
source .venv/bin/activate
GALAXY_TEST_DEFAULT_WAIT=240 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
PYTHONPATH=lib python -u -m pytest \
  lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_with_nonexistent_input \
  lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_with_optional_collection_specified \
  -v --tb=short
```

The red command omitted the existing acceptance test. The ignored `.venv` symlink reuses the existing main Galaxy environment; no dependency installations or client build. `git diff --check` passed. Black left the production file unchanged; Python 3.13 emits the repository's future-Python syntax warning.

The source branch remains intact. No commits, pushes, or shared queue edits by the implementation subagent. The coordinator owns final review and handoff.
