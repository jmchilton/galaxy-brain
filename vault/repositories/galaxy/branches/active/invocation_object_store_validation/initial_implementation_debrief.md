# Standalone workflow object-store validation

Branch: invocation_object_store_validation
Working directory: /Users/jxc755/projects/worktrees/galaxy/branch/invocation_object_store_validation
Base: origin/release_26.2 at 0c70fdd5182c7425efecf7c8e76d6bd313de88b9
Implementation uncommitted, pending parent review; no push.

The existing run-config builder accepts arbitrary IDs in preferred_object_store_id, preferred_outputs_object_store_id and preferred_intermediate_object_store_id, creates a target history, and queues an invocation. This fix calls the existing validate_preferred_object_store_id helper before history creation and returns RequestParameterInvalidException (400) on its validation error. It moves the existing single-versus-split-store exclusivity check alongside those early checks without changing its option semantics, and corrects its grammar. Empty or omitted preferences retain existing behavior. Valid selectable storage and output/intermediate split configurations retain their normal handling.

No validation/materialization refactor, scheduler, landing-request, tool compatibility, completion-action, scalar parameter or no_add_to_history changes are included. Other branches and source main remain untouched.

Test added: API TestWorkflowsApi.test_run_with_unselectable_object_store_creates_no_history, parametrized over all three fields. Each requests a uniquely named new history and verifies invalid selection returns400 without leaving that history.

Red: all three cases failed because the API returned200 and queued invocations. /private/tmp/invocation-object-store-red.log
Green: all three cases passed. /private/tmp/invocation-object-store-green.log

Positive integration validation runs the existing test_workflow_objectstore_selection (default, single selected backend, split outputs/intermediates with actual job storage assertions) and test_workflow_mapped_collection_objectstore_selection_split. Both passed (2 passed,24 warnings in69.89s). /private/tmp/invocation-object-store-positive-integration.log.

All full repository pre-commit checks applicable to the two files pass; /private/tmp/invocation-object-store-hooks.log. git diff --check passes.

Environment: existing shared Python3.13 virtualenv symlinked as ignored .venv. Release26.2's integration conftest requires pytest-xdist, missing from both available envs, so pytest-xdist/execnet and their dependencies installed into isolated /private/tmp/invocation-extraction-test-deps and added only to integration PYTHONPATH. Shared envs unchanged. Tests auto-start their servers, with conda auto-init disabled and beta workflow/tool formats enabled.

Diff: two files,36 additions/10 removals. No commit yet.

Ready for parent review/commit: all5 focused cases green (3 newAPI,2 existing positive integration).
