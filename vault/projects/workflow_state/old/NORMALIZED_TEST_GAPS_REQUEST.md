# Request: New gxformat2 Test Fixtures + Expectations for Normalized Workflow Gaps

Context: The TS `galaxy-tool-util` project has a declarative test runner that consumes YAML expectation files from gxformat2's `examples/expectations/` and fixture workflows from `examples/format2/`. After implementing `normalizedFormat2`, a review identified several normalization rules that lack test coverage. This document requests new synthetic fixtures + expectation entries to close those gaps.

## How the test system works

- **Fixtures**: YAML workflow files in `gxformat2/examples/format2/synthetic-*.gxwf.yml`
- **Expectations**: YAML files in `gxformat2/examples/expectations/*.yml`, keyed by test ID, each specifying `fixture`, `operation`, and `assertions` (path-based navigation + value/value_set/value_contains checks)
- **Operations**: `normalized_format2`, `normalized_native`, `expanded_format2`, etc.
- **Synced to TS**: via `make sync-workflow-fixtures sync-workflow-expectations`

## Requested test cases

### 1. `doc` array joining

**Why**: Format2 `doc` field accepts `string | string[]`. The normalizer joins arrays with `\n`. No current fixture exercises this.

**Fixture**: `synthetic-doc-array.gxwf.yml`
```yaml
class: GalaxyWorkflow
doc:
  - "First line."
  - "Second line."
inputs:
  x: data
outputs: {}
steps: {}
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_doc_array_joined:
  fixture: synthetic-doc-array.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [doc]
      value_contains: "First line."
    - path: [doc]
      value_contains: "Second line."
```

---

### 2. Input type alias `data_input` -> `data`

**Why**: The normalizer maps `data_input` -> `data` but no fixture uses this alias.

**Fixture**: `synthetic-input-type-aliases.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  file_input:
    type: data_input
  collection_input:
    type: data_collection
outputs: {}
steps: {}
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_input_type_alias_data_input:
  fixture: synthetic-input-type-aliases.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [inputs, {id: file_input}, type_]
      value: data
    - path: [inputs, {id: collection_input}, type_]
      value: collection
```

---

### 3. Input type alias `File` -> `data` (explicit assertion)

**Why**: `synthetic-basic.gxwf.yml` uses `type: File` but the existing expectations don't assert the resolved type value.

**Expectation** (add to `normalized_format2.yml`, uses existing `synthetic-basic.gxwf.yml`):
```yaml
test_input_type_alias_file:
  fixture: synthetic-basic.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [inputs, 0, type_]
      value: data
```

Note: verify `synthetic-basic.gxwf.yml` actually has `type: File` on its input. If not, either add it to the `synthetic-input-type-aliases.gxwf.yml` fixture above or create a separate one.

---

### 4. Step `out` string shorthand expansion

**Why**: Format2 step `out` can be a list of strings (shorthand for `{id: string}`). No fixture exercises this.

**Fixture**: `synthetic-step-out-shorthand.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  x: data
outputs:
  final_output:
    outputSource: step1/out1
steps:
  step1:
    tool_id: cat1
    in:
      input1: x
    out:
      - out1
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_step_out_shorthand_expanded:
  fixture: synthetic-step-out-shorthand.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [steps, 0, out, $length]
      value: 1
    - path: [steps, 0, out, 0, id]
      value: out1
```

---

### 5. Dict-form outputs with content

**Why**: All existing fixtures use `outputs: {}`. No test verifies non-empty output normalization.

**Fixture**: `synthetic-outputs-dict.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  x: data
outputs:
  final_output:
    outputSource: step1/out_file1
steps:
  step1:
    tool_id: cat1
    in:
      input1: x
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_outputs_dict_to_list:
  fixture: synthetic-outputs-dict.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [outputs, $length]
      value: 1
    - path: [outputs, 0, id]
      value: final_output
    - path: [outputs, 0, outputSource]
      value: step1/out_file1
```

