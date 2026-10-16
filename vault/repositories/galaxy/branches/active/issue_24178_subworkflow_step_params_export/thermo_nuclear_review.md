# Thermo-nuclear review debrief (re-scope)

I reviewed `5bf7abf5e32..b53a5d9fe8b`, focusing on the re-scope `a171dbed419..HEAD`, and made no code changes. There is no structural regression, no file crossing 1k lines, and no code-judo move that deletes complexity without touching the frozen contract or the hunks that #24175/#24176 are restacking right now. The one structural observation, that callers fold the resolver's `ValueError` into `None`, is the frozen contract itself, so it is a follow-up for after the siblings land. Nothing in the resolver or in `step_parameters_by_*` changed.

## Not acted on

- **Resolver's two failure signals (finding 1).** Three of the four call sites across the stack treat `ValueError` and `None` the same way. The contract is frozen, so this is a post-merge follow-up.
- **Export could reuse #24176's `WorkflowInvocation.recover_step_parameters()` (finding 2).** It is the natural home, but it lives on a sibling branch and has a different error policy. Post-merge follow-up.
- **Splitting `_normalize_step_parameters` into normalized and legacy paths (finding 3).** It moves the `already_normalized` dispatch rather than deleting it, and it adds a function. Declined.
- **The two log+raise blocks in the export (finding 4).** #24175 rewrites the `None` branch, so extracting them now only makes a conflict. Declined.
- **Turning `test_resolve_step_parameters_malformed_row`'s loop into `parametrize` (finding 5).** It would give better failure ids, but #24176 edits the adjacent hunk of the same file mid-restack. Deferred.
- **Nits:** the missing `from e` on the subworkflow re-raise in `run_request.py`, and "No-op for other step types" in the `step_parameters_by_index` docstring, which reads as skipping the dict check. Both are cosmetic, and fixing them isn't worth a restack.
- **Already settled in [earlier thermo review](earlier_drafts/1/thermo_nuclear_review.md), not re-raised:** the `dict[Any, Any]` return type, the second tree walk, `KeyError` quoting, and the size of `model/__init__.py`.

## Verification

- `pytest test/unit/workflows`: 198 passed, 1 skipped.
- mypy from `lib/`: no errors in `model/__init__.py`, `run_request.py`, `services/invocations.py` or `test/unit/workflows`. The other 23 errors are in unrelated modules.
- I did not re-run the API tests, because the code is unchanged since `b53a5d9fe8b`, where the [Codex review](codex_review.md) run passed under the lock.

<details><summary>Full review</summary>

### Scope and shape

| File | Change | Lines after |
| --- | --- | --- |
| `model/__init__.py` | +59 | 13,652 (already huge) |
| `run_request.py` | +28 / −15 | 745 |
| `services/invocations.py` | +19 / −7 | 403 |
| `test_workflows.py` | +87 | already huge |
| `test_run_parameters.py` | +128 | 268 |

No file crosses 1k lines because of this branch.

The layering is correct:
- **Model (`WorkflowStep`):** owns the key format through `step_parameters_by_index` and `step_parameters_by_id`.
- **Model (`WorkflowRequestInputParameter`):** owns row decoding through `resolve_step_parameters`.
- **Request layer:** owns policy, meaning the 400s and the `parameter_input` check.
- **Service:** owns the 500 policy.

The re-scope's `param_map.get(step.id)` fixes a real key-space mismatch: `param_map` is keyed by step id everywhere (`_normalize_step_parameters`, `workflow_request_to_run_config`, `modules.py` `inject`). It is not a new special case.

### 1. Resolver contract: two failure signals, three of four callers fold them (structural; frozen)

- **This branch's export** distinguishes the two signals: `ValueError` becomes a 500 for a malformed row, and `None` becomes a 500 for an unknown step.
- **The siblings fold them:**
  - #24175's `_serialize` does `except ValueError: resolved = None`.
  - #24175's export changes `None` to skip-with-warning.
  - #24176's `recover_step_parameters` does `except ValueError: resolved = None`.
