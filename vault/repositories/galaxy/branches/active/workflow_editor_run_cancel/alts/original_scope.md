# original_scope

Branch `workflow_editor_run_cancel_alt_original_scope` (head `e858d2a07d8`, base `65132d40dac`): the branch as hardened before the scope expansion. Helper fixes 4b/7h/7j plus `test_run_from_editor_and_cancel`.

Differs from parent: parent also fixes `workflow_run_setup_inputs` so existing `workflow_run_specify_inputs` callers actually select their `type: File` inputs, and stops `workflow_run_specify_inputs` mutating its argument.
