# selenium_history_datatype_citations_alt_original_scope

Branch `selenium_history_datatype_citations_alt_original_scope` on `jmchilton`, head `86975a0d75d`. It is the branch as hardened before the re-scope.

It has the same coverage as the parent minus bulk Change Database/Build:
- Change data type has its own `change_datatype_modal` component and a `history_panel_change_datatype_of_selected` helper.
- The parent replaces both with a shared `operation_modal` component and `history_panel_change_selected(operation, value)`. It also adds the dbkey hook and test.
