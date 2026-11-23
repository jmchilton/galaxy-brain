Profile gx_risk_assessment · Claude Opus 5.5 · effort low · reviewed commit 93b224b00ea8b3330902da96c256b200df3b0bdf

Mostly a two-way door; the one-way parts are the TRS URL format now persisted for slash-containing version ids, and the user-facing contract that undoing a server-side refactor is client-only (server keeps the refactored version until the next save).

<details><summary>Risk Details</summary>

- `get_trs_url` now percent-encodes version ids (`feature/x` -> `feature%2Fx`); these URLs end up stored in imported workflows' source metadata, so the encoded form becomes the persisted canonical form.
- `parse_trs_url` now unquotes `version_id`; any already-stored URL whose version id contained a literal `%xx` sequence is now decoded and will be re-quoted differently on fetch.
- Undo/redo of "Upgrade" and other refactors is client-only: the server has already written a new version, and undo leaves the editor on that version as an unsaved change. Users may assume undo reverts the saved workflow.
- `resetStores` no longer always clears undo history on refactor; refactor snapshots hold full workflow clones in the undo stack (memory on large workflows, and replay correctness of later actions on top of `restoreWorkflowState`).
- Sub-workflow upgrade now rewrites `input_subworkflow_step_id` by input name and drops reported workflow outputs from the step; workflows saved after upgrade differ from before (behavior established for workflow artifacts, but it fixes silently wrong data binding).
- Upgrading to a sub-workflow with missing tools now succeeds with only inputs/outputs instead of erroring; tool-state upgrade messages are not reported in that path.

</details>

<details><summary>Risk Review Advice</summary>

Humans should confirm the TRS version id encoding matches what Dockstore and other TRS servers expect for branch names, and that previously imported workflows with stored `trs_url` values still resolve after the `parse_trs_url` change.

For the editor, check that the client-only undo semantics are acceptable (and discoverable) for refactors, since the saved server version is not reverted, and that the `ToolMissingException` fallback in `_upgrade_subworkflow` doesn't hide problems users should see.

</details>
