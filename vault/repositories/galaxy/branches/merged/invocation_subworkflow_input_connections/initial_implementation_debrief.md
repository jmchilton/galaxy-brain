# Standalone disconnected subworkflow input preflight

Branch: invocation_subworkflow_input_connections
Working directory: /Users/jxc755/projects/worktrees/galaxy/branch/invocation_subworkflow_input_connections
Base: origin/release_26.2 at0c70fdd5182c7425efecf7c8e76d6bd313de88b9
Uncommitted, pending parent review; no push.

A required subworkflow input with no connection/default is currently discovered during scheduling after the API has accepted and created an invocation/history. Build-workflow-run-config preflight now recursively checks every nested subworkflow before history creation/materialization. It returns400 USER_REQUEST_INVALID_PARAMETER with the nested step path and disconnected input name(s).

The shared disconnected_required_subworkflow_inputs predicate uses connected input step IDs, optionality and an identity sentinel for default presence. Explicit false, zero and empty defaults remain defaults. Existing runtime backstop reuses this exact predicate; error categories/details and partial-connection output diagnostics are unchanged. This avoids duplicating the predicate while keeping runtime protection for existing invocations.

Scope excludes parameter/data-type validation, collection shape checks, input resolution/materialization refactoring, completion actions, tool compatibility, object stores, landing requests and schedulers.

API coverage strengthens the existing missing-connection test to assert400/errorcode/step and input name/no invocation/no jobs, adds absent-new-history coverage, partialconnection coverage and recursive nested-path coverage. It retains the existing test instead of dropping its scenario. Every new-history request uses a unique name and checks no orphan history remains. Uploaded datasets in partial/nested controls are accounted for by comparing job snapshots before and after submission.

Positive controls add submission acceptance for required unconnected inputs with booleanFalse, integer0 and textempty defaults. Existing end-to-end defaulted required input, optional unconnected input and optional parent connection scenarios verify normal subworkflow execution.

Red:4negative API cases failed because server returned200/queued invocations. /private/tmp/invocation-subworkflow-input-red.log
Green API:10passed cases (4negatives,3falsydefaults,3existingpositivecontrols). /private/tmp/invocation-subworkflow-input-green.log
Workflow units193passed2skipped (runtime predicate reused). /private/tmp/invocation-subworkflow-input-unit.log
Hooks all passed final rerun after Black API formatting; git diff --check passed. /private/tmp/invocation-subworkflow-input-hooks.log

Existing Python3.13 env through ignored .venv symlink; no shared env changes. No mocked unit tests added.

Final diff4files169additions44removals (testfixtures and relocation of runtimepredicate account for most lines). Ready for parent review/commit. Total focused validation203passed2skipped.
