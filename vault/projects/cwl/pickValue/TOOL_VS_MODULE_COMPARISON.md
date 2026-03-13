# pick_value: Tool vs Module Comparison

## What the Existing Tool Does

`pick_value` (expression tool, `tools/expression_tools/pick_value.xml`, v0.1.0 bundled / v0.2.0 on toolshed) is a JS expression tool that takes N optional inputs via a `pick_from` repeat and returns a single scalar.

**4 modes:**

| Mode | Behavior |
|---|---|
| `first` | Return first non-null, silent null if all null |
| `first_or_default` | Return first non-null, fall back to literal default |
| `first_or_error` | Return first non-null, error if all null |
| `only` | Return the single non-null, error if 0 or >1 |

**5 types:** `data`, `text`, `integer`, `float`, `boolean`

**Limitations:**
- Always returns a scalar. Cannot return arrays or collections.
- Expression tools cannot produce output collections (`ExpressionTool.parse_outputs()` enforces this).
- Requires JS runtime.
- Wiring is painful: nested conditionals in `tool_state` (`style_cond|type_cond|pick_from_N|value`), `__current_case__` indices, repeat entries.
- Type must be declared up-front — can't be polymorphic.

## How IWC Workflows Use the Tool Today

60 instances across 17 IWC workflows. **Every single one uses `first` mode.** Two dominant patterns:

### Pattern 1: Conditional branch selection (data type)
Two upstream steps produce the same logical output under different conditions. `pick_value` selects whichever ran.
```
step_A (when: X) ──► pick_value (first) ──► downstream
step_B (when: !X) ─┘
```
Used in: VGP assembly (29 instances), transcriptomics, scRNAseq, bacterial genomics.

### Pattern 2: Parameter with fallback default (integer/float type)
An optional workflow input provides a parameter. If user doesn't supply it, fall back to a hardcoded literal.
```
optional_input ──► pick_value (first, pick_from: [ConnectedValue, "3"]) ──► tool param
```
Used in: VGP assembly, microbiome, scRNAseq. Typical defaults: integers (3, 200, 2500), floats (1.0).

### What's NOT used in IWC
- `first_or_error` — zero uses
- `first_or_default` — zero uses (Pattern 2 achieves this via literal in `pick_from`)
- `only` — zero uses
- `all_non_null` — doesn't exist in tool
- More than 2 inputs — rare, most are exactly 2

## What the Module Would Cover

### Direct replacements for existing tool modes

| Tool mode | Module mode | Notes |
|---|---|---|
| `first_or_error` | `first_non_null` | Identical semantics |
| `only` | `the_only_non_null` | Identical semantics |
| `first` | `first_non_null` | Tool returns null on all-null; module errors. See below. |
| `first_or_default` | — | No direct equivalent. See below. |

### New capability: `all_non_null`
Impossible with the tool. The module can return a dataset collection (list HDCA) or JSON array. Enables:
- CWL `all_non_null` conformance (both `string[]` and `File[]` outputs)
- Galaxy-native "collect all successful branch outputs" pattern

### New capability: Collection filtering (Pattern B)
Single input that's a collection with skipped elements → filter out nulls → produce filtered collection. Not a multi-source problem — it's a collection-level operation. The tool can't do this at all.

## Gaps: What the Module Doesn't Cover (Yet)

### Gap 1: Silent null on all-null (`first` mode)
IWC's dominant pattern. All 60 IWC uses are `first` — return first non-null, return null silently if all null. The module's `first_non_null` errors on all-null (matching CWL spec).

**Options:**
- A. Add a `first_non_null_or_skip` mode that produces a skipped/null output when all inputs are null. This preserves downstream skip propagation — the module's output becomes null, and any step consuming it can itself be skipped or handle null.
- B. Argue this gap doesn't matter for the module's initial scope. IWC workflows using `first` typically have mutually exclusive `when` conditions — one branch always runs, so all-null never happens in practice. The error mode is safer.
- C. Add a `first_or_skip` mode later as a follow-up if real workflows need it.

