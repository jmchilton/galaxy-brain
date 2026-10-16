# Thermo-nuclear review (re-scope) — debrief

I reviewed `git diff b53a5d9fe8b 0836b29c98e`: this branch on top of the parent #24178, about 37 implementation lines plus tests. I found no structural regression and no blocker. I acted on one small finding (T1) in `301e92ededd`, since pushed. In the import loop, the `WorkflowRequestInputParameter` is now built once, through its constructor, after the step-parameter branch. Before, a throwaway row was constructed before the drop `continue`. The loop still branches once on type. Nothing else needed changing.

Validation:

- `test_model_store.py` gives 54 passed and 1 xfailed.
- black, isort and ruff are clean, and the pre-commit hooks pass. mypy, run from `lib/`, reports nothing in `model/store/__init__.py`.
- API tests ran under the lock, one at a time:
  - `-k "after_invocation_import or without_step_parameter_order_index"`: 3 of 3 pass.
  - The sweep `test_workflows.py` plus `test_workflow_extraction.py` with `-k "reimport or from_store or step_parameters or workflow_request"`: 10 passed, 1 skipped.

Not acted on:

- **T2: the legacy-archive API test overlaps the unit test.** The strengthened `test_import_export_invocation` already drives the same import path, a row without `order_index` being dropped, and its export. The API test, with its 45 lines of tar helpers, adds realism: a real legacy archive, `/request` and a re-export. Removing it needs John's approval, so it stays. It's an option if the test file's size matters.
- **T3: there's no model-side inverse of `resolve_step_parameters`.** The import re-key inlines `name=str(step.id)` and `value=dumps(step.step_parameters_by_id(...))`. A `set_step_parameters(step, params)` on the row would keep the encode and decode next to each other. It would have one caller, though: `run_request` writes rows that are already keyed by id. That would make it a thin wrapper.
- **T4: the tar helper uses the literal `"invocation_attrs.txt"`, not `ATTRS_FILENAME_INVOCATIONS`.** `galaxy_test` is packaged separately, and importing `galaxy.model.store` into an API test would cross that package boundary, which the package CI doesn't check.
- **T5: a bad `order_index` aborts the import with a `KeyError`.** This matches `attach_workflow_step` for the sibling rows. The exporter only writes indexes it could resolve.
- **Already declined in earlier reviews:** the silent `ValueError` in `_serialize` (normal review), the tar helpers living at module level, the `mkdtemp` leak, and the parent resolver rebuilding `steps_by_id` per row. The last one is a parent follow-up at most, and it was declined last round as negligible.

<details><summary>Full review</summary>

**Scope:** `_serialize` in `model/__init__.py` (+10), the import loop in `model/store/__init__.py` (+16/-2), the `/request` skip in `services/invocations.py` (+4/-3), the API tests (+104) and the unit test (+14).

### Approval bar

- **File size.** Every touched file was already well over 1k lines, so the threshold rule doesn't trigger, and the additions are small.
- **Spaghetti.** No branching was added to unrelated flows:
  - The `_serialize` addition sits in the row's own serializer.
  - The import branch sits in the canonical per-row import loop for that row type, next to sibling rows that use `attach_workflow_step`'s `order_index` convention.
  - The `/request` change replaces the parent's raise with a skip, which was settled.
- **Reuse.** It uses the parent's `resolve_step_parameters`, `step_parameters_by_id` and `Workflow.step_by_index` as they are. There's no near-duplicate helper.
- **Types and boundaries.** There are no casts. The `ValueError`-only contract from the parent is honoured at both call sites.

### Code-judo search

- **Re-key from data already in the archive and drop the new keys?** No. The invocation step serializer exports no source step id, which was confirmed last round. The new `order_index` and `step_parameters` keys are the only way to make the rows portable.
- **Export only the portable form?** No. That would break older importers, and settled scope keeps `name`/`value`.
- **Delete the `_serialize` guard or the `/request` skip?** No. They're settled: rows imported before the fix exist in databases.
- **Move the import encode onto the model?** Considered (T3). It would have a single caller and save about one line, so it would be a thin wrapper. Declined.

### Findings

1. **(Acted, T1) A throwaway model object on the drop path.** The loop built `model.WorkflowRequestInputParameter()` before deciding to drop the row, then `continue`d, so a reader had to work out that the orphan never reaches the session. The branch now computes `name`/`value`, and the row is built once with `WorkflowRequestInputParameter(name=, value=, type=, workflow_invocation=)`. This keeps the single type branch that the normal review asked for, and the separate `type` and `workflow_invocation` assignments are gone.
2. **(Not acted, T2) Test overlap.** See above.
3. **(Not acted, T3–T5).** See above.
4. **Tests otherwise.**
   - The parametrized regression test pins the bug (`/request` returning a 500 after import) for flat and nested workflows.
   - The `if subworkflow_step_parameters:` inside the parametrized test is a small conditional. It's acceptable for two cases.
   - The helpers are self-checking and typed.

</details>
