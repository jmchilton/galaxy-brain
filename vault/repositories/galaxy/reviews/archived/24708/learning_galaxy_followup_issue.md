# Research updates from galaxyproject/galaxy#24708

Reviewed commit `86a724b7bf5e`, against merge-base `e922a682376`.

## Stale documentation at the baseline

These conflicts exist without this PR.

### `vault/research/Component - Workflow API.md`

In `GET /api/invocations`:

- **`view`:** the note lists `summary, detailed`. `InvocationSerializationParams.view` is an `InvocationSerializationView`, whose values are `element` and `collection`. `Component - Workflow Invocation Models` already has this right.
- **Auth:** the note says "Required". `index_invocations` returns `[]` with `total_matches: 0` for anonymous users.
- **`include_terminal`:** the note says "Include finished invocations". `false` keeps only `non_terminal_states`, which are the scheduler states `new` and `ready`. It says nothing about whether an invocation's jobs have finished.

In `GET /api/workflows/{workflow_id}/invocations`:

- **Auth:** the note says "Required (workflow accessibility)". The route delegates to `index_invocations`, and without `instance=true` the stored workflow gets only an existence check in `build_invocations_query`. Non-admins are scoped by the forced `user_id`, and each returned invocation gets `check_security`.
- **Query params:** the note says "Same as `GET /api/invocations`". The nested route does not take `include_nested_invocations`.

### `vault/research/Component - Workflow Invocation Models.md`

- **`managers/workflows.py` line references:** these have drifted by about seven lines. `:722-726` is now `:729-733` at the baseline, and the `:731-732`, `:735-744` and `:748-754` references need the same check.

## Post-merge activities

Apply these only if and after #24708 merges.

### `vault/research/Component - Workflow API.md`

- `GET /api/invocations`: `workflow_id` and `history_id` become repeatable lists, matching any of the given ids.
- `GET /api/workflows/{workflow_id}/invocations`: `history_id` stays a single value here, so "Same as" needs a further exception.

### `vault/research/Component - Workflow Invocation Models.md`

- `build_invocations_query` takes `stored_workflow_ids` and `history_ids`, and uses `IN`. An empty list means no filter.
- With `instance=true`, each given id is resolved to its `StoredWorkflow`.
- Re-anchor the line references to `managers/workflows.py` and `services/invocations.py`.

### Pending research request

- `vault/agents/gx_research/todo/client_grids_and_filtering.md` should cover `FieldEntry.filter` and `GridColumnFilter` if the PR has merged when the note is written. Otherwise the note should mark them as proposed.
