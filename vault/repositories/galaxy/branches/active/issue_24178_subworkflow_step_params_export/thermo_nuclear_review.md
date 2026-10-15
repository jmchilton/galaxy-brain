# Thermo-nuclear review debrief

The review found no structural regression and no code-judo move that would delete real complexity. I acted on one boundary finding in `5cf81e75c12`. `WorkflowStep.step_parameters_by_id` used to raise its documented `ValueError` only by accident, from tuple unpacking or `int()`, which leaked "not enough values to unpack (expected 2, got 1)" into the API's 400 `err_msg`. It now raises an explicit `ValueError` that names the bad key. The signature, the exception types and which inputs raise which type are all unchanged (`-1|x` is still a `KeyError`). Everything else is either accepted as is or belongs to a sibling branch.

## Not acted on

- **`step_parameters_by_id` returns `dict[Any, Any]`, with str keys on the no-op path and int keys for subworkflows.** It is a mild smell, but the signature is a hard constraint, since #24175 and #24176 consume it. The no-op is also what lets the recursion stay a single expression.
- **Second tree walk in `_validate_normalized_step_parameters`.** Kept. See finding 2: the alternatives either bring back silent drops or add model API surface.
- **`KeyError` detail is double-quoted in `err_msg`** (`"Workflow has no step with order_index '9'"`). This is cosmetic, and fixing it means fiddling with `e.args`.
- **The export path still returns a 500 on an unknown inner step id from imported or corrupt stored params**, because the helper raises `ValueError`/`KeyError` instead of `InconsistentDatabase`. This is #24175 territory and is already recorded.
- **Latent `run_config.param_map.get(step.order_index)` keyed-by-id bug.** Out of scope, per the coordinator; already recorded.
- **`model/__init__.py` is 13.6k lines, and this branch adds about 40.** The file was far past 1k long before this branch, so no threshold is crossed, and `WorkflowStep` sits beside its siblings `step_by_index`/`steps_by_id`.

## Verification

- `PYTHONPATH=lib pytest test/unit/workflows -q`: 195 passed, 1 skipped.
- black, isort and ruff are clean. Mypy reports no errors in `galaxy/model/__init__.py`. The pre-commit hooks passed.
- API, under the lock, by me: `-k test_run_with_invalid_legacy_parameter_input` gave 3 passed, covering the top-level test, the `_in_subworkflow` variant, and a third test the substring matches.
- I stopped my remaining sequential API runs at the coordinator's request. The coordinator reports that it re-ran all 13 related API tests on `5cf81e75c12` under the lock, and all passed.

<details><summary>Full review</summary>

### Scope

The scope is `git diff 88127f42979..HEAD` (4 commits) plus `5cf81e75c12`. It touches `model/__init__.py` (the inverse helper pair), `services/invocations.py` (export), `workflow/run_request.py` (normalization and validation), plus API and unit tests.

### 1. Structure and layering: approve

- **The inverse helpers are the right reusable abstraction, in the right layer.**
  - `galaxy.model.store` imports nothing from `galaxy.workflow`, so putting the helpers on `WorkflowStep` keeps #24175's import fix free of a model-to-workflow dependency.
  - They only need `subworkflow`, `steps_by_id` and `step_by_index`, which already exist on the same class.
- **The branch deletes complexity rather than moving it.**
  - It removes the inline split-and-group-and-recurse block in `_normalize_step_parameters`, and the TODO in the export.
  - Export and normalization now share one definition of the `"<inner order_index>|name"` format.
- **No existing canonical parser exists.**
  - `SubWorkflowModule.get_runtime_inputs` builds `f"{order_index}|{name}"` names for runtime-input proxies, which is a different job: it builds definitions, not re-keying.
  - `modules.py`'s `split("|", 1)` is the repeat-prefix parsing for tool state, which is unrelated.

### 2. Code-judo candidates considered

- **Option (a): drop `_validate_normalized_step_parameters` and return to the old recursive `_normalize_step_parameters` over an index-grouped dict.** Rejected.
  - That recursion is exactly what silently dropped unknown or non-numeric indices.
  - It would also re-parse the key format that the helper now owns.
  - The `parameter_input` "must specify 'input'" check is request-layer policy and does not belong in a model re-keying helper.
- **Option (b): a generic visitor or iterator on `WorkflowStep` that yields `(inner_step, inner_params)` over the by-id tree.** Rejected.
  - It would add a third model method to share two traversals of about 5 lines each.
  - That is more surface area, not less.
- **Current shape.** `_validate_normalized_step_parameters(step, param_dict)` is the single home of the check for top-level and nested steps alike, and `_normalize_step_parameters` calls it once per step.

### 3. Boundary and contract (acted on)

- **Finding.** The `step_parameters_by_id` docstring promised a `ValueError` for a key without a numeric `<index>|` prefix, but nothing raised one on purpose. It came from `index_str, name = key.split("|", 1)` unpacking or from `int(index_str)`.
- **Effect.** The run-request 400 appended `str(e)`, so the API errors read:
  - `num_lines`: "...: not enough values to unpack (expected 2, got 1)".
  - `x|num_lines`: "...: invalid literal for int() with base 10: 'x'".
- **Fix (`5cf81e75c12`).** The split and the `int()` sit in a `try` that re-raises `ValueError(f"invalid subworkflow step parameter key {key!r}") from None`.
  - The exception types and the input-to-type mapping are unchanged: `-1|x` and `9|x` are still a `KeyError` from `step_by_index`.
  - The resulting API message is: "Subworkflow step 1 parameters must be keyed as '<subworkflow step index>|<name>': invalid subworkflow step parameter key 'num_lines'".
  - The existing parametrized API test still asserts the shared prefix for all three cases.

### 4. Types

- **`step_parameters_by_id -> dict[Any, Any]`.** It is honest about the two key shapes, as described under Not acted on.
- **`step_parameters_by_index(param_dict: dict[str, Any])`.** It also tolerates int ids through `int(inner_step_id)`, which is what JSON round-tripping needs.
- **`_validate_normalized_step_parameters(..., param_dict: dict)`.** The bare `dict` is acceptable, because the keys are param names for leaf steps and int ids for subworkflows.

### 5. Consistency with sibling paths

- **Subworkflow invocation.** `modules.py` (`int(key)` un-jsonify of the subworkflow param map) already treats stored inner ids as JSON strings. `step_parameters_by_index` matches that.
- **Top-level `parameter_input` popping.** Popping `input` into `normalized_inputs` applies only to top-level steps, as on dev. Nested `parameter_input` values were validated but never popped on dev either, so this is unchanged.

### 6. Tests

- **No trivial tests.** The tests are integration-heavy, and the invalid-key cases already moved to the API layer (see the test challenges debrief).
- **The unit round trip earns its place.** It covers two nesting levels, a nested name containing `|`, and JSON string ids.
- **`test_run_with_invalid_legacy_parameter_input_in_subworkflow` matches its neighbour's style.** Like its top-level neighbour, it uses `self._post` and `assert_error_message_contains`.
- **Imports are at module top level.**
- **No tests were weakened.**

### 7. File size

| File | Lines |
| --- | --- |
| `model/__init__.py` | 13,629 |
| `run_request.py` | 738 |
| `services/invocations.py` | 392 |

No file crosses 1k lines because of this branch.

</details>