- **Effect:** the `None`-versus-raise split pushes a try/except/None dance onto most callers.
- **Simpler alternative:** a single "unusable row" signal would delete those blocks, such as one exception type, or `None` for both with the reason logged in the resolver.
- **Why not now:** the signature, the `None` result and the `ValueError` are a hard constraint while the siblings restack. Revisit after all three land.

### 2. Export should be the strict twin of `recover_step_parameters` (missed reuse; sibling-owned)

- **The overlap:** #24176 adds `WorkflowInvocation.recover_step_parameters()`, which loops over the rows and resolves them, next to the existing `recover_inputs()`. That is the canonical home for "this invocation's step parameters". The export loop in `serialize_workflow_invocation_to_request` does the same iteration inline.
- **The difference:** the policies differ. The export raises on malformed rows, while recover skips them.
- **Follow-up after merge:** give `recover_step_parameters` a strict mode, or key it by `order_index`, and have the export call it. The export's STEP_PARAMETERS branch would then shrink to about one line.

### 3. `_normalize_step_parameters` code-judo candidate (declined)

- **The smell:** `already_normalized` is now tested in three places: the unknown-index pre-check, the `.get(str(order_index))`, and the subworkflow guard.
- **The candidate:** split into a normalized path and a legacy path that share the validate-and-store tail.
- **Why it is declined:**
  - The flag dispatch would move to `build_workflow_run_configs` rather than disappear.
  - It adds a function.
  - The unit tests call `_normalize_step_parameters(..., already_normalized=True)` directly.
- **The pre-check itself is fine:** it is 6 boring lines and reports the first unknown key in request order. A set-difference one-liner saves 2 lines and still needs a key chosen for the message.

### 4. Export log+raise duplication (declined, sibling conflict)

- **The duplication:** two blocks of about 8 lines each, a `log.error` plus an `InconsistentDatabase`. The log line is deliberate, because a typed 500 alone stops reporting to Sentry.
- **Why it stays:** #24175 replaces the `None` block with skip-with-warning, so the blocks diverge anyway. Extracting a helper now would conflict with that restack and be undone by it.

### 5. Tests

- **The tests use real models,** via `yaml_to_model`, a real `WorkflowRequestInputParameter`, and the shared `MockTrans`. There are no mocks to replace.
- **Each test layer earns its place,** per the [test challenges debrief](test_challenges_debrief.md).
- **`test_resolve_step_parameters_malformed_row` loops over 8 cases.** On a failure, "DID NOT RAISE" doesn't name the case. `parametrize` with ids would be strictly better, but #24176 inserts a test right after it in a mid-restack hunk. Deferred.
- **Imports are at module top** in the touched files, and no assertions were weakened.

### 6. Types and docstrings

- **The `step_parameters_by_index(param_dict: dict[str, Any])` annotation is narrower than reality.** The input is decoded JSON, so `Any`, and the `isinstance` check exists for exactly that reason. Widening the annotation is a signature change, which is a constraint, so it is left as is.
- **The docstring's "No-op for other step types" now slightly overstates.** The dict check runs for every type, though the `Raises` sentence says so. This is a nit.
- **The `except (ValueError, KeyError)` re-raise in `run_request.py` lacks `from e`.** Implicit chaining preserves the context, and `MessageException` is handled anyway. This is a nit.

### 7. Correctness spot checks (no issues)

- **Invoke `parameters` keys are always `str`.** The `InvokeWorkflowPayload.parameters` field is `dict[str, dict[str, Any]]`, dumped through `model_dump`, so the `key not in step_indices` string comparison is sound.
- **`run.py` `subworkflow_invoker` now reads the subworkflow invocation's own recorded rows** through `workflow_request_to_run_config`. These are keyed by step id, consistent with `inject_all`'s `param_map.get(step.id)`.
- **`resolve_step_parameters`'s `except KeyError` can only see lookup misses:** the outer `steps_by_id` and the inner `steps_by_id` in `step_parameters_by_index`. `int()` and `json.loads` failures surface as `ValueError` as documented.

</details>
