# pickValue: Native Framework Support Plan

## Problem Summary

CWL v1.2 workflows use `pickValue` on workflow outputs (and step inputs) to merge multiple sources, selecting non-null values. Galaxy crashes when importing these workflows because `parser.py:get_outputs_for_label()` hardcodes `multiple=False` on `outputSource`, and no runtime logic exists to apply pickValue semantics when collecting workflow outputs.

27 CWL v1.2 conditional tests are RED because of this gap.

## pickValue Patterns in CWL Tests

Two distinct patterns exist:

**Pattern A: Multiple outputSource (most tests)**
```yaml
outputs:
  out1:
    type: string
    outputSource: [step1/out1, step2/out1]
    pickValue: first_non_null
```
Steps have `when` expressions; some produce null. The workflow output gathers from multiple steps and picks among them.

**Pattern B: Single outputSource + scatter (cond-wf-009, 010, 011)**
```yaml
outputs:
  out1:
    type: string[]
    outputSource: step1/out1
    pickValue: all_non_null
```
A single step is scattered with `when`; some scatter elements produce null. `pickValue` filters nulls from the scatter result array.

## Current Architecture

### Workflow Model (model/__init__.py)

`WorkflowOutput` lives on a single `WorkflowStep`:
```python
class WorkflowOutput(Base):
    workflow_step_id  # FK to workflow_step
    output_name       # which output of that step
    label             # the workflow output label
```

A workflow output is bound to **one step and one output_name**. There is no mechanism for a workflow output to reference outputs from multiple steps.

`WorkflowStepConnection` models data flow between steps — it connects an output step to a `WorkflowStepInput` on the consuming step. Multi-source connections (for step inputs) work via multiple `WorkflowStepConnection` rows pointing to the same `WorkflowStepInput`.

### CWL Parser (tool_util/cwl/parser.py)

`WorkflowProxy.get_outputs_for_label(label)` iterates CWL workflow outputs, calls `split_step_references(outputSource, multiple=False)` which asserts a single reference. It returns a list of `{"output_name": ..., "label": ...}` dicts that get placed in the step dict's `workflow_outputs` list.

`WorkflowProxy.to_dict()` produces a Galaxy workflow dict where each step has a `workflow_outputs` key. The problem: a CWL workflow output with `outputSource: [step1/out1, step2/out1]` references TWO different steps, but Galaxy's dict format puts `workflow_outputs` **inside each step dict** — there's no place for a cross-step output.

### Workflow Import (managers/workflows.py)

`_workflow_from_raw_description()` walks step dicts. For each step, if `workflow_outputs` exists, it creates `WorkflowOutput` model objects bound to that step (line ~1941-1964). There is no mechanism to create a workflow output that spans multiple steps.

### Workflow Execution (workflow/run.py)

`WorkflowProgress.set_step_outputs()` iterates `step.workflow_outputs` and calls `_record_workflow_output()` for each. This records the output in the invocation via `workflow_invocation.add_output(workflow_output, step, output)`.

`get_replacement_workflow_output()` looks up a workflow output by going to its step and finding the output by name in `self.outputs[step.id]`.

### Null/Skipped Outputs

When `when_values == [False]` (step skipped entirely), the tool still executes but produces "empty" datasets. These get hidden (`output.visible = False`). The outputs dict still has entries — they're just empty/hidden HDAs, not Python `None`.

For CWL, a skipped step should produce `null` for its outputs. Currently Galaxy represents this as an empty HDA, which is not the same thing. The `WorkflowInvocationOutputValue` table stores JSON values, so it *can* store `None`.

## Proposed Approach

### Strategy: Duplicate-Label WorkflowOutputs + Post-Processing

Rather than fundamentally restructuring `WorkflowOutput` to span multiple steps (which would be a massive model change touching export, import, editor, API, and every workflow feature), use a simpler approach:

**Add `pick_value` metadata to `WorkflowOutput` and handle it during output collection in run.py.**

The key insight: Galaxy's workflow model already supports a workflow output being on a specific step. For Pattern A (multiple outputSource), we need multiple `WorkflowOutput` objects *with the same label* on different steps. For Pattern B (scatter+pickValue), we need pickValue logic on a single WorkflowOutput.

