---
type: research
subtype: component
component: workflow expression evaluation
tags:
  - research/component
  - galaxy/workflows
status: draft
created: 2025-03-21
revised: 2026-04-22
revision: 2
ai_generated: true
summary: "CWL-based workflow expressions evaluated as JavaScript with $job, $self, $runtime variables"
related_notes:
  - "[[Component - CWL Workflow State]]"
  - "[[Dependency - cwl-utils]]"
---

# Galaxy Workflow Expression Evaluation Context

## Overview

Galaxy's workflow expression system is CWL-based (Common Workflow Language v1.2.1). Expressions are JavaScript, evaluated via Node.js using `cwl_utils.expression.do_eval()`. The primary use case in workflow scheduling is **when expressions** (conditional step execution). **value_from expressions** are collected but not currently evaluated in the workflow scheduling function.

## Key Files

| Purpose | Path | Lines |
|---|---|---|
| Expression evaluation entry point | `lib/galaxy/workflow/modules.py` | 257-310 |
| Galaxy-to-CWL type conversion | `lib/galaxy/workflow/modules.py` | 162-239 |
| CWL-to-Galaxy reverse conversion | `lib/galaxy/workflow/modules.py` | 241-254 |
| Evaluation engine wrapper | `lib/galaxy/tools/expressions/evaluation.py` | 21-47 |
| JavaScript VM context | `lib/galaxy/tools/expressions/cwlNodeEngine.js` | 1-46 |
| File properties utility | `lib/galaxy/tool_util/cwl/util.py` | 42-45 |

## Expression Syntax

- `$(expression)` — current CWL expression syntax
- `${expression}` — legacy block syntax (Galaxy 23.0), auto-converted to `$()` at evaluation time

## Available Variables

Galaxy's `cwlNodeEngine.js` defines these globals in the JavaScript VM context:

| Variable | Contents |
|---|---|
| `$job` | All connected step inputs, converted to CWL types |
| `$self` | Current output/step metadata context |
| `$runtime` | Runtime environment info |
| `$tmpdir` | Temporary directory path |
| `$outdir` | Output directory path |

The `inputs` alias (as used in `$(inputs.foo)`) is provided by `cwl_utils.expression.do_eval()` upstream, not by Galaxy's own code. Galaxy passes the `step_state` dict as the `jobinput` parameter, and cwl_utils makes it accessible as both `$job` and `inputs` in the expression context.

In practice, `inputs` is the primary variable used in workflow when expressions.

## Type Mapping: Galaxy to Expression Context

The `to_cwl()` function (modules.py:162-239) converts Galaxy runtime values into CWL types:

| Galaxy Type | Expression Type | Details |
|---|---|---|
| HDA (extension != expression.json) | File object | Has `.path`, `.location`, `.format`, `.basename`, `.nameroot`, `.nameext` |
| HDA (extension == expression.json) | Deserialized JSON | Parsed via `json.load()` — can be any JSON type |
| HDCA (list type) | Array | `[File, File, ...]` recursively converted |
| HDCA (record/other) | Object | `{identifier: File, ...}` keyed by element_identifier |
| NoReplacement sentinel | `null` | Missing optional inputs |
| Text parameter | String | Primitive |
| Integer parameter | Number | Primitive |
| Float parameter | Number | Primitive |
| Boolean parameter | Boolean | `true`/`false` |
| RuntimeValue | `null` | Unresolved runtime values (via `is_runtime_value()` check) |

### File Object Properties

When an HDA is converted to a CWL File object:

```javascript
{
    "class": "File",
    "location": "step_input://N",   // internal reference URI
    "format": "bed",                 // dataset extension
    "path": "/path/to/file.bed",    // filesystem path
    "basename": "file.bed",         // filename with extension
    "nameroot": "file",             // filename without extension
    "nameext": ".bed"               // extension with dot
}
```

Properties set by `set_basename_and_derived_properties()` from `tool_util/cwl/util.py`.

### expression.json Special Handling

Datasets with extension `expression.json` are **not** wrapped as File objects. Instead they are deserialized directly via `json.load()`, allowing structured data (numbers, booleans, objects, arrays, null) to flow between expression-producing and expression-consuming steps.

## Context Construction Flow

`evaluate_value_from_expressions()` (modules.py:257-310):

