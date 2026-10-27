# Thermo-nuclear code quality review debrief

Verdict: approve with trims. The fix reuses the right abstraction: Cheetah's `ElementIdentifierMapper` reads the persisted `|__identifier__` params, and the evaluator that owns the job params computes the mapping. I made three behavior-preserving trims, squashed into the fix commit (`628fe853317` became `4a7dfd2c555`; the baseline `414a1fcb686` is unchanged):
- `identifiers_by_dataset_id` now iterates `identifier_key_dict.items()` and reads the key directly, instead of calling `identifier()`, which looked the dataset up again. It also gets a one-line docstring.
- `setup_for_runtimeify` normalizes `element_identifiers or {}` once at the top, rather than inside the `adapt_dataset` closure on every call.
- The `/api/jobs` test calls `tool_request_raw` with keyword args instead of passing a bare positional `None` for `tool_id`.

Not acted on:
- **Route the `/api/tools` UDT path through runtimeify and delete the `to_cwl` threading.** This is the real code-judo move: it would remove the `element_identifiers` kwarg from all four `to_cwl` recursions. But it changes behavior for every legacy-path UDT, so it's out of scope for a ~30-line fix.
- **Bundle `to_cwl`'s pass-through kwargs (`step`, `compute_environment`, `shell_quotable`, `element_identifiers`) into a context object.** That restructures a shared workflow function for one new kwarg. The new kwarg follows the existing threading pattern.
- **Drop `element_identifiers` from the DatasetCollection-branch recursions**, where DCE children already set the identifier. Skipped: correctness would then depend on DCE identifiers being truthy, and the kwarg would break symmetry with the other threaded kwargs.
- **Make `element_identifiers` required.** That would force edits at the `test_runtime.py` call sites and at `modules.py:470/473`, which are workflow callers with no job params. The optional parameter with a None default stays.
- **Key identifiers per input instead of by dataset id** (Codex P2). This was already decided: it matches Cheetah's mapper semantics.
- **A shared setup helper for the 3 UDT API tests** (create tool plus a 2-element list). The duplication is small, and each test reads top to bottom. The plain-dataset test is in the baseline commit, so a shared helper would have to land there too.
- **File size.** The 1k-line rule isn't triggered. `wrappers.py` ends at 903 lines. `evaluation.py` (1243) and `modules.py` (3715) were already over 1k at base and grow by single digits.

<details><summary>Full review</summary>

Scope: `git diff 51e0a80a0db..HEAD`, which touches 4 production files (+28/-1) and the tests/populators.

1. **Structure / layer: OK.** The mapping lives in `UserToolEvaluator.build_param_dict`, next to the Cheetah path's own `ElementIdentifierMapper(input_datasets)` use (`evaluation.py:511`). Both the runtimeify and `to_cwl` consumers receive a plain `dict[int, str]`. No feature checks leak into shared code beyond one `if` in each adapter that sets the property.
2. **Missed simplification (structural, not acted on).** The fix needs two consumers only because the legacy `to_cwl` path still exists for UDTs submitted via `/api/tools` without `job.tool_state`. Deleting that path would remove the 5 kwarg threadings in `modules.py`, but it is a behavior and scope change.
3. **Redundant lookup (acted on).** `identifiers_by_dataset_id` called `self.identifier(dataset, ...)`, which re-looks up `identifier_key_dict[dataset]` and runs a list `TypeError` guard that dict keys can never trip. Iterating `.items()` gives the same result without either.
4. **Optionality churn (partly acted on).** `(element_identifiers or {})` appeared twice. Normalizing once in `setup_for_runtimeify` removes the per-call allocation in the closure. In `to_cwl` the expression stays: normalizing there would add a statement to every recursive frame for no gain.
5. **Legibility (minor, not acted on).** In `to_cwl`, `element_identifier` (the DCE local), `element_identifiers` (the map) and `identifier` (the walrus) sit close together. They read fine in context, and renaming a pre-existing local would add churn.
6. **Test helper boundary (acted on).** `tool_request_raw(None, inputs, history_id, tool_uuid=...)` hid which argument was `None`. Keyword args fix this. The `DescribeToolExecution` request path (`populators.py:4844`) only supports `tool_id`, so there's no cheaper canonical helper to reuse.
7. **`tool_request_raw` signature** (`tool_id: str | None` plus `tool_uuid`) mirrors `run_tool_raw`'s UUID support and builds the payload conditionally. That's acceptable.
8. **File size:** see above, not triggered.
9. **Imports:** all at module top. The pre-existing lazy imports in `build_param_dict` are untouched.
</details>

Verification after the rebase: unit tests (`test_runtime.py`, `test_evaluation.py`, `test_modules.py`) 158 passed. API `-k element_identifier`: 4 passed. black and ruff are clean. The full mypy output for `runtime.py` and `wrappers.py` has no error on any changed line. The remaining errors are pre-existing strict-mode ones, such as `setup_for_runtimeify` missing a return type at :105. The closure's read of the normalized `element_identifiers` type-checks.