---

### 6. Array-form inputs (non-dict)

**Why**: All existing fixtures use dict-form inputs. The normalizer also handles array-form but it's untested.

**Fixture**: `synthetic-inputs-array.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  - id: x
    type: data
    label: "My Input"
outputs: {}
steps: {}
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_inputs_array_form:
  fixture: synthetic-inputs-array.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [inputs, $length]
      value: 1
    - path: [inputs, 0, id]
      value: x
    - path: [inputs, 0, label]
      value: "My Input"
```

---

### 7. Format2 `tool_state` JSON parsing

**Why**: Format2 steps can have `tool_state` as a JSON string (Galaxy export format). The normalizer parses it but no fixture exercises this.

**Fixture**: `synthetic-tool-state-json.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  x: data
outputs: {}
steps:
  step1:
    tool_id: cat1
    tool_state: '{"input1": "value1", "num_lines": 5}'
    in:
      input1: x
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_tool_state_json_parsed:
  fixture: synthetic-tool-state-json.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [steps, 0, tool_state, num_lines]
      value: 5
```

---

### 8. Tags on format2 workflows

**Why**: Format2 schema supports `tags` but no fixture uses them.

**Fixture**: `synthetic-tags.gxwf.yml`
```yaml
class: GalaxyWorkflow
tags:
  - genomics
  - testing
inputs:
  x: data
outputs: {}
steps: {}
```

**Expectation** (in `normalized_format2.yml`):
```yaml
test_tags_present:
  fixture: synthetic-tags.gxwf.yml
  operation: normalized_format2
  assertions:
    - path: [tags, $length]
      value: 2
    - path: [tags, 0]
      value: genomics
```

---

### 9. `$link` resolution (if in scope for `normalized_format2`)

**Why**: The plan lists `$link` resolution as a normalized-level concern. Python `gxformat2` may handle this at a different level — please confirm. If `$link` is resolved during normalization:

**Fixture**: `synthetic-link-resolution.gxwf.yml`
```yaml
class: GalaxyWorkflow
inputs:
  x: data
outputs: {}
steps:
  step1:
    tool_id: cat1
    state:
      input1:
        $link: x
```

**Expectation** (TBD — depends on what `$link` resolution looks like in the normalized output. If it produces a ConnectedValue marker, define what that looks like and assert on it.)

---

## Summary table

| # | Gap | New fixture? | Expectation file |
|---|-----|-------------|-----------------|
| 1 | doc array joining | `synthetic-doc-array.gxwf.yml` | `normalized_format2.yml` |
| 2 | `data_input`/`data_collection` aliases | `synthetic-input-type-aliases.gxwf.yml` | `normalized_format2.yml` |
| 3 | `File` alias explicit assertion | existing `synthetic-basic.gxwf.yml` | `normalized_format2.yml` |
| 4 | step `out` string shorthand | `synthetic-step-out-shorthand.gxwf.yml` | `normalized_format2.yml` |
| 5 | dict outputs with content | `synthetic-outputs-dict.gxwf.yml` | `normalized_format2.yml` |
| 6 | array-form inputs | `synthetic-inputs-array.gxwf.yml` | `normalized_format2.yml` |
| 7 | `tool_state` JSON parsing | `synthetic-tool-state-json.gxwf.yml` | `normalized_format2.yml` |
| 8 | tags | `synthetic-tags.gxwf.yml` | `normalized_format2.yml` |
| 9 | `$link` resolution | `synthetic-link-resolution.gxwf.yml` | TBD (confirm scope) |

## Unresolved questions

- Is `$link` resolution a normalized-level or expanded-level concern in gxformat2?
- Should `connectedPaths` (set of step input keys) and `knownLabels` (set of all step/input labels) be computed at the normalized level? If so, need expectations for them too.
- Should the Python-side normalizer match these behaviors, or are the TS expectations testing TS-only normalization? (I assume they should match — the point of the shared expectations is cross-project parity.)
