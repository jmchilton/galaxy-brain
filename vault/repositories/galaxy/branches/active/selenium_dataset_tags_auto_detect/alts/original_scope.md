# original_scope

Branch `selenium_dataset_tags_auto_detect_alt_original_scope` (`142b0facd30`), pushed to `jmchilton`.

This is the first hardening round's result. It has the same four commits as the parent, but its `edit_dataset_attributes.auto_detect_metadata_button` is the sibling selector `#dataset-attributes-default-save + button`, with no client change. The parent instead gives the Attributes tab's Auto-detect `GButton` in `DatasetAttributes.vue` the id `dataset-attributes-autodetect-metadata` (matching the Datatypes tab's `#dataset-attributes-autodetect-datatype`) and points the selector at it, per [the scope evaluation](../earlier_drafts/1/scope_evaluation.md).

Pick this one if the 26.2 PR should touch no client code, so the selector matches already-deployed 26.2 servers (such as the ones gxui drives).
