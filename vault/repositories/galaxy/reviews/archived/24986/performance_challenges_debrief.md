# Performance challenge debrief: PR #24986 (default file locations for workflow inputs)

Reviewed commit: `be2b1655fc6b933f47ca7e41aa0ea308cccfd3b7`. These findings come from reading the code. No Galaxy server was started and nothing was measured. The measurement plan below says how to confirm them.

## Scope checked

- `WorkflowContentsManager._workflow_to_dict_editor`: the new `step_defaults` comprehension iterates `step.inputs`.
- `WorkflowContentsManager._workflow_to_dict_run`: the new `data_input` branch calls `step.get_input_default_value(None)` and overrides `optional`/`value`.
- `InputDataModule.get_runtime_inputs`: now forces `optional=False` when a default is set.
- Client changes: `FormData.vue` status block, `FormDefault.vue` location field, `WorkflowRunForm.vue`, `WorkflowRunFormSimple.vue`, `workflowStepStore.ts`.

## Editor path: no new queries

`step.inputs` is a plain lazy `relationship`, but the same loop already loads it for every step through `step.input_connections` (`[_ for step_input in self.inputs for _ in step_input.connections]`, `model/__init__.py:9956`). So the new comprehension reads a collection that is already in the identity map. It adds no round trip, and its cost is linear in the number of step inputs. Nothing to fix.

## Run path: a discarded history scan for every defaulted data input

Call chain for a `data_input` step with a File default when the run form loads (`/api/workflows/{id}/download?style=run&history_id=...`):

1. `InputDataModule.get_runtime_inputs` now sets `data_src["optional"] = False` whenever a default exists. This happens even if the workflow author marked the input optional, and the PR's own API test covers that case (`tool_state["optional"] = "true"`).
2. `input.to_dict(trans)` calls `ToolParameter.to_dict`, then `BaseDataToolParameter.get_initial_value`. Because `self.optional` is now False, it no longer returns `None` early. It runs `_paginated_visible_datasets(..., limit=MAX_OPTIONS_PAGE_SIZE)` (500 rows plus a total count) over the current history, newest first, until it finds a match. If nothing matches, it pages through every matching row.
3. `_workflow_to_dict_run` then sets `input_dict["value"] = None`, which throws the scan's result away.

Effects:
- **Inputs declared optional that also have a default:** before the PR, `get_initial_value` returned `None` at once. Now each form load pays for a 500-row HDA load, a count, and a Python `hda_match` pass. This is a regression.
- **Inputs not declared optional:** the scan already ran before the PR, but its result was used. Now the work is computed and discarded.
- The request cache (`get_or_set_cache_value`) is keyed by `limit`. This scan uses 500 while the options builder uses the 50-row default, so the two never share a cache entry. The scan is always a separate query from the options listing for the same parameter.
- This follows the "do not issue the request at all" lesson (#18969) and the "loads then slices" lesson (#22831 / #22361): the SQL returns up to 500 ORM rows even though only the first match is used. The 500-row chunking is pre-existing, but this PR is what makes the result useless.

The cost grows with history size, not workflow size. On a history with hundreds of thousands of datasets, the `count(*)` with extension and state filters is the expensive part.

Recommendation: do not compute an initial value when the parameter carries a default. Two options:
- (a) In `BaseDataToolParameter.get_initial_value`, return `None` when `self.default_object` is a File default. The parameter already knows it has one, because `default_object = input_source.parse_default()` is set from `data_src["default"]`. The manager's `input_dict["value"] = None` override is then unnecessary, and the "start with no selection" rule lives in one place.
- (b) If tool-form behavior for tool data parameters with defaults must not change, add an explicit flag on the parameter built in `get_runtime_inputs`.

Either way, the manager can read the default from `input.default_object` (or `inputs["input"]`) instead of calling `step.get_input_default_value` a second time. The second call is cheap because the collection is already loaded, but it duplicates the lookup `get_runtime_inputs` just did.

## Client

- No new requests or polling. `FormData.vue` only renders a status block from the existing `default_location` attribute. `WorkflowRunForm.vue` only deletes a key on `null`.
- `FormDefault.vue` emits `onUpdateStep` on every keystroke in the location field. `stepActions.updateStep` builds a new non-lazy `UpdateStepAction` per emit and pushes it onto the undo stack. Label and annotation use `changeValueOrCreateAction`, which coalesces lazily. This causes no network traffic, so it is not a performance finding. It is an undo-granularity and consistency note for the other reviewers.

## Measurement plan

1. Start Galaxy against Postgres on a free port. Create a history with about 100k `txt` datasets (bulk insert or `populate_history` scripts) and a few `bed` datasets.
2. Upload `WORKFLOW_WITH_DEFAULT_FILE_DATASET_INPUT`, then a variant with `optional: true` plus a default.
3. Turn on SQL logging (`database_engine_option_echo` or `sqlalchemy_query_counter`/`slow_query_log_threshold`). Call `GET /api/workflows/{id}/download?style=run&history_id=...` and record the query count and timing on `dev`, on the PR head, and on the PR head with fix (a).
4. Expected result: the PR head adds one `LIMIT 500` HDA select plus a count per distinct extension set for the optional-plus-default variant. Fix (a) removes it. Repeat with a history that has no matching extension to see the full-scan worst case.
5. Run `EXPLAIN ANALYZE` on the count query on the large history.