**Recommendation:** Start with `first_non_null` (errors on all-null). Add `first_or_skip` later if IWC migration demands it. In practice, IWC's conditional branches are mutually exclusive so the error case never fires.

### Gap 2: Fallback to literal default (`first_or_default`)
Pattern 2 (parameter + hardcoded fallback) is common in IWC. The module as scoped takes N wired connections. A literal default would need to be stored in `tool_state` somehow.

**Options:**
- A. Don't cover this in the module. Pattern 2 is really "optional parameter with default" — a different UX concept than "pick among conditional branches." Users can keep using the tool for this.
- B. Add a `default_value` field to `tool_state` that's used when all inputs are null. Adds complexity but covers the pattern.
- C. Users wire a `parameter_input` module with the default value as a source — no module change needed, just one extra step.

**Recommendation:** Don't cover this initially. Pattern 2 is semantically different from conditional branch merging. Galaxy should arguably have better "optional input with default" support at the workflow input level rather than bolting it onto pick_value.

### Gap 3: Type declaration
The tool requires declaring the output type (`data`, `text`, `integer`, `float`, `boolean`). The module could either:
- Infer type from connected inputs (preferred — less config, less error-prone)
- Require explicit type selection like the tool

**Recommendation:** Infer from inputs. The module sees real `WorkflowStepConnection` objects at execution time and can propagate type from the non-null input.

## Extended Galaxy Use Cases

Beyond replacing the tool 1:1, the module opens up patterns that are currently impossible or awkward:

### 1. Editor-native conditional merging
Today: users must find the pick_value tool, understand its nested conditional parameters, wire it correctly. Error-prone.
Module: drag "Pick Value" from the module palette, wire branches, pick a mode from a dropdown. Same UX as adding a pause or input module.

### 2. Collect all successful outputs as a collection
`all_non_null` mode producing an HDCA. Example: run the same analysis 3 ways with different parameters (each conditional on input characteristics), collect all that succeeded into a list for comparison. Currently impossible without custom tooling.

### 3. Filter skipped elements from scattered collections
A scattered step where some elements are skipped (via `when`) produces a collection with null elements. `all_non_null` on a single collection input filters these out. Currently requires a custom tool or post-hoc filtering.

### 4. Validation mode for exclusive branches
`the_only_non_null` as a runtime assertion that exactly one branch fired. Catches workflow logic bugs where conditions overlap. No IWC workflow uses `only` today, but it's valuable for correctness in complex conditional workflows.

### 5. Multi-way conditional (>2 branches)
The tool handles N inputs via repeats, but wiring is painful. The module with N input terminals and visual editor support makes 3+ branch merging practical.

## Migration Path for IWC Workflows

IWC workflows could migrate from the tool to the module, but this isn't required or urgent:

1. **Pattern 1 (branch selection):** Direct replacement — swap tool step for module step, mode `first_non_null`. Works as long as branches are truly mutually exclusive (they are in practice).
2. **Pattern 2 (parameter fallback):** Keep using the tool, or wire a default via a parameter_input module + `first_non_null`. Not a natural fit for the module.

Migration would be a separate effort and shouldn't block the module's initial release.

## Summary

| Capability | Tool | Module |
|---|---|---|
| First non-null (error on all-null) | `first_or_error` | `first_non_null` |
| Only non-null | `only` | `the_only_non_null` |
| First non-null (silent null) | `first` | Gap — add later if needed |
| First non-null with default | `first_or_default` | Gap — different concern |
| All non-null (array/collection) | Impossible | `all_non_null` |
| Collection element filtering | Impossible | `all_non_null` on single collection |
| Editor-native UX | No (tool params) | Yes (module palette) |
| Type inference | No (manual selection) | Yes (from connections) |
| JS runtime required | Yes | No |
| CWL pickValue import | Fragile (synthetic tool) | Native (module type) |