Currently, the label uniqueness is not enforced at the DB level — it's just convention. And `set_step_outputs()` already iterates all `WorkflowOutput` objects per step. We can:

1. Create multiple `WorkflowOutput` objects with the same label on different steps
2. Add a `pick_value` column to `WorkflowOutput`
3. At the end of execution, post-process outputs with the same label using pickValue semantics

### Alternative Considered: Direct Model Restructuring

Adding multi-source workflow outputs to the model would require:
- New join table `workflow_output_source` (workflow_output_id, step_id, output_name, position)
- Changes to `WorkflowOutput` to remove step FK or make it nullable
- Changes to every export format (ga, format2, editor dict, instance dict)
- Changes to the workflow editor UI (which we're explicitly not touching)
- Changes to run.py output collection
- Changes to the API schema for WorkflowOutput

This is a much larger change with much broader impact. The duplicate-label approach is more contained.

## Detailed Plan: Native pick_value on WorkflowOutput

### Phase 1: Model Changes

**Add column to `workflow_output` table:**

```python
# In model/__init__.py, class WorkflowOutput:
pick_value: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
```

Valid values: `None`, `"first_non_null"`, `"the_only_non_null"`, `"all_non_null"`.

**Migration:**
```python
# New alembic migration
def upgrade():
    add_column("workflow_output", Column("pick_value", String(64), nullable=True))
```

**Update copy():**
```python
def copy(self, copied_step):
    copied_output = WorkflowOutput(copied_step)
    copied_output.output_name = self.output_name
    copied_output.label = self.label
    copied_output.pick_value = self.pick_value
    return copied_output
```

**Update _serialize():**
```python
def _serialize(self, id_encoder, serialization_options):
    d = dict_for(self, output_name=self.output_name, label=self.label)
    if self.pick_value:
        d["pick_value"] = self.pick_value
    return d
```

### Phase 2: Parser Changes (parser.py)

**Fix `get_outputs_for_label()` to handle multiple outputSource:**

```python
def get_outputs_for_label(self, label):
    outputs = []
    for output in self._workflow.tool["outputs"]:
        source = output["outputSource"]
        pick_value = output.get("pickValue")

        # Handle both single and list outputSource
        references = split_step_references(
            source,
            multiple=True,  # Changed from False
            workflow_id=self.cwl_id,
        )

        for step, output_name in references:
            if step == label:
                output_id = output["id"]
                if "#" not in self.cwl_id:
                    _, output_label = output_id.rsplit("#", 1)
                else:
                    _, output_label = output_id.rsplit("/", 1)

                out_dict = {
                    "output_name": output_name,
                    "label": output_label,
                }
                if pick_value:
                    out_dict["pick_value"] = pick_value
                outputs.append(out_dict)
    return outputs
```

This means if a CWL workflow output has `outputSource: [step1/out1, step2/out1]`, then:
- `get_outputs_for_label("step1")` returns `[{"output_name": "out1", "label": "out1", "pick_value": "first_non_null"}]`
- `get_outputs_for_label("step2")` returns `[{"output_name": "out1", "label": "out1", "pick_value": "first_non_null"}]`

Both steps get a `WorkflowOutput` with the same label but pick_value set.

**Also handle input steps:** The CWL output in `cond-wf-003.cwl` references both a step output AND a workflow input (`def`). The `cwl_input_to_galaxy_step()` method already calls `get_outputs_for_label(label)`, so input steps would also get `WorkflowOutput` objects if referenced in a multi-source outputSource. This already works.

### Phase 3: Import Changes (managers/workflows.py)

**Update `__module_from_dict` to read `pick_value`:**

In the workflow_outputs loop (~line 1944-1964), add:

```python
for workflow_output in workflow_outputs:
    if not isinstance(workflow_output, dict):
        workflow_output = {"output_name": workflow_output}
    output_name = workflow_output["output_name"]
    # ... existing validation ...
    uuid = workflow_output.get("uuid", None)
    label = workflow_output.get("label", None)
    m = step.create_or_update_workflow_output(
        output_name=output_name,
        uuid=uuid,
        label=label,
    )
    # NEW: set pick_value
    pick_value = workflow_output.get("pick_value", None)
    if pick_value:
        m.pick_value = pick_value
    if not dry_run:
        trans.sa_session.add(m)
```

**Relax duplicate label check:** Currently `found_output_names` checks for duplicate `output_name` within a step, not duplicate labels across steps. This should be fine — duplicate labels across steps is the whole point.

### Phase 4: Execution Changes (workflow/run.py)

**Add a post-processing step after all steps are scheduled.**

Currently `set_step_outputs()` calls `_record_workflow_output()` for each WorkflowOutput on each step as it completes. For pickValue, we need to defer final output recording until all source steps have completed, then apply pickValue logic.

**Option A: Post-process at invocation completion**

After all steps are scheduled in `WorkflowInvoker.invoke()`, before setting state to SCHEDULED, iterate all workflow outputs with `pick_value` set and apply the logic:

```python
# In WorkflowProgress or WorkflowInvoker, after all steps scheduled:
def apply_pick_value_outputs(self):
    """Post-process workflow outputs that have pick_value set."""
    # Group WorkflowOutput objects by label
    outputs_by_label = defaultdict(list)
    for step in self.workflow_invocation.workflow.steps:
        for wo in step.workflow_outputs:
            if wo.pick_value:
                outputs_by_label[wo.label].append(wo)

    for label, workflow_outputs in outputs_by_label.items():
        pick_value = workflow_outputs[0].pick_value
        values = []
        for wo in workflow_outputs:
            step_outputs = self.outputs.get(wo.workflow_step.id, {})
            output = step_outputs.get(wo.output_name)
            values.append(output)

        result = apply_pick_value(pick_value, values, label)
        # Record the final aggregated output
        # Use the first workflow_output as the "primary" record
        self.workflow_invocation.add_output(
            workflow_outputs[0], workflow_outputs[0].workflow_step, result
        )
```

**The `apply_pick_value` function:**

```python
def apply_pick_value(pick_value, values, label):
    """Apply CWL pickValue semantics to a list of values."""

    def is_null(v):
        # A value is null if it's None, NO_REPLACEMENT,
        # or a hidden empty HDA from a skipped step
        if v is None or v is NO_REPLACEMENT:
            return True
        if isinstance(v, dict) and v.get("__class__") == "NoReplacement":
            return True
        # For HDA outputs from skipped steps:
        if hasattr(v, "dataset") and not v.producing_job_finished:
            # Skipped step - output is null
            return True
        return False

    non_null = [(i, v) for i, v in enumerate(values) if not is_null(v)]

    if pick_value == "first_non_null":
        if not non_null:
            raise FailWorkflowEvaluation(...)  # "All sources are null"
        return non_null[0][1]

    elif pick_value == "the_only_non_null":
        if len(non_null) != 1:
            raise FailWorkflowEvaluation(...)
        return non_null[0][1]

    elif pick_value == "all_non_null":
        return [v for _, v in non_null]  # Return as list/collection
```

**Option B: Modify `_record_workflow_output` to defer pick_value outputs**

In `set_step_outputs()`, when encountering a workflow output with `pick_value` set, don't record it immediately — instead, accumulate it in a `pending_pick_value_outputs` dict. Then at the end of scheduling, resolve them.

This is cleaner because it doesn't double-record outputs.

### Phase 5: Null Detection

The hardest part is reliably detecting "this output is null because the step was skipped."

Currently when a CWL step has `when=False`:
- The tool still executes (with `__when_value__: False`)
- Galaxy creates output HDAs that are empty and hidden
- These are not semantically "null" — they're empty datasets

For pickValue to work correctly, we need to distinguish:
- "Step produced an empty dataset" (not null, just empty)
- "Step was skipped, output is null" (should be null)

**Proposed approach:** Track skipped-step outputs explicitly.

In `set_step_outputs()`, when `progress.when_values == [False]`:
```python
if progress.when_values == [False]:
    for output_name in outputs:
        self._null_outputs[(step.id, output_name)] = True
```

Then in `apply_pick_value`, check `_null_outputs` instead of trying to infer nullness from HDA state.

For **Pattern B** (scatter+pickValue on single source), the null detection is different — individual scatter elements may be null while others are not. The scatter produces a collection, and the collection elements with `when=False` are the null ones. Galaxy already has `skipped` state for collection elements (see migration `c39f1de47a04_add_skipped_state_to_collection_job_`), so this may already work for detecting null elements within a scatter result.

### Phase 6: Pattern B — Scatter + pickValue

For `all_non_null` on a scattered output, the expected behavior is:
- Scatter produces a list collection
- Elements from skipped iterations are null
- `all_non_null` filters out null elements, returning a smaller list

Galaxy represents scatter results as `HistoryDatasetCollectionAssociation` (list collections). The filtered result would be a new collection with only the non-null elements.

This requires:
1. After scatter execution, identify which collection elements came from skipped iterations
2. Create a new filtered collection excluding those elements
3. The filtered collection becomes the workflow output

This is more complex than Pattern A and may warrant a separate implementation phase.

### Phase 7: Export Changes

**Workflow export** (ga format, format2) needs to serialize `pick_value`:

In `_workflow_to_dict_export()` (managers/workflows.py), the workflow_outputs serialization already includes `output_name` and `label`. Add `pick_value`:

```python
# In the step dict construction for export
for workflow_output in step.unique_workflow_outputs:
    wo_dict = {
        "output_name": workflow_output.output_name,
        "label": workflow_output.label,
        "uuid": str(workflow_output.uuid),
    }
    if workflow_output.pick_value:
        wo_dict["pick_value"] = workflow_output.pick_value
```

### Phase 8: should_fail Tests

Several CWL v1.2 tests expect workflow execution to FAIL:
- `first_non_null_all_null` — all sources null, first_non_null should error
- `the_only_non_null_multi_true` — multiple non-null, the_only_non_null should error
- `all_non_null_multi_with_non_array_output` — all_non_null on non-array type should error

These currently pass because the import crashes (so the test "succeeds" as a should_fail). After fixing the import, the pickValue runtime logic must produce the correct errors for these to keep passing.

## Benefit to Galaxy-Native Workflows

Galaxy-native workflows already support `when` expressions (added in 23.0). If pickValue were added to the runtime layer:

1. **Galaxy workflows could express "take first available output"** — e.g., two conditional branches where exactly one runs, merged into a single output via `the_only_non_null`. Currently Galaxy users must use a "pick value" tool or restructure their workflow.

2. **`all_non_null` for filtered scatter results** — Galaxy workflows with conditional scatter could produce filtered output collections.

3. **The UI integration could come later** — the runtime layer would work, and the Galaxy workflow editor could add pickValue configuration in a future release.

4. **Format2 support** — Galaxy's format2 workflow format could natively express pickValue on outputs, making conditional workflow patterns cleaner.

The infrastructure cost is low: one new column, one new post-processing function. The conceptual fit is good since Galaxy already has `when`, `linkMerge`/`merge_type`, and conditional step support.

## Size Estimate

| Component | Effort | Risk |
|-----------|--------|------|
| Model: add column + migration | Small | Low |
| Parser: fix get_outputs_for_label | Small | Low |
| Import: read pick_value from dict | Small | Low |
| Execution: Pattern A (multi-source) | Medium | Medium |
| Execution: null detection | Medium | High |
| Execution: Pattern B (scatter filter) | Large | High |
| Export: serialize pick_value | Small | Low |
| should_fail test compatibility | Small | Low |

**Total: Medium-sized change.** Pattern A (multi-source pickValue) is the primary blocker for most tests. Pattern B (scatter+pickValue) is more complex and could be a separate phase.

## Implementation Order

1. Model + migration (pick_value column on workflow_output)
2. Parser fix (multiple=True in get_outputs_for_label, pass pickValue through)
3. Import fix (read pick_value from workflow dict)
4. Null tracking in execution (when_values==[False] -> mark outputs null)
5. pickValue post-processing in run.py (Pattern A: multi-source)
6. Export serialization
7. Pattern B: scatter + pickValue filtering (separate PR if needed)

## Testing Plan

- **Red-to-green on CWL conformance tests:** The 27 RED tests listed in CWL_CONDITIONALS_STATUS.md are the primary targets.
- **Start with Pattern A tests** (cond-wf-003 through 007 variants): these are the simplest — two sources, one skipped.
- **Then Pattern B tests** (cond-wf-009 through 013): scatter+conditional+pickValue.
- **Verify should_fail tests stay green** after import no longer crashes.
- **Run Galaxy-native workflow tests** to confirm no regressions (the new column and execution logic should be no-ops when pick_value is NULL).

## Review Notes

Reviewed against `CWL_CONDITIONALS_STATUS.md` and source code.

### Factual Corrections

1. **Pattern B scope is wrong.** Plan says Pattern B is "cond-wf-009, 010, 011" but `cond-wf-011` (`conditionals_nested_cross_scatter`) retains null values in nested arrays — `pickValue: all_non_null` applies only at the outermost level. `cond-wf-013` (`conditionals_multi_scatter`) is a Pattern A+B hybrid (multiple outputSource + scatter + linkMerge + pickValue). These are distinct patterns the plan doesn't distinguish.

2. **Step input pickValue is deprioritized.** Grep of all v1.2 conditional test workflows confirms `pickValue` appears ONLY on workflow outputs, never on step inputs. Zero conformance tests exercise it. Deprioritize the `WorkflowStepInput.pick_value` question.

3. **`condifional_scatter_on_nonscattered_false` semantics.** This test expects `out1: []` when ALL scatter elements are skipped. The entire collection is null, not individual elements — different from Phase 6's "filtering null elements from a collection."

### Missing Considerations

4. **SubworkflowStepProxy `when` bug (from status doc).** `SubworkflowStepProxy.to_dict()` does NOT extract `when`. Not a pickValue blocker but a related gap.

5. **Editor duplicate-label warning.** `_workflow_to_dict_editor()` tracks `output_label_index` across steps and flags duplicates as `upgrade_message_dict["output_label_duplicate"]`. CWL-imported workflows with pickValue will trigger this. May need to suppress when `pick_value` is set.

6. **Import `output_name` uniqueness guard.** `workflows.py:1949-1952` raises `ObjectAttributeInvalidException` for duplicate `output_name` within a step. Not triggered for Pattern A (different steps), but an implicit constraint.

### Approach Correctness

7. **Double-recording risk with Option A.** `add_output()` appends without checking for duplicate labels. If `set_step_outputs()` records per-step AND `apply_pick_value_outputs()` records aggregated, there'll be duplicates. **Option B (defer recording) is strongly preferred.**

8. **`all_non_null` list result type.** `apply_pick_value` returns a Python list. `add_output()` dispatches on `history_content_type` — a list has none, so it'd be `WorkflowInvocationOutputValue` (JSON blob). May work for CWL conformance but for Galaxy-native use should be HDCA.

9. **linkMerge + pickValue composition order is answered.** CWL spec: `linkMerge` applies first (merge/flatten), then `pickValue` filters nulls. Plan should incorporate this.

## Unresolved Questions

- How to detect "output is null from skipped step" vs "output is an empty dataset"? The `when_values` tracking is per-invocation, not per-output. Need reliable null marker.
- For Pattern B, should the filtered collection be a new HDCA or should Galaxy support "sparse" collections with null elements?
- Should `pick_value` on `WorkflowOutput` also support step inputs? CWL allows `pickValue` on step inputs too (not just workflow outputs). Galaxy's `WorkflowStepInput` already has `merge_type` — should we add `pick_value` there as well?
- The duplicate-label `WorkflowOutput` approach — will the workflow editor handle two outputs with the same label gracefully, or will it need special-casing?
- For the `all_non_null` mode returning a list: if the original output type is `File` but `all_non_null` returns `File[]`, should this create a list collection? The CWL type system expects this, but Galaxy would need to dynamically produce a collection from scalar outputs.
- Should the `first_non_null`/`the_only_non_null` failures produce CWL-spec-compliant error messages? The spec says specific error conditions for each mode.
- `cond-with-defaults.cwl` uses both `linkMerge: merge_flattened` AND `pickValue: all_non_null` on the same output. How do these compose? Does pickValue operate before or after linkMerge?
