# Standalone completion action name validation

Branch: invocation_completion_action_validation
Working directory: /Users/jxc755/projects/worktrees/galaxy/branch/invocation_completion_action_validation
Base: origin/release_26.2 at 0c70fdd5182c7425efecf7c8e76d6bd313de88b9
Implementation uncommitted, pending parent review; no push.

Unknown on_complete action names currently pass submission and leave an invocation/history despite never executing the intended hook. Validate every submitted action name against the application's shared WorkflowCompletionHookRegistry before build_workflow_run_configs creates histories. The existing registry instance is registered as an application singleton and injected into WorkflowsService, so registered/custom hooks remain authoritative. Unknown names return RequestParameterInvalidException400 naming the unknown and available actions. No hardcoded action names are used in implementation.

Scope excludes target URI/config validation, hook execution changes, registry discovery changes, landing requests, object stores, tools, scalar parameters and the broader validation/materialization refactor. Existing four polished branches and source main untouched.

Regression test: TestWorkflowsApi.test_run_with_unknown_on_complete_action_creates_no_history sends a uniquely named new history and an unregistered action. It checks400, explanatory error, no workflow invocation and no newly created target history.

Red: returned200 and created an invocation carrying unknownaction. /private/tmp/invocation-completion-action-red.log
Green:1passed (400, nohistory/noinvocation) /private/tmp/invocation-completion-action-green.log
Positive controls: existing TestWorkflowCompletionEndpoint.test_completion_export_config_accepted and test_completion_response_structure verify built-in registered export action accepted and ordinary no-hook workflow reaches completion. Both passed2tests /private/tmp/invocation-completion-action-positive.log

Full repository formatting/lint hooks passed. /private/tmp/invocation-completion-action-hooks.log. git diff --check passes. Existing shared Python3.13 virtualenv used through ignored .venv symlink; no environment packages changed.

Diff: three files29additions1removal. No commit yet.

Ready for review/commit:3focused cases green, all hooks green.
