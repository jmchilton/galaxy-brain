Run via Claude Opus at high effort.

**Acted on 7 findings and folded them all into "Validate workflow run requests before creating histories".** The workflow parameter value-type checks now live in their canonical module. The target history is resolved once, by one function shaped like dev's. The not-found and access checks on data-input lookup are collapsed into one helper. `requires_materialization` is now a property, the dead batch check in the service is gone, the object-store churn is reverted and a docstring is trimmed. There's no behavior change, and the error types and messages are unchanged. Head moved from `9a14236cf7e` to `996d48d2e69`, force-pushed to `jmchilton`.

Tests:
- Unit (`test/unit/workflows/` + `test_landing.py`): 296 passed, 2 skipped.
- API `test_workflows.py`, broad selection (run-with, no-history, mapping, rerun/cached, replacement params, ds_map, subworkflow, url, landing, batch, library, history-target): 185 passed, 1 skipped.
- API `test_landing.py`: 23 passed.
- ruff, black and isort are clean.
- mypy (CI-style, from `lib/`) reports no errors in the touched files.

## Not acted on

- **`normalized_inputs` mixes value types and is mutated in place.** It holds raw parameter values plus `_ResolvedDataInput` objects, which the second loop swaps for content. This follows dev's own pattern (`input_dict["content"]`, then unwrapping), and splitting it into two dicts adds a concept without removing one.
- **`validate_input_value` takes its own runtime `input_param`.** The caller needs to tell an invalid stored default (dev's `step_cannot_run_exception`, from mvdbeek's 3f65dd5a1f2) apart from an invalid supplied value, and both raise `ParameterValueError`.
- **`[text]` multiple values skip the per-element type check.** This is upstream's per-entry `TextToolParameter` validation, kept as decided during the rebase.
- **`_is_integer_value` and `_is_float_value` are near-duplicates.** Folding them into one `number_type`-parametrized helper would need a special case for float-to-int. Two plain predicates are easier to read.
- **`_validate_resource_params`** is dev code moved verbatim, TODOs included. Cleaning it up is out of scope.
- **`requires_materialization` accumulates across batch entries.** Once one entry needs materialization, every later run config is flagged too. Dev does the same, so I kept it. A small follow-up could make it per entry.
- **`param_map not in validated_param_maps`** is a linear scan over unhashable dicts, so O(N²). At real batch sizes that's trivial.
- **`modules.py` is already 3788 lines on dev.** The 1k-line rule doesn't apply. Moving the type checks out cut the branch's addition from 86 to about 40 lines.
- **Known decisions, not re-litigated:**
  - *Dropping the collection-type comparison:* I agree. Typed and untyped `collection` inputs both read as `list` at invocation, so the check can't be correct without a way to tell an explicit type from the default.
  - *Accepting URI datasets for collection inputs:* I agree it stays while dev's `test_run_workflow_from_url_with_implicit_conversion_on_collection` depends on it. The ID path and the URI path are now inconsistent, and that's worth closing once the test's input declaration is fixed.
  - *Single invocation populating twice:* I agree it needs the commit-to-flush change in the second loop, which is a transaction decision.

<details>
<summary>Full review</summary>

Scope: `git diff origin/dev...9a14236cf7e` (3 commits, 7 files), plus callers of `build_workflow_run_configs`, `queue_invoke` and `workflow_run_config_to_request`.

**Verdict:** structurally sound. The validate-then-side-effect split is the right move and makes the restructure of `build_workflow_run_configs` worth it. Two problems were worth fixing: logic in the wrong layer, and two helpers that re-read the same payload keys. The rest were cheap deletions. No real bugs.

### Structural / canonical layer

