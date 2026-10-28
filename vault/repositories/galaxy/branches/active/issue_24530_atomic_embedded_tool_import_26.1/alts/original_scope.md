# Alt: original_scope

Branch `issue_24530_atomic_embedded_tool_import_26.1_alt_original_scope` (at `d2da4cc9d8d`, on `jmchilton`). It covers the workflow import and update paths only (create, update, nested subworkflows, dry run). Unlike the parent, it doesn't wrap `WorkflowsManager.copy_workflow_for_user` in `rollback_tools_on_error`, so a failure while copying a shared workflow can still orphan the user tool copies made earlier in the loop.
