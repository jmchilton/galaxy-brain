# CWL pickValue via Synthetic pick_value Tool Step

## Problem

CWL v1.2 workflows can declare `pickValue` on workflow outputs with multiple `outputSource` entries. Galaxy crashes at `parser.py:607` because `get_outputs_for_label()` hardcodes `multiple=False`, so `split_step_references()` asserts on multi-element lists. 27 CWL v1.2 conditional conformance tests are red because of this.

## Approach: Synthetic Tool Insertion

During CWL workflow import (`WorkflowProxy.to_dict()`), when a workflow output has `pickValue` + multiple `outputSource`, inject a synthetic `pick_value` tool step that:
1. Receives connections from all the source steps
2. Applies the pickValue logic
3. Produces a single output that becomes the workflow output

This reuses Galaxy's existing `pick_value` expression tool rather than implementing new runtime semantics.

## Research Findings

### Galaxy's Bundled pick_value Tool

**Location:** `tools/expression_tools/pick_value.xml` (v0.1.0, bundled)
**Also at:** toolshed `iuc/pick_value` (v0.2.0, adds `format_source`)

**Tool type:** `expression` (ECMAScript 5.1, runs via Galaxy's expression engine, no container needed)

**Parameters:**
- `style_cond.pick_style` — one of: `first`, `first_or_default`, `first_or_error`, `only`
- `style_cond.type_cond.param_type` — one of: `data`, `text`, `integer`, `float`, `boolean`
- `style_cond.type_cond.pick_from` — repeat of `{value: <optional>}` entries

**JS logic summary:**
```javascript
for (var i = 0; i < pickFrom.length; i++) {
    if (pickFrom[i].value !== null) {
        if (pickStyle == 'only' && out !== null) {
            return { '__error_message': 'Multiple null values found, only one allowed.' };
        } else if (out == null) {
            out = pickFrom[i].value;
        }
    }
}
// first_or_default: fall back to default_value
// first_or_error / only: error if out is still null
```

**Outputs:** One of `text_param`, `integer_param`, `float_param`, `boolean_param`, `data_param` (filtered by `param_type`).

**Key:** The tool does NOT have an `all_non_null` mode. It always returns a single value, never an array.

### Mapping CWL pickValue Modes to pick_value Tool

| CWL pickValue | pick_value `pick_style` | Notes |
|---|---|---|
| `first_non_null` | `first_or_error` | CWL spec says error if all null; `first` silently returns null |
| `the_only_non_null` | `only` | Direct match: errors if 0 or >1 non-null |
| `all_non_null` | **NO MATCH** | Returns `string[]`/`File[]` — pick_value can't produce arrays |

#### `first_non_null` Details

CWL spec: "Return first non-null. Error if all null." Maps to `first_or_error`:
- All null -> tool error (matches CWL spec for required outputs)
- For optional outputs: could use `first` (returns null silently)

The `first_non_null_all_null` conformance test has `should_fail: true`, confirming the error behavior.

But there's a subtlety: `cond-wf-003.cwl` has `outputSource: [step1/out1, def]` where `def` is a workflow input with `default: "Direct"`. When `step1` is skipped, the `first_non_null` should return the `def` value. This requires the `def` workflow input to be wired as a `pick_from` input alongside `step1/out1`.

#### `the_only_non_null` Details

Direct match to `only` mode. Errors if 0 non-null or >1 non-null. Conformance tests `pass_through_required_fail`, `the_only_non_null_multi_true` are `should_fail: true`.

#### `all_non_null` Details — THE HARD CASE

CWL `all_non_null` returns an **array** of all non-null values. Example from `cond-wf-007.cwl`:
```yaml
outputs:
  out1:
    type: string[]
    outputSource: [step1/out1, step2/out1]
    pickValue: all_non_null
```

Expected outputs:
- `val=0` (both skipped) -> `out1: []`
- `val=1` (step2 runs) -> `out1: ["bar 1"]`
- `val=3` (both run) -> `out1: ["foo 3", "bar 3"]`

The existing pick_value tool **cannot** do this. It returns a scalar. Options:
1. Extend pick_value tool with an `all_non_null` mode that returns an array/collection
2. Use Galaxy's multi-source-to-collection merging (already exists in `replacement_for_input_connections`)
3. Write a new expression tool specifically for `all_non_null`
4. Handle `all_non_null` as a runtime feature rather than a tool

### How Skipped Step Outputs Work in Galaxy

When `when=False`, the step is skipped via `__when_value__`:

1. `modules.py:2771` — `slice_dict["__when_value__"] = when_value` (False)
2. `execute.py:301` — `skip = slice_params.pop("__when_value__", None) is False`
3. `execute.py:249` — `skip=skip` passed to `handle_single_execution`
4. `actions/__init__.py:794-803` — Job state set to SKIPPED, outputs handled:

```python
if skip:
    job.state = job.states.SKIPPED
    for output_collection in output_collections.out_collections.values():
        output_collection.mark_as_populated()
    ...
    for data in out_data.values():
        data.set_skipped(object_store_populator, replace_dataset=False)
```

5. `model/__init__.py:5249-5265` — `set_skipped()`:
```python
self.extension = "expression.json"
self.state = self.states.OK  # state is OK, not error
self.blurb = "skipped"
self.peek = json.dumps(None)
self.visible = False
# File content is literally: null
with open(self.dataset.get_file_name(), "w") as out:
    out.write(json.dumps(None))
```

**The output HDA exists, has state=OK, but contains `null` JSON and has `expression.json` extension.**

When the pick_value tool receives this HDA as an `optional="true"` `data` input, Galaxy treats it as `null` because the dataset content is `null`. This is confirmed working in existing tests like `test_pick_value_preserves_datatype_and_inheritance_chain`.

### How the Parser Constructs Workflow Dicts

`WorkflowProxy.to_dict()` at `parser.py:700`:

```python
def to_dict(self):
    steps = {}
    step_proxies = self.step_proxies()
    input_connections_by_step = self.input_connections_by_step(step_proxies)
    index = 0
    # First: workflow input steps
    for i, input_dict in enumerate(self._workflow.tool["inputs"]):
        steps[index] = self.cwl_input_to_galaxy_step(input_dict, i)
        index += 1
    # Then: tool/subworkflow steps
    for i, step_proxy in enumerate(step_proxies):
        input_connections = input_connections_by_step[i]
        steps[index] = step_proxy.to_dict(input_connections)
        index += 1
    return {"name": name, "steps": steps, "annotation": ...}
```

Each step dict has `workflow_outputs` list (from `get_outputs_for_label`), which tells Galaxy which step outputs are workflow outputs. Currently `get_outputs_for_label` crashes on multi-source outputs.

### pick_value Usage in Galaxy Tests

Already used extensively in Galaxy workflow tests for conditionals:

- `test_run_workflow_pick_value_bam_pja` — basic pick_value with data
- `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` — pick_value with map-over, `first_or_error` style
- `test_pick_value_preserves_datatype_and_inheritance_chain` — skipped step output -> pick_value -> preserves extension

The input wiring pattern in Galaxy workflows:
```yaml
pick_value:
    tool_id: pick_value
    in:
      style_cond|type_cond|pick_from_0|value:
        source: step1/out1
      style_cond|type_cond|pick_from_1|value:
        source: step2/out1
    tool_state:
      style_cond:
        pick_style: first_or_error
        type_cond:
          param_type: data
          pick_from:
          - value:
            __class__: RuntimeValue
          - value:
            __class__: RuntimeValue
```

## Implementation Plan

### Phase 1: `first_non_null` and `the_only_non_null` via pick_value Tool

These two modes map cleanly to the existing pick_value tool.

#### Step 1: Modify `WorkflowProxy.to_dict()` to detect pickValue outputs

In `parser.py`, scan `self._workflow.tool["outputs"]` for `pickValue` + list `outputSource`:

```python
def _pick_value_outputs(self):
    """Find workflow outputs that need synthetic pick_value steps."""
    pick_value_outputs = []
    for output in self._workflow.tool["outputs"]:
        pick_value = output.get("pickValue")
        output_source = output.get("outputSource")
        if pick_value and isinstance(output_source, list) and len(output_source) > 1:
            pick_value_outputs.append({
                "output": output,
                "pick_value": pick_value,
                "sources": output_source,
            })
    return pick_value_outputs
```

#### Step 2: Generate synthetic pick_value step dicts

For each pickValue output, create a Galaxy step dict for a pick_value tool invocation:

```python
def _make_pick_value_step(self, pv_info, step_index, cwl_ids_to_index):
    pick_value = pv_info["pick_value"]
    sources = pv_info["sources"]
    output = pv_info["output"]

    # Map CWL pickValue to pick_value pick_style
    style_map = {
        "first_non_null": "first_or_error",
        "the_only_non_null": "only",
    }
    pick_style = style_map[pick_value]

    # Determine param_type from CWL output type
    cwl_type = output.get("type", "File")
    param_type = self._cwl_type_to_pick_param_type(cwl_type)

    # Build input_connections from sources
    input_connections = {}
    pick_from_entries = []
    for i, source in enumerate(sources):
        step_name, output_name = split_step_references(
            source, multiple=False, workflow_id=self.cwl_id
        )
        # Resolve step_name to index
        sep_on = "/" if "#" in self.cwl_id else "#"
        output_step_id = self.cwl_id + sep_on + step_name
        source_index = cwl_ids_to_index[output_step_id]

        conn_key = f"style_cond|type_cond|pick_from_{i}|value"
        input_connections[conn_key] = [{
            "id": source_index,
            "output_name": output_name,
            "input_type": "dataset",
        }]
        pick_from_entries.append({
            "__index__": i,
            "value": {"__class__": "RuntimeValue"},
        })

    # Build tool_state
    tool_state = {
        "style_cond": {
            "__current_case__": {"first": 0, "first_or_default": 1,
                                 "first_or_error": 2, "only": 3}[pick_style],
            "pick_style": pick_style,
            "type_cond": {
                "__current_case__": {"data": 0, "text": 1, "integer": 2,
                                     "float": 3, "boolean": 4}[param_type],
                "param_type": param_type,
                "pick_from": pick_from_entries,
            },
        },
    }

    # Output name for pick_value tool depends on param_type
    output_name_map = {
        "data": "data_param",
        "text": "text_param",
        "integer": "integer_param",
        "float": "float_param",
        "boolean": "boolean_param",
    }

    output_label = self.jsonld_id_to_label(output["id"])

    return {
        "id": step_index,
        "tool_id": "pick_value",
        "label": f"__cwl_pick_value_{output_label}",
        "position": {"left": 0, "top": 0},
        "type": "tool",
        "annotation": f"Synthetic pick_value for CWL pickValue: {pick_value}",
        "input_connections": input_connections,
        "tool_state": tool_state,
        "workflow_outputs": [{
            "output_name": output_name_map[param_type],
            "label": output_label,
        }],
    }
```

#### Step 3: Modify `to_dict()` to inject synthetic steps

```python
def to_dict(self):
    name = ...
    steps = {}
    step_proxies = self.step_proxies()
    input_connections_by_step = self.input_connections_by_step(step_proxies)
    index = 0

    for i, input_dict in enumerate(self._workflow.tool["inputs"]):
        steps[index] = self.cwl_input_to_galaxy_step(input_dict, i)
        index += 1

    for i, step_proxy in enumerate(step_proxies):
        input_connections = input_connections_by_step[i]
        steps[index] = step_proxy.to_dict(input_connections)
        index += 1

    # NEW: inject synthetic pick_value steps
    cwl_ids_to_index = self.cwl_ids_to_index(step_proxies)
    for pv_info in self._pick_value_outputs():
        if pv_info["pick_value"] in ("first_non_null", "the_only_non_null"):
            steps[index] = self._make_pick_value_step(pv_info, index, cwl_ids_to_index)
            index += 1

    return {"name": name, "steps": steps, "annotation": ...}
```

#### Step 4: Remove pickValue outputs from original step's `workflow_outputs`

When we create a synthetic pick_value step for a workflow output, we need to ensure the _original_ source steps don't also claim that output as a workflow_output. The `get_outputs_for_label()` method currently assigns workflow outputs to the step they come from. For pickValue outputs, we need to suppress this.

Options:
- Skip pickValue outputs in `get_outputs_for_label()` entirely (they'll be on the synthetic step)
- Or: modify `get_outputs_for_label()` to handle `multiple=True` but still return them, then remove them after synthetic step creation

The cleanest approach: add a check in `get_outputs_for_label()` — if the output has `pickValue`, skip it (it'll be handled by synthetic step).

```python
def get_outputs_for_label(self, label):
    outputs = []
    for output in self._workflow.tool["outputs"]:
        # Skip pickValue outputs — handled by synthetic pick_value steps
        if output.get("pickValue") and isinstance(output.get("outputSource"), list):
            continue
        step, output_name = split_step_references(
            output["outputSource"],
            multiple=False,
            workflow_id=self.cwl_id,
        )
        if step == label:
            ...
    return outputs
```

### Phase 2: `all_non_null` — Requires New/Extended Tool

The existing pick_value tool cannot produce arrays. Options:

#### Option A: Extend pick_value tool with `all_non_null` mode

Add a new `pick_style` value `all` that returns a list collection or JSON array. This is a tool change and would need coordination with the tools-iuc maintainers. The JS expression would be:

```javascript
if (pickStyle == 'all') {
    var result = [];
    for (var i = 0; i < pickFrom.length; i++) {
        if (pickFrom[i].value !== null) {
            result.push(pickFrom[i].value);
        }
    }
    return { 'output': result };
}
```

But expression tools currently can't produce output collections (enforced at `ExpressionTool.parse_outputs()`:  `"Expression tools may not declare output collections at this time."`).

For `File[]` outputs, the result needs to be a dataset collection (list). For `string[]` outputs, it could be an `expression.json` containing a JSON array.

#### Option B: Galaxy multi-source merging as the base

Galaxy already merges multiple connections into collections via `replacement_for_input_connections` in `run.py:466-559`. When multiple connections target a single input, Galaxy creates an `EphemeralCollection` of type `list`.

For `all_non_null`, we could:
1. Let the multiple sources wire directly to a synthetic step that filters nulls
2. Or use a new expression tool that receives the merged collection and filters out null elements

#### Option C: Handle `all_non_null` via runtime/native semantics

Instead of a tool step, implement `all_non_null` as a native workflow output collection mechanism. This would require changes to `modules.py` and `run.py` to collect the workflow outputs, filter nulls, and produce a collection. More invasive but avoids tool limitations.

#### Recommended: Option A (extend pick_value) for scalar types; Option C for File[]

For CWL `string[]` type: an expression tool can return a JSON array in `expression.json`.
For CWL `File[]` type: need collection output, which expression tools can't produce. Must use runtime approach or a different tool type.

However, looking at the conformance tests:
- `cond-wf-005.cwl` has `type: string[]` with `all_non_null` — CWL strings, which in Galaxy are `expression.json` parameters
- `cond-wf-007.cwl` has `type: string[]` with `all_non_null` — same
- `cond-with-defaults.cwl` has `type: File[]` with `all_non_null` — this is the hard case

### Phase 3: `first_non_null` with Workflow Input Sources

`cond-wf-003.cwl` has `outputSource: [step1/out1, def]` where `def` is a workflow input (not a step output). The synthetic pick_value step needs to wire `def`'s output as one of its `pick_from` inputs.

This should work naturally because workflow inputs are represented as input steps in Galaxy with an implicit output named `"output"`. The `cwl_ids_to_index` map already includes input steps. So `split_step_references("def")` returns `("def", "output")` and the index lookup finds the input step.

### CWL Type to pick_value param_type Mapping

```python
def _cwl_type_to_pick_param_type(self, cwl_type):
    """Map CWL type to pick_value param_type."""
    # Handle optional types like ["null", "string"]
    if isinstance(cwl_type, list):
        cwl_type = [t for t in cwl_type if t != "null"][0]
    type_map = {
        "File": "data",
        "string": "text",
        "int": "integer",
        "long": "integer",
        "float": "float",
        "double": "float",
        "boolean": "boolean",
    }
    return type_map.get(cwl_type, "data")
```

### Test Strategy

#### Red-to-green targets (Phase 1):

**`first_non_null` tests:**
- `pass_through_required_false_when` / `_nojs` — `val=1`, step1 skipped, output = `def` = "Direct"
- `pass_through_required_true_when` / `_nojs` — `val=3`, step1 runs, output = step1's output
- `first_non_null_first_non_null` / `_nojs` — two steps, first runs
- `first_non_null_second_non_null` / `_nojs` — two steps, second runs

**`the_only_non_null` tests:**
- `pass_through_required_the_only_non_null` / `_nojs` — single non-null
- `the_only_non_null_single_true` / `_nojs` — single non-null

**`should_fail` tests (already green, must stay green):**
- `first_non_null_all_null` / `_nojs` — all null, should error
- `pass_through_required_fail` / `_nojs` — >1 non-null with `the_only_non_null`
- `the_only_non_null_multi_true` / `_nojs` — >1 non-null

#### Red-to-green targets (Phase 2 — `all_non_null`):

- `all_non_null_all_null` / `_nojs` — empty array result
- `all_non_null_one_non_null` / `_nojs` — single-element array
- `all_non_null_multi_non_null` / `_nojs` — multi-element array

### Risks and Edge Cases

1. **Tool availability:** pick_value must be loaded at workflow import time. It's bundled in `tools/expression_tools/pick_value.xml` but needs to be in the tool panel. Check if CWL workflow import auto-loads tools.

2. **`tool_id` vs `tool_uuid`:** Normal CWL step imports use `tool_uuid` (from the CWL tool proxy). The synthetic step uses `tool_id: "pick_value"` directly. Need to verify the workflow import API accepts `tool_id` for expression tools.

3. **`should_fail` test regression:** Some tests are currently green because the workflow import _crashes_ before execution. With the parser fix, these workflows will import successfully. The `should_fail` tests need the pick_value tool to error during execution, which `first_or_error` and `only` modes do correctly.

4. **`tool_state` format:** The `tool_state` dict format for workflow import API may need JSON encoding or specific `__current_case__` values. The existing Galaxy test examples (shown above) demonstrate the correct format.

5. **CWL outputs referencing workflow inputs as sources:** Works because Galaxy input steps have index entries in `cwl_ids_to_index` and produce output named `"output"`.

6. **Scatter + conditional + pickValue:** `cond-wf-009.cwl` has `outputSource: step1/out1` (single source) with `pickValue: all_non_null`. This is NOT a multi-source case — it's filtering nulls from a scattered step's output array. This may need different handling (the scatter already produces a collection; we need to filter null elements).

7. **`linkMerge: merge_flattened` combined with `pickValue: all_non_null`:** `cond-with-defaults.cwl` uses both. The merge produces a flat list; then all_non_null filters nulls. This interaction adds complexity.

## Review Notes

Reviewed against `CWL_CONDITIONALS_STATUS.md` and actual test file markers.

### Factual Corrections

1. **Test count is wrong.** Plan says "27 CWL v1.2 conditional conformance tests are red." Actual from `test_cwl_conformance_v1_2.py`: 29 red, 17 green (46 total). Status doc also wrong (says 13 green, 27 red). Discrepancies:
   - `all_non_null_all_null` / `_nojs`: status doc lists as GREEN (should_fail), but these are NOT `should_fail` — they expect `out1: []`. They're `@pytest.mark.red`.
   - `condifional_scatter_on_nonscattered_true_nojs`: RED in test file, not listed in status doc.

2. **`get_outputs_for_label` is also called from `cwl_input_to_galaxy_step` (line 746)**, not just tool steps. The Step 4 skip logic handles this correctly since it checks for `pickValue`, but this call path should be noted.

3. **`__current_case__` values verified correct.** `pick_style`: first(0), first_or_default(1), first_or_error(2), only(3). `param_type`: data(0), text(1), integer(2), float(3), boolean(4). Plan's mappings match `pick_value.xml`.

### Approach Correctness

4. **Phase 1 approach is sound.** `first_or_error` and `only` map correctly to CWL semantics. Synthetic step insertion at parse time avoids runtime changes.

5. **`should_fail` regression risk is manageable.** After fix, import succeeds but `first_or_error`/`only` modes error at execution — still counts as failure for `should_fail` tests. Needs verification.

6. **`tool_id` should work.** Workflow import API accepts `tool_id` for Galaxy-native tools. Normal CWL steps use `tool_uuid` (parser.py:1118), but synthetic steps can use `tool_id: "pick_value"` directly.

### Additional Risks

7. **Workflow re-export fidelity.** CWL→Galaxy import creates a real pick_value step. Galaxy→CWL export won't round-trip back to `pickValue` syntax. Acceptable for CWL conformance testing but worth noting.

8. **`pickValue` on step inputs.** CWL spec allows it on step inputs too, not just workflow outputs. Zero conformance tests exercise this, so deprioritize.

## Unresolved Questions

- Does CWL workflow import API accept `tool_id` for non-CWL tools (like `pick_value`), or must we use `tool_uuid`? If the latter, we need to look up or generate a UUID for the bundled pick_value tool.
- Is pick_value always loaded in Galaxy instances that run CWL workflows, or could it be missing?
- For `first_non_null` on an optional CWL output, should we use `first` (returns null) or `first_or_error` (errors)? CWL spec says error for required outputs; spec unclear for optional.
- For `all_non_null` with `File[]` output: should we extend pick_value tool, create a new tool, or implement as runtime logic? Expression tools can't produce collections.
- For `cond-wf-009.cwl` (single-source scatter + `pickValue: all_non_null`): is this a collection-filter problem rather than a multi-source problem? Does the synthetic tool approach apply at all?
- Should the synthetic step label be hidden from the user, or visible? Galaxy has `__` prefix convention for internal steps — does the workflow editor handle this?
- How should `linkMerge` + `pickValue` interaction work? `cond-with-defaults.cwl` uses both. Is `linkMerge` applied before `pickValue`?
