No refactoring of the base branch was performed.

Re-evaluated against current history (base `51e0a80a0db`): `22568e89198` Baseline tests, `791a5e46b83` UDT fix, `d5ddac3f416` converted-input identifier.

Candidates evaluated:

- `ElementIdentifierMapper.identifiers_by_dataset_id` (`lib/galaxy/tools/wrappers.py`): still only called by the new `UserToolEvaluator` line. Existing mapper users look up one dataset at a time via `identifier()` and would not get simpler with it. Splitting it out ahead of the fix would add a method nothing calls (pass 1 reached the same conclusion).
- `element_identifiers` kwarg on `setup_for_runtimeify` / `to_cwl`: putting it in first would mean passing a value that is always `None` before anything reads it. That is plumbing with no consumer.
- `to_cwl` setting `properties["element_identifier"]` for DCE inputs: this changes behavior (base never emitted it), so it belongs to the fix.
- `tool_request_raw` `tool_uuid` / optional `tool_id` (`lib/galaxy_test/base/populators.py`): this test-helper change preserves behavior, but its only caller is the fix commit's new red test (`test_tool_request_mapped_over_writes_element_identifier`). It can't move into Baseline tests because that test fails on base. A separate commit would hold a helper nothing uses.
- New commit `d5ddac3f416` (`lib/galaxy/tools/actions/__init__.py`, +3 lines): this is purely the fix (it carries the transient `element_identifier` across the implicit conversion). There is nothing to extract.
- `_run_mapped_over_list`'s `ext` param lands in `791a5e46b83` but is used only by `d5ddac3f416`. That is not a base refactor. The thermo review already declined to move it, and since no other restructuring is happening, the history stays as is.

History unchanged. HEAD `d5ddac3f416`.
