# Normal review (raw) - issue_24175_imported_invocation_step_params @ aacc3ea3198

Reviewed `git diff 8f358dbb341 HEAD` (5 commits, 4 files, +130/-5). Read-only; ruff/black/isort clean on touched files. No API/integration tests run. No security issues.

**Verdict: no blockers.** The import drop is correct and safe. One "should" (coverage of the now-defensive guards), the rest nits.

## Correctness of the import drop (verified)

- **Never discards a mappable row.** `_import_workflow_invocations` always builds a new `Workflow` via `read_workflow_from_path`, even on same-server import, so a raw source step id can never be valid on the imported workflow. A row without `order_index` is always stale.
- **Other param types untouched.** The drop is gated on `type == STEP_PARAMETERS`; replacements/meta/resource rows copy name/value verbatim as before. Only `_serialize` of step rows ever emits `order_index`, so the ungated `"order_index" in attrs` re-key branch is safe in practice (see nit 2).
- **Rows the exporter couldn't resolve** (stale id from a pre-fix import on the source, or malformed -> `ValueError`) export without `order_index` and are dropped on import. Consistent with legacy archives.
- **Subworkflow invocations.** Each nested invocation is exported as its own `included_invocations` entry with its own workflow artifact, and re-keyed against its own imported workflow. The outer row's inner ids are re-keyed through the outer imported workflow's `step.subworkflow`, which is what `/request` on the outer invocation reads. Round-trip format matches `run_request.py` (`name=str(step.id)`, `value=json.dumps(param_dict)`, subworkflow nested by inner step id). New nested parametrize case asserts the imported subworkflow invocation's own `/request`.
- **History-level exports.** Same `included_invocations` serializer and same `_import_workflow_invocations` path, so covered by the same code.
- **Malformed new-style archives.** `step_by_index` / `step_parameters_by_id` raising aborts the import. Same as the existing `attach_workflow_step` for step/step-state rows; consistent, no action.
- **Older Galaxy importing a new archive** ignores the extra keys and behaves as before. Fine.

## Export-side / `/request` skip - reasonable?

Yes. Invocations imported before this fix already sit in databases with stale step ids. Without the `_serialize` `resolved is not None` guard, exporting any of them would crash on tuple-unpack; without the `/request` skip, Rerun 500s for them. Both are needed. Residual hazard (documented in scope eval): for those already-imported rows, a stale id that collides with a real step id of the *same* imported workflow is silently used. Unfixable without the source mapping; not this branch's job.

## Findings

1. **should (optional) - the two defensive guards are now uncovered.** With the import drop, the legacy API test no longer reaches the `_serialize` guard or the `/request` skip (the earlier mutation checks in implementation_debrief.md no longer hold). The `_serialize` guard is not trivial: removing it would make *export* fail for every pre-fix imported invocation. Stale DB rows can't be created through the API anymore, so the cheapest cover is to strengthen the existing `test_import_export_invocation` in `test/unit/data/model/test_model_store.py` (not a new test): add a `WorkflowRequestInputParameter(type="step", name="999999", value="{}")` to the invocation from `_setup_invocation`, then assert the export succeeds and the imported invocation has no `type == "step"` rows. That covers the `_serialize` guard and the import drop in one existing test. The `/request` skip stays uncovered; accept that and note it in the PR description / debrief. If John prefers no unit coverage, at least update implementation_debrief.md so it doesn't claim mutation coverage for these guards.

2. **nit - fold the import loop into one type branch.** `order_index` is checked twice and the re-key branch isn't gated on type. Clearer:
   ```python
   input_parameter = model.WorkflowRequestInputParameter()
   if input_parameter_attrs["type"] == model.WorkflowRequestInputParameter.types.STEP_PARAMETERS:
       if "order_index" not in input_parameter_attrs:
           log.warning(...)
           continue
       step = workflow.step_by_index(input_parameter_attrs["order_index"])
       input_parameter.name = str(step.id)
       input_parameter.value = dumps(step.step_parameters_by_id(input_parameter_attrs["step_parameters"]))
   else:
       input_parameter.name = input_parameter_attrs["name"]
       input_parameter.value = input_parameter_attrs["value"]
   ```
   (Construct the model object after the `continue`, or keep it where it is; either way one branch.) This also lets the second comment go.

3. **nit - drop comment/log wording undersells the case.** The comment says "Archives exported before order_index was recorded hold a step id from the source server", but new exporters also omit `order_index` for rows they couldn't resolve. Suggest comment: `# Rows without order_index (older archives, or rows the exporter couldn't resolve) only carry a source-server step id.` Log: `"Dropping step parameters of imported invocation %s: step id %s from the archive has no order_index to map onto the imported workflow"`. The current "for unmappable step id %s" is fine but doesn't say why.

4. **nit - `_serialize` swallows `ValueError` silently.** A malformed row then gets dropped at import with a "step id" message that hides the real cause. Low value; optionally `log.warning` in `_serialize` on `ValueError`, or leave it (the `/request` path already logs malformed rows on the source server).

5. **nit - test helper duplication.** `_invocations_attrs` and `_without_step_parameter_order_index` both scan the tar for `os.path.basename(member.name) == "invocation_attrs.txt"`. Small; a module constant `INVOCATION_ATTRS_FILENAME = "invocation_attrs.txt"` (galaxy_test/api doesn't import `galaxy.model.store`, so hardcoding is right) or an `_is_invocation_attrs(member)` helper removes the repeat. Not worth more abstraction than that. `mkdtemp()` leak matches existing populator behaviour; fine.

6. **nit - test comment.** In the legacy test, `# The stale step id can't be mapped onto the imported workflow, so its parameters are dropped.` is now explained by import, not `/request`; reads fine, could say "import drops them". The re-export assertion comment is accurate. Otherwise no obvious comments.

## Other checks

- Imports at module top (`tarfile` in test; `dumps`/`log` already top-level in store). OK.
- Reuse: re-key uses the parent's `resolve_step_parameters` / `step_parameters_by_id` and the existing `step_by_index` (same mechanism `attach_workflow_step` uses). Good; nothing new accreted.
- Tests are API tests, red-to-green per debrief; parametrize with conditional subworkflow assertion mirrors the sibling `test_workflow_request_subworkflow_step_parameters_rerun`. Acceptable.
- Typing: nothing to add; `step_by_index` is untyped upstream, out of scope.
