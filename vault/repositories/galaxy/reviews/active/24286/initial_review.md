# Initial review: galaxyproject/galaxy#24286

- Profile: `default`
- Model: claude-opus-5-5, medium effort
- Reviewed commit: `e879751951cabc2a78ccc411683425ea5faa67ef` (base `release_25.1`)
- PR: "[25.1] Don't overwrite inputs when skipping database operations on nested collections" (mvdbeek), 3 files, +73/-6

## Summary

The fix is correct and well scoped. Two independent problems are addressed:

1. `ModelOperationToolAction._produce_outputs` (skip path) called `set_skipped(replace_dataset=True)` on every HDA in the output collections. Nested-collection tools (e.g. `__FILTER_FAILED_DATASETS__` on `list:paired`) build the inner collections with `DatasetCollection.copy()` without an element destination, so the leaf HDAs are the input's own HDAs. Skipping then rewrote the user's input HDAs (new null dataset, `expression.json`, hidden). The PR now collects the ids of all input HDAs (direct and via input collections/DCEs) and copies any output leaf HDA that is also an input before skipping it, swapping the copy into the output DCE.
2. `DatasetInstance.set_skipped` ran `object_store_populator.set_object_store_id(self)` before replacing the dataset. `set_dataset_object_store_id` assigns `dataset.object_store_id` and calls `object_store.create(dataset)`, so with a distributed/hierarchical store the shared (input) `Dataset` could get its `object_store_id` reassigned to an empty file. Moving the replacement first means only the fresh `Dataset` is touched. For `replace_dataset=False` (the regular tool skip path in `tools/actions/__init__.py`) behavior is unchanged. Dropping the explicit `object_store.create(...)` is fine because `set_dataset_object_store_id` already creates the file.

Checks done:

- Every `DatabaseOperationTool.produce_outputs` in `lib/galaxy/tools/__init__.py` builds a new output collection via `create_collection(...)`, so the output DCEs being mutated (`dce.element_object = copy`) are never the input collection's DCEs. Reassigning the output DCE is safe.
- `inp_dataset_collections` values can be HDCAs or DCEs (sub-collection mapping); both expose `dataset_instances`, so the id collection works in both cases. The `None` guard for unset optional collection inputs is reasonable forward-compat for 26.0.
- `hdca.collection.dataset_elements` falls back to the in-memory recursive walk for the unflushed output collection, so it reaches nested leaves.
- Fixing at the skip site (rather than making each nested tool copy leaf HDAs) is the right call for a release branch: it is generic across all database operation tools and doesn't change non-skip outputs.
- New API test reproduces the reported `list:paired` case and asserts input extension/content is intact, outputs are distinct HDAs, and outputs contain `null`. The object-store reordering is not covered (single disk store in tests); the PR description says so, and a distributed-store test would be disproportionate for this fix.

No P1 or P2 findings.

## Findings

### P3 1: Test doesn't assert input HDAs stay visible

The reported regression also hid the user's input datasets (`set_skipped` sets `visible = False`). The new test checks `file_ext` and content but not visibility. Adding `assert input_hda["visible"]` alongside the `file_ext` assertion in `test_conditional_skip_on_database_operation_nested_collection_output` would pin the full user-visible symptom at no cost.

### P3 2: Sibling test uses `_run_workflow` with inline `test_data`; new test hand-builds inputs

`test_conditional_skip_on_database_operation_collection_output` directly above runs the same workflow shape via `self._run_workflow(..., test_data=...)`. The new test uses `create_list_of_pairs_in_history` + `upload_yaml_workflow` + `invoke_workflow_and_wait`. Using `_run_workflow` with a `list:paired` `test_data` block would make the two tests read as a pair and shorten the new one. Purely stylistic; fine to leave on a release branch.

## Notes (non-actionable)

- `input_dataset_ids` membership uses `data.id`; output copies created by the tools are unflushed (`id is None`) and inputs are always persisted, so there is no false match. Identity-based membership would be marginally more robust but isn't worth changing.
- Skipped outputs now land in the populator's store rather than inheriting the input dataset's `object_store_id` (old `replacement.object_store_id = self.dataset.object_store_id`). That is consistent with how all other skipped outputs are placed and is arguably more correct.
- PR milestone is 27.0 while targeting `release_25.1`; likely just a label to tidy at merge.