1. **Value-type checks in the wrong module (acted on).** `_is_string_value`, `_is_integer_value`, `_is_float_value`, `_is_boolean_value` and `PARAMETER_VALUE_TYPE_CHECKS` were added at the top of `modules.py`, about 1700 lines from their one user, `InputParameterModule.validate_input_value`. `workflow/workflow_parameter_input_definitions.py` is the module that owns per-workflow-parameter-type tables keyed on `INPUT_PARAMETER_TYPES` (`WORKFLOW_PARAMETER_VALIDATOR_TYPES`, `FORM_VALIDATOR_SHAPES`), and `modules.py` already imports from it. I moved the checks there as `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS: dict[INPUT_PARAMETER_TYPES, ...]`. The key is now the `Literal` type instead of `str`, so mypy flags any new parameter type that lacks a value check.
   - Reuse considered: `IntegerToolParameter.from_json` accepts `True` and `5.5`, and `BooleanToolParameter` accepts anything. The strict tool-model `StrictInt` rejects `"5"`, which `test_run_with_parameter_input_as_string` pins as accepted. Neither existing abstraction gives the contract, so a small table is justified.

### Code judo / simplification

2. **One target-history resolver, not two (acted on).** `_get_existing_target_history` and `_new_target_history_name` both read `new_history_name`, `history_id` and `history`, and only one of them checked the "specified multiple ways" rule. Together they left a `str | None` third slot in each validated request and an `assert new_history_name is not None`. `_get_target_history(trans, workflow, payload) -> History | str` now returns the existing history or the base name for new ones, which is dev's function shape minus the history creation. `_new_history_name(base_name, ids)` adds the batch suffix in the side-effect loop, so the tuple slot, the assert and the unused optional `param_keys=None, index=0` defaults are gone.
   - Dropped dev's `"Incorrect expansion of workflow batch parameters."` guard. `expand_workflow_inputs` appends `params_keys` in lockstep with `param_combinations`, so the guard can't fire.
3. **Data-input lookup: one not-found, one access check (acted on).** `_resolve_data_input` had four lookup branches. Three went through a TypeVar helper taking 5 parameters, and the HDCA branch repeated the not-found f-string inline. `_get_data_input_content` now looks the input up per request type, raises `ObjectNotFound` once and checks dataset access once for HDA and LDDA. HDCAs keep `dataset_collection_manager.get_dataset_collection_instance`, which does its own access check. The messages and exception types are byte-identical. `_resolve_data_input` takes `module: InputModule`, so the narrowing `assert` moves to the call site, where the `InputParameterModule` branch already dispatches.
4. **`requires_materialization` belongs to the resolved input (acted on).** It depends only on whether the request is a non-deferred URI, which is known before any side effect. Making it a property of `_ResolvedDataInput` removes `_add_data_input_to_history`'s `tuple[Any, bool]` return. That function now returns `HDA | HDCA | InputWithRequest` with no `Any`.

### Spaghetti / dead code

5. **Duplicate batch check (acted on).** `build_workflow_run_configs` now raises "Must specify 'batch' to use batch parameters." before any side effect. The identical check after it in `WorkflowsService.invoke_workflow` became unreachable, since that service is the only caller. I removed it.
6. **Object-store churn (acted on).** The `WorkflowRunConfig(...)` call switched from the `preferred_*_object_store_id` locals to `payload.get(...)` while the locals were still defined and validated a few lines up. I reverted that.

### Boundary / types

7. `_ResolvedDataInput.content` is now typed `DataInputContent | None`, with a one-line note that it's `None` for URI requests. `_add_data_input_to_history` asserts that invariant, instead of hiding it behind `Any`.
8. The `services/workflows.py` landing lookup was fine. The branch reuses `LandingRequestManager`'s ownership and claim checks instead of the service's raw query, and that's the right direction. Renaming `_get_claimed_workflow_landing_request` to public `get_claimed_workflow_landing_request_model` is the minimal exposure.
9. The `validate_input_value` docstring was cut to one line of what and one line of constraint.

### Reviewed, no change

- The removed replacement-param type check in `workflow_run_config_to_request`: the only user-input path into it is `build_workflow_run_configs`, which now validates first. Subworkflow and reload paths reuse already-validated dicts.
- `_get_target_history` still calls `get_mutable` once per request instead of once per batch entry. That's a small improvement over dev, and it's equivalent.
- The tests, already challenged in `test_challenges_debrief.md`: no new duplication worth a helper. The repeated history-name assertion is noted there.

</details>
