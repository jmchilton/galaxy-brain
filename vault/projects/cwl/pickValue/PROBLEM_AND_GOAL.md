# pick_value Workflow Module: Problem & Goals

## Problem

Galaxy workflows support conditional step execution via `when` expressions (since 23.0). When multiple conditional branches can produce the same logical output, there's no built-in way to say "take whichever branch actually produced a result." Users must manually wire a `pick_value` expression tool to merge conditional outputs — an error-prone workaround that obscures workflow intent.

CWL v1.2 formalizes this pattern with `pickValue` on workflow outputs, supporting three modes: `first_non_null`, `the_only_non_null`, and `all_non_null`. Galaxy cannot import or execute these workflows — 27+ CWL v1.2 conformance tests are RED.

The missing primitive: a workflow-level control flow node that collects outputs from multiple conditional branches and selects among them.

## Goal

Add a `pick_value` workflow module type to Galaxy — a first-class control flow primitive alongside `pause`, input modules, and `when` expressions. It should:

1. **Work for Galaxy-native workflows.** Users can add a pick_value step in the workflow editor, wire N conditional branch outputs as inputs, configure a selection mode, and get one output. No tools required.

2. **Work for CWL.** During CWL import, `pickValue` workflow outputs with multiple `outputSource` entries are translated into pick_value module steps. CWL conformance tests go green.

3. **Target `origin/dev`.** This is a general Galaxy workflow feature, not CWL-specific. It should be upstreamed independently of other CWL work.

## Deliverables

1. **`PickValueModule` class** in `lib/galaxy/workflow/modules.py`, registered in `module_types` dict. Module type: `"pick_value"`. Accepts N inputs, produces 1 output. Selection mode stored in `tool_state`.

2. **Selection modes:**
   - `first_non_null` — return first non-null input (error if all null)
   - `first_or_skip` — return first non-null input; produce a skipped/null output if all null (matches Galaxy's existing `pick_value` tool `first` mode — used by all 60 IWC workflow instances)
   - `the_only_non_null` — return the single non-null input (error if 0 or >1)
   - `all_non_null` — return list of all non-null inputs (as collection for datasets, JSON array for parameters)

3. **Null/skip detection.** The module's `execute()` must reliably distinguish "step was skipped, output is null" from "step produced an empty dataset." Galaxy marks skipped outputs with `blurb = "skipped"`, `extension = "expression.json"`, content = `null`. The module should use these markers.

4. **Editor support.** The module appears in the workflow editor's module palette. Users configure the selection mode and wire inputs. Minimal viable UI — doesn't need to be fancy.

5. **CWL import integration.** `WorkflowProxy.to_dict()` in `parser.py` injects pick_value module steps when CWL workflow outputs have `pickValue` + multiple `outputSource`. The CWL output's `pickValue` maps directly to the module's selection mode. (Out of Scope until CWL Branch Integration)

6. **Scatter + pickValue (Pattern B).** Single-source `outputSource` with `pickValue: all_non_null` on a scattered step — the scatter produces a collection, some elements are skipped, `all_non_null` filters them. The module should handle this by inspecting collection elements for skipped state. (Out of Scope until CWL Branch Integration - but what would this look like in Galaxy?)

7. **Tests.** Galaxy-native workflow tests exercising all four modes. CWL conformance tests going green.

## Stretch Goals

- **`first_or_default` mode.** Like `first_non_null` but falls back to a user-configured default value (stored in `tool_state`) when all inputs are null. Covers IWC's "optional parameter with hardcoded fallback" pattern. Requires type-aware state and editor UI for the default value field — scalar types only (text/int/float/boolean), not datasets. See [TOOL_VS_MODULE_COMPARISON.md](./TOOL_VS_MODULE_COMPARISON.md) for analysis.

## What This Doesn't Include

- CWL export round-trip (pick_value module → CWL `pickValue` syntax). Acceptable loss.
- `pickValue` on CWL step inputs (not just workflow outputs). Zero conformance tests exercise this. Defer.
- `SubworkflowStepProxy` `when` extraction. Related gap, separate fix.

## Dismissed Alternatives

See [DISMISSED_ALTERNATIVES.md](./DISMISSED_ALTERNATIVES.md) — three approaches were evaluated and rejected (synthetic tool insertion, DB column on WorkflowOutput, new join table). The module approach won because it uses existing Galaxy abstractions with no migration and benefits both native and CWL workflows.

## Architecture Notes

**No database migration needed.** The module is a `WorkflowStep` with `type = "pick_value"`. Selection mode stored in `tool_state` JSON. Input connections use existing `WorkflowStepConnection`. Output uses existing `WorkflowOutput`. All existing tables.

**Module registration is one line.** Add `pick_value=PickValueModule` to `module_types` dict in `modules.py` (line ~3273). The `module_factory` singleton picks it up automatically.

**CWL import injection point.** `WorkflowProxy.to_dict()` in `parser.py` (~line 882) builds the step dict. After the existing input + tool step loops, add a loop over `_pick_value_outputs()` that creates step dicts with `"type": "pick_value"`. Wire input connections from source steps. The `get_outputs_for_label()` method skips pickValue outputs (they'll be on the module step instead).

**Execution model.** `PickValueModule.execute()` reads its input connections, checks which are null/skipped, applies the selection mode, and sets the output. Similar to how `PauseModule.execute()` works but with actual computation.

## Relationship to Other CWL Work

This plan is independent of:
- `source_index` on `WorkflowOutput` (output ordering fix — separate migration, separate plan)
- CWL nested_crossproduct scatter support
- CWL record type handling
- CWL subworkflow `when` extraction

It depends on:
- Galaxy's existing `when` expression support (already merged, 23.0+)
- Galaxy's existing skip/null output handling (skipped jobs produce `expression.json` with `null` content)

It unblocks:
- 27+ CWL v1.2 conditional conformance tests
- Galaxy-native workflows with conditional branches merging to a single output
