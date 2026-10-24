Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds one `sa_session.flush()` before the best-effort ToolRequest savepoint so unrelated pending scheduler state fails loudly to the scheduler instead of being swallowed as a ToolRequest capture failure; reverting is a one-line removal.

<details><summary>Risk Details</summary>

- Behavior shift: flush errors from pending scheduler state now propagate out of `_capture_workflow_tool_request_state` rather than being logged and returning `None`; previously such errors left a poisoned session anyway, so this mostly changes where the failure surfaces.
- One extra flush per tool step scheduled (cheap; `begin_nested()` already flushed the same state).
- No API, schema, workflow, or tool-format changes.

</details>
