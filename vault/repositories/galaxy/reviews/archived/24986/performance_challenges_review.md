# Performance challenge review: PR #24986

- Profile: gx_performance_challenger (`_shared/reviewers/gx_performance_challenger.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `be2b1655fc6b933f47ca7e41aa0ea308cccfd3b7`
- Basis: code reading only, nothing measured. A measurement plan is in [performance_challenges_debrief.md](performance_challenges_debrief.md).

## P3 1: The run form scans the history for an initial dataset, then discards it, for every defaulted data input

`InputDataModule.get_runtime_inputs` (`lib/galaxy/workflow/modules.py`) now forces `optional=False` on the `DataToolParameter` whenever a default is set. When `_workflow_to_dict_run` calls `input.to_dict(trans)`, `BaseDataToolParameter.get_initial_value` therefore skips its `if self.optional: return None` exit. It runs `_paginated_visible_datasets(..., limit=MAX_OPTIONS_PAGE_SIZE)`, which loads up to 500 HDAs plus a total count over the current history, newest first. If no row matches, it keeps paging through every matching row. `_workflow_to_dict_run` then overwrites the result with `input_dict["value"] = None`.

- **Inputs declared optional that also have a default:** this is new per-request work. Before the PR, the early return skipped the scan. The PR's API test covers this case (`tool_state["optional"] = "true"`).
- **Other defaulted inputs:** the scan existed before the PR, but its result is now always wasted.
- **No cache sharing:** the request cache key includes `limit`. This 500-row query never shares an entry with the 50-row options page for the same parameter, so it is always an extra round trip.
- **Scaling:** the cost grows with history size (the count and the 500-row ORM load), not with workflow size.

Suggested fix: decide "no initial selection" in the parameter, which already knows it has a default. `default_object` is parsed from `data_src["default"]`. `get_initial_value` can return `None` for a File default, which also removes the need for the manager's `value = None` override. If tool-form behavior for tool data parameters with defaults must stay as it is, use an explicit flag set in `get_runtime_inputs` instead. The manager could also read the default from the built parameter instead of calling `step.get_input_default_value` again.

I rated this P3 rather than P2 for two reasons. Each defaulted input costs at most one extra bounded query per run-form load, which is not unbounded growth. And it is speculative until measured against a large history.

## Checked and found fine

- **Editor path:** the new `step.inputs` comprehension in `_workflow_to_dict_editor` adds no queries. `step.input_connections`, called in the same loop for every step, already loads `step.inputs`.
- **Client:** no new requests, polling or larger payloads. The run response gains one `default_location` string per defaulted input.

## Note for other reviewers (not a performance finding)

`FormDefault.vue` emits `onUpdateStep` on every keystroke in the default-location field. Each emit pushes a separate non-lazy `UpdateStepAction` onto the undo stack. Label and annotation edits coalesce through `changeValueOrCreateAction` instead.
