# Use TRS IDs as fallback names for GalaxyAI workflow suggestions

Follow-up to #23294.

## Summary

GalaxyAI workflow recommendations do not always include a display name. The rendered
recommendation already falls back to the workflow's `trsID`, but the corresponding import
action used the generic `IWC workflow` label (or `None` when `name` was present but null).

This change applies the same fallback order to the import action:

1. workflow name;
2. `trsID` / `trs_id`;
3. `IWC workflow` as a last resort.

That keeps the action description and its `name` parameter useful for legacy TRS-only
results without changing the import identifier or API contract.

## Tests

- Added deterministic unit coverage for a recommendation containing only a `trsID`.
- `test/unit/app/test_agents.py::TestAgentUnitMocked::test_tool_rec_uses_trs_id_as_workflow_name_fallback` — passed.
