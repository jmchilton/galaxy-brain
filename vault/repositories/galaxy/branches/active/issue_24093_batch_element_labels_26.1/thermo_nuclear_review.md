# Thermo-nuclear review — issue_24093_batch_element_labels_26.1

**Top line:** Approved the fix's design: a build-only side channel, keyed by `full_name` like pagination. Acted on three small findings, all uncommitted in the worktree. (1) Moved the merge-and-dedup loop out of `DataToolParameter.to_dict` into one helper, `_selected_values`, which replaces `_batch_selection`. It now copies the listified state, so a `multiple` param's state list can't be mutated through aliasing. `to_dict` is a 1-line change vs base. (2) Dropped the redundant `pagination is not None` gate in `populate_model`. (3) Removed the issue reference from the E2E test docstring. No re-architecture.

Not acted on:
- **Threading `incoming` through `populate_model`.** The alternatives are worse. Fixing `to_python` would change execution and dependent-param state. Recording batch values in `populate_state` would put form-build logic in a shared core path. A new arg next to `options_pagination` with the same keying is the least spaghetti option.
- **`Tool.populate_model` pass-through wrapper.** It predates this branch, and removing it is out of scope on a release branch.
- **Renaming `job_input_values` → `selected_values` across the `_page_hda_matches`/`_pin_live_hda_inputs` signatures.** That would cause churn on a release branch. The comment now says batch values flow through it.
- **basic.py (3.3k lines) / tools/__init__.py (5.3k lines) size.** Both files were already far over 1k. This branch adds +17 net lines to basic.py. Decomposition is not this fix's job.
- **Typing `incoming_value`.** It is untyped like the sibling `other_values`. A batch-wrapper TypedDict doesn't exist in this layer; adding one for one consumer is premature.
- **Null batch value / `MalformedId` / DCE collection parity.** Already decided in the normal review. These are behaviour, not structure.

<details>
<summary>details</summary>

## Scope
`git diff d405ebc1f4c..HEAD` (fix + Playwright E2E + selectors). About 90 lines across `tools/__init__.py`, `parameters/populate_model.py`, `parameters/basic.py`, `navigation.yml`, `selenium/test_tool_form.py`.

## Findings

1. **Merge loop in an already-busy `to_dict` (acted).** The branch added a helper that returns batch values, then a dedup loop inline in `to_dict` to merge them into `job_input_values`. That gave two places for one concept ("what is selected"). It is now a single `_selected_values(trans, other_values, incoming_value)` that returns state values plus the later batch values, deduped. `to_dict` swaps `util.listify(...)` for the call. The comment above it was updated to mention batch values.
2. **Aliasing hazard (acted).** `util.listify` returns its argument unchanged when it is a list. For a `multiple` data param, the state value is a list, so the in-place append (in the branch as written) would have mutated form state. In practice dedup makes it a no-op, because `to_python` keeps every value for multiple params. Still, the helper now copies with `list(...)` so it never writes to the state.
3. **Redundant gate (acted).** `populate_model` only added `pagination` when the spec was not None. Both data and data_collection `to_dict` default `pagination=None`, so passing `options_pagination.get(full_name)` directly behaves the same with one less branch.
4. **Issue ref in test docstring (acted).** User constraint: no issue references in code comments.
5. **Design altitude (no change).** The root cause is `BaseDataToolParameter.to_python` collapsing a non-multiple batch wrapper to `values[0]`. Changing that would alter state for dependent params and execution. Re-resolving the raw request value only while building `to_dict` options is the right layer. Batch detection (`MutableMapping` + `"batch"`) matches `from_json`'s own check. `meta.py`'s `is_batch` is a nested closure, so there is no canonical helper to reuse.
6. **`to_dict_kwargs` dict (no change).** Building kwargs per param type is mildly indirect. The alternative is a uniform `to_dict` signature across all params, which is far out of scope. It also collapsed the duplicated paginated/unpaginated calls, a net win.
7. **`HiddenDataToolParameter`** (`type="hidden_data"`) falls through to the plain `to_dict` call, so it is unaffected. **`workflow/modules.py` caller** passes no `incoming` and gets a no-op.

## Validation (after changes)
- Unit: `test_data_parameters.py`, `test_parameter_parsing.py`, `test_execution.py`: 59 passed. Doctests in `basic.py`/`populate_model.py`: 15 passed.
- ruff, black, isort clean. mypy (from `lib/`): no errors in touched files (baseline noise elsewhere only).
- Restarted Galaxy on 8091. Playwright: `test_batch_input_labels_dropped_collection_elements` passed, and neighbour `test_data_options_pinned_via_rerun` passed.

</details>
