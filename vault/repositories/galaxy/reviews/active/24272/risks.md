Mostly a two-way door: no API or format change, but the fix lives in the shared `visit_input_values` walker, so every caller (not just workflow import of `__job_resource`) now gets a default selector written into state for any conditional whose selector is missing, and imported workflows persist that default.

<details><summary>Risk Details</summary>

- The new branch applies to all conditionals in all callers of `visit_input_values` (tool execution, workflow run/refactor, state upgrades), not only the injected `__job_resource` group. Previously a missing selector produced `__current_case__ = -1` and skipped the case; now the default case is selected and its nested inputs are visited.
- `get_initial_value(None, context)` runs with `trans=None`; for tool-defined conditionals with dynamic or data-dependent selectors this may raise or pick a different default than the tool form would.
- Saved workflow `tool_state` now contains a defaulted conditional where before it would have errored; that persisted state is a minor, but durable, change to workflow artifacts.
- Release-branch (26.1) fix; rollback is a simple revert since no schema or API changes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether defaulting missing conditional selectors is acceptable as general walker behavior or should be scoped to the import/fill-state path (e.g. done by the callback that leaves the selector absent). Check that callers relying on a missing selector meaning "no case" (case inference, `allow_case_inference`, error reporting via `case_error`) still behave correctly, and that `trans=None` is safe for dynamic selectors.

</details>