1. Collect expression mappings — `when_expression` from step, `value_from` from each input
2. If neither exists, return empty dict early (line 268)
3. Build `hda_references` list (tracks HDA objects for round-trip via `step_input://N` URIs)
4. Build `step_state` dict:
   - From `extra_step_state`: each value converted via `to_cwl()`
   - From `execution_state.inputs`: each value converted via `to_cwl()`
5. Call `do_eval(when_expression, step_state)` — JavaScript evaluation
6. Convert result back via `from_cwl()` — resolves `step_input://N` URIs back to HDAs
7. Validate result is boolean (`isinstance(result, bool)`)

Note: `value_from` expressions are collected (line 265) but **not evaluated** in this function. Only `when_expression` is evaluated here. The collected `value_from_expressions` dict is currently unused in this code path.

## when_expression vs value_from

| Aspect | when_expression | value_from |
|---|---|---|
| Scope | Step-level | Per-input |
| Purpose | Conditional execution | Compute input value |
| Return type | **Must be boolean** | Any type |
| Model field | `WorkflowStep.when_expression` | `WorkflowStepInput.value_from` |
| Evaluated in | `evaluate_value_from_expressions()` | **Not evaluated in this function** |

Note: `value_from` is a model field on `WorkflowStepInput` and is collected during expression evaluation setup, but the actual evaluation of value_from expressions does not occur in `evaluate_value_from_expressions()`. This may be handled elsewhere or may be incomplete.

## Dataset Readiness Pre-checks

Before `to_cwl()` deserializes an expression.json or wraps an HDA as a File object, three checks run (modules.py:176-191):

1. **`in_ready_state()`** — NOT in {NEW, UPLOAD, QUEUED, RUNNING, SETTING_METADATA}. If not ready → `DelayedWorkflowEvaluation` (retry later)
2. **`is_ok`** — state must be specifically OK. If ready but not ok → `FailWorkflowEvaluation` with `InvocationFailureDatasetFailed`
3. **`purged`** — dataset must not be purged → `FailWorkflowEvaluation` with `InvocationFailureDatasetFailed`

## Error Handling

| Condition | Exception | Invocation Failure Reason |
|---|---|---|
| Expression syntax error | `FailWorkflowEvaluation` | `expression_evaluation_failed` (details hidden for security) |
| When result not boolean | `FailWorkflowEvaluation` | `when_not_boolean` (includes actual type name) |
| Dataset not ready | `DelayedWorkflowEvaluation` | Step delayed, retried next iteration |
| Dataset failed/purged | `FailWorkflowEvaluation` | `dataset_failed` |

Security note: expression evaluation failure details are not exposed to users to avoid leaking secrets that may appear in expressions.

## HDA Reference System

The `step_input://N` URI scheme enables serialization while maintaining object identity:

- `to_cwl()`: HDAs are assigned `step_input://N` locations and appended to `hda_references` list
- JavaScript evaluates using these URIs as opaque location strings
- `from_cwl()`: File objects with `step_input://` locations are resolved back to the original HDA via `hda_references[N]`

### from_cwl() Limitations

`from_cwl()` (modules.py:241-254) handles:
- **File dicts** with `"class"` and `"location"` keys → resolved via `progress.raw_to_galaxy()`
- **Lists** → recursively converted
- **Primitives** (strings, numbers, booleans, null) → passed through

It does **not** handle arbitrary dict structures — dicts without `"class"` and `"location"` keys raise `NotImplementedError`. This means complex object results from expressions (e.g. `{key: value}`) cannot be converted back to Galaxy types.

## Expression Examples

```javascript
// Boolean conditional — when expression
$(inputs.should_run)

// Static skip
$(false)

// Access file properties
$(inputs.input_file.basename)
$(inputs.input_file.nameroot)

// Block expression with computation
${return parseInt($job.input1)}

// Nested property access on deserialized expression.json
$(inputs.param_output)  // if expression.json contains {"value": 42}, this is {"value": 42}
```

## JavaScript Engine Details

- Engine: Node.js via `cwlNodeEngine.js` (46 lines)
- Isolation: `vm.runInNewContext()` — isolated V8 VM context
- Block expressions (`${...}`): wrapped as IIFE `{return function() {...}();}`
- Inline expressions (`$(...)`): wrapped as `{return expression;}`
- `InlineJavascriptRequirement` can provide `expressionLib` — additional JS prepended before evaluation
- CWL version: v1.2.1
