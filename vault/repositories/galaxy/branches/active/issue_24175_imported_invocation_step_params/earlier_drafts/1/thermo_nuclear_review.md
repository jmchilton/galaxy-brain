# Thermo-nuclear review debrief

The review found no structural regressions, so nothing blocks. The design is already the minimal one. I acted on three small findings (F1–F3) in commit `5f914857f95`, which is pushed to `jmchilton`. I didn't act on F4–F6.

- **F1.** `resolve_step_parameters` had two ways of returning `None` (an unknown outer step id, or a `KeyError` on an inner one). They are now a single `try/except KeyError`.
- **F2.** The `cast(str, ...)` calls are gone. A missing `name` or `value` now raises an explicit `ValueError`, so the contract is "ValueError only". Both call sites now catch `ValueError` instead of `(TypeError, ValueError)`.
- **F3.** The import loop used to assign `name`/`value` and then overwrite them. It is now an `if`/`else`. I also reworded the garbled `_serialize` comment.

Validation:

- `test_model_store.py` and `test/unit/workflows` give 249 passed, 1 skipped and 1 xfailed.
- The related API sweep (`test_workflow_request or test_run_subworkflow_runtime_parameters or test_export_reimport_reexport_invocation_with_subworkflow or step_parameters`) passed 12 of 12.
- mypy reports nothing new in the touched files.
- black, isort and ruff are clean.

## Not acted on

- **F4: `steps_by_id` is rebuilt for each row.** The service used to build it once, outside the loop. Workflows have few steps and few step parameter rows, so the cost is negligible. Caching it would mean passing a map into the model method or adding a `step_by_id` helper, which is more machinery than the cost justifies.
- **F5: a `NamedTuple` instead of the bare tuple.** The normal review already declined this. Both callers unpack the tuple right away.
- **F6: the import can't re-key legacy archives from data already in the archive.** I checked: `WorkflowInvocationStep._serialize` exports only `order_index`, not the source step id. So an old archive has no id→index map to recover from. The new `order_index` key is the only way to do it, and it uses the same key name as the sibling `WorkflowRequestStepState` rows. The skip for legacy archives stays, as settled.

<details><summary>Full review</summary>

**Scope:** `git diff 5cf81e75c12..HEAD` (at `37dda97e31c`), about 40 implementation lines across `model/__init__.py`, `model/store/__init__.py` and `services/invocations.py`, plus 74 lines in `test_workflows.py`.

**Overall:** the design is sound and about as small as it can be.

- Only one place translates a stored row's step ids into the order-index form: the model method `WorkflowRequestInputParameter.resolve_step_parameters`. Both the archive serializer and the `/request` export use it.
- The import is the inverse, built from the parent branch's `step_parameters_by_id`. It follows the existing `order_index` convention that the sibling request rows use (`WorkflowRequestStepState`, `attach_workflow_step`).
- New archives keep `name`/`value`, so an older Galaxy degrades the same way it did before. That is the right backward-compatible choice. An archive with only the portable form would make old servers copy an order index as if it were a step id.
- No file crosses 1k lines (all four were already well over). No feature flags. No conditionals bolted onto unrelated flows.

### Code-judo search

- **Could the import re-key old archives using data already in the archive, which would remove the new keys and the skip-with-warning path?** No. The invocation step serializer emits only `order_index`, and `dict_for` adds no source step id, so the archive has no id→index map. Rejected (F6).
- **Should the archive carry only the portable form, without `name`/`value` keyed by id?** That would break older importers. Rejected.
- **Should the resolution live on `Workflow` or `WorkflowStep`?** The row owns `name`/`value` and its invocation's workflow, so the row is the right home. Kept.

### Findings

1. **(Acted, F1) Two `None` paths for one concept.** `steps_by_id.get(...)` with `if step is None: return None` was followed by `try: ... except KeyError: return None`. Both mean the same thing: a stored id isn't in this workflow. Indexing `steps_by_id[...]` inside the existing `try` collapses them into one branch.
2. **(Acted, F2) The casts hid the real invariant.** `int(cast(str, self.name))` and `json.loads(cast(str, self.value))` existed only so that a `None` would surface as a `TypeError`. The docstring and both callers then had to know about `TypeError`. An explicit `if self.name is None or self.value is None: raise ValueError(...)` removes the casts and makes the contract "ValueError for malformed rows" (`JSONDecodeError` and the parent helpers' `ValueError` already fit it). Both `except (TypeError, ValueError)` clauses narrow to `except ValueError`. No other `TypeError` source is reachable: JSON keys are always strings, and a non-dict value gives an `AttributeError`, which is the same as on the parent branch.
3. **(Acted, F3) The import assigned values and then overwrote them.** `name`/`value` were copied from the attrs and then replaced in the `order_index` branch. An `if`/`else` states that the two forms are mutually exclusive.
4. **(Acted) Comment wording.** "also export an order index form import can re-key" is now "Step ids don't survive import, so also export the order index form for import to re-key."
5. **(Not acted, F4) A per-row `steps_by_id` dict build.** This is a minor perf regression compared with the parent branch's hoisted map. It is not worth the extra API.
6. **(Not acted, F5) The tuple return.** It is fine as it is.
7. **Tests.**
   - `_without_step_parameter_order_index` is self-checking and used once. It reads clearly at module level.
   - The parametrized regression test and the legacy test, which also re-exports, cover all three changed paths end to end.
   - I don't see a structural problem.
   - The `mkdtemp()` directories leak, the same as `download_invocation_to_store` does elsewhere in the file. Not worth a change.

</details>
