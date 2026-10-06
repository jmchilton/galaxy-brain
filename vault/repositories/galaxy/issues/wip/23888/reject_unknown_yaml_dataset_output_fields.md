# Admin YAML dataset-output models silently discard unknown fields

Agent-to-agent issue draft, prepared by Codex on 2026-10-02 at the user's request. Queue only; not posted to GitHub.

## Problem and reproduction
At PR #23877 head b4740908f881f524610313d925d644727a092be2:
    raw = {"name": "out", "type": "data", "format": "txt",
           "from_work_dir": "out.txt", "format_souce": "input"}
IncomingToolOutputDataset.model_validate(raw) succeeds; model_dump() does not retain format_souce.
IncomingUserToolOutputDataset rejects the same typo with ValidationError.

The generic/admin dataset-output authoring model has Pydantic's extra="ignore" behavior, while user-tool dataset outputs and incoming collection outputs already forbid extra fields. Do not repeat the overly broad claim that all GalaxyTool outputs drop unknown keys: at this commit, collection outputs are already strict.

## User-visible consequence
An admin creating a database-backed GalaxyTool can believe format_source, metadata_source or another option was set when a typo was accepted and discarded before storage. Disk YAML bypasses these models, producing a different contract.
Unsupported fields such as default_identifier_source can disappear through the same mechanism; intended support for such a field is a separate feature decision.

## Intended change
Reject unknown fields at the incoming authoring boundary for admin dataset outputs, with a field-local validation error. Keep legitimate parser-supported fields explicitly modeled or explicitly unsupported; do not rely on silent loss.
Converge disk tools toward the same validated representation as part of the broader YAML effort.

## Compatibility and storage
Inventory incoming vs internal/output serialization models before applying extra="forbid" globally. Stored rows, old raw tool source, and model-store imports may have different requirements from new authoring requests.
Give a concrete assessment of stored-definition reload impact. Prefer separating strict new authoring from a narrowly scoped historical reader if compatibility is actually needed.

## Acceptance
- Admin dynamic-tool API rejects a misspelled dataset-output key before storing a row.
- User and admin definitions agree on rejection of unknown dataset-output keys.
- Valid format_source / metadata_source survive model_dump, persistence, reload, and execution.
- Collection outputs remain strict.
- Disk validation eventually produces the same rejection and preserves the same supported fields.
Tests should assert meaningful API/model error location and persistence behavior, not just a model_config literal.

## Related
https://github.com/galaxyproject/galaxy/pull/23877
https://github.com/galaxyproject/galaxy/issues/23380 (collection-output field parity and related historical extra-field discussion; check present state before duplicating)
lib/galaxy/tool_util_models/tool_outputs.py: IncomingToolOutputDataset, IncomingUserToolOutputDataset, IncomingToolOutputCollection.
lib/galaxy/managers/tools.py: incoming model dump and stored representation.
