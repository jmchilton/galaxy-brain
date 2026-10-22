# Alt: original_scope

Branch [`workflow_editor_selector_escaping_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/workflow_editor_selector_escaping_alt_original_scope) at `248fba718cc`, stacked on `workflow_editor_connection_helpers` `9699ec45644`.

This is the branch as first hardened. Terminal names, node labels and connector ids are escaped with `css_attribute_value`, the connector targets use `[id='…']`, and `test_connections_with_labels_needing_css_escapes` covers it.

The parent adds one thing on top: [scope_evaluation](../earlier_drafts/1/scope_evaluation.md) recommended routing the run form's `[step-label='…']` lookups in `workflow_run_specify_inputs` through the same escape, with a run-form E2E test.
