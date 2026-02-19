---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/lib
status: draft
created: 2026-02-19
revised: 2026-02-19
revision: 1
ai_generated: true
component: Format2 Workflows (gxformat2)
galaxy_areas: [workflows, lib]
---

# gxformat2: Parsing and Syntax in Galaxy

How Galaxy parses Format2 (gxformat2) YAML workflows, covering the complete syntax specification, conversion pipeline, and integration points.

## Format Detection

Galaxy detects Format2 workflows through two markers:

1. **`class: GalaxyWorkflow`** — primary marker, checked by `artifact_class()` in `lib/galaxy/managers/executables.py`
2. **`yaml_content`** — secondary marker, indicates wrapped YAML content from a prior export

Detection entry points:
- `artifact_class()` — inspects the dict for `class` field; also handles CWL `$graph` docs by resolving target object by `object_id` (defaults to `"main"`)
- `normalize_workflow_format()` in `WorkflowContentsManager` — triggers conversion when `class == "GalaxyWorkflow"` or `"yaml_content"` exists
- WES service (`lib/galaxy/webapps/galaxy/services/wes.py`) — separate detection via `_determine_workflow_type()`

## Conversion Pipeline

All Format2 workflows are converted to Galaxy native JSON before the import/construction pipeline processes them. The stack never operates on Format2 directly.

```
Format2 YAML dict
  │
  ▼
normalize_workflow_format()                    # lib/galaxy/managers/workflows.py:620
  │
  ├── artifact_class() detects "GalaxyWorkflow"
  │
  ├── Format2ConverterGalaxyInterface()        # line 2273, stub implementation
  ├── ImportOptions(deduplicate_subworkflows=True)
  │
  └── python_to_workflow(as_dict, galaxy_interface,
  │       workflow_directory=..., import_options=...)
  │                                            # gxformat2.converter
  ▼
Native Galaxy JSON dict (same as .ga format)
  │
  ▼
RawWorkflowDescription(as_dict, workflow_path)
  │
  ▼
build_workflow_from_raw_description()          # standard import pipeline
```

`Format2ConverterGalaxyInterface` is a minimal stub — `import_workflow()` raises `NotImplementedError`. Nested Format2 subworkflow imports go through the standard Galaxy recursive build path, not through this interface.

## gxformat2 Converter Internals

Entry point: `python_to_workflow()` in `gxformat2/converter.py`.

### Phase 1 — Graph Preprocessing

`_preprocess_graphs()` handles `$graph` multi-workflow documents:
- Identifies `main` workflow as entry point
- Registers other workflows by their `id` for reference via `#graph_id`
- With `deduplicate_subworkflows=True`, shared subworkflows are stored once in `converted["subworkflows"]`

### Phase 2 — Input Conversion

`convert_inputs_to_steps()` transforms top-level `inputs:` into native input step dicts and prepends them to the step list. Each input becomes a step with a proper `type` (`data_input`, `data_collection_input`, or `parameter_input`).

### Phase 3 — Step Transformation

Per-step dispatch via `transform_{step_type}()`:

| Transform function | Handles |
|---|---|
| `transform_tool()` | Tool steps — resolves `state`/`runtime_inputs`/`tool_state`, builds PJAs from `out` specs |
| `transform_subworkflow()` | Subworkflow steps — recursive conversion via `run_workflow_to_step()` |
| `transform_data_input()` | Dataset input scaffolding |
| `transform_data_collection_input()` | Collection input scaffolding |
| `transform_parameter_input()` | Parameter input scaffolding |
| `transform_pause()` | Pause/review step scaffolding |

`ConversionContext` tracks label→step_id mappings. `SubworkflowConversionContext` delegates graph-level state to parent.

### Phase 4 — Connection Population

`_populate_input_connections()` converts CWL-style `in`/`connect` references to native `input_connections` with numeric step IDs. Handles:
- Simple references: `step_name` → default output
- Qualified references: `step_name/output_name`
- Array sources: `[step1/out, step2/out]`
- `$link` directives in `state` — replaced with `{"__class__": "ConnectedValue"}`

### Phase 5 — Output Processing

Maps `outputs[].outputSource` → `workflow_outputs` entries on target steps.

## Complete Format2 Syntax

### Workflow Root

```yaml
class: GalaxyWorkflow               # REQUIRED — format marker
label: "My Workflow"                # workflow name (also accepts legacy `name`)
doc: "Description of workflow"      # documentation (also accepts `annotation`)
format-version: v2.0                # optional, defaults to v2.0

inputs:   { ... }                   # workflow inputs
outputs:  { ... }                   # workflow outputs
steps:    { ... }                   # workflow steps

# Metadata
tags: [genomics, rna-seq]
uuid: "xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx"
license: "MIT"                      # SPDX identifier
release: "0.1.14"
creator:
  - class: Person
    name: Jane Doe
    identifier: "https://orcid.org/0000-0001-2345-6789"
  - class: Organization
    name: Example Lab

# Report template
report:
  markdown: |
    # Workflow Report
    ```galaxy
    history_dataset_as_image(output="plot")
    ```
```

### Inputs

Inputs can be a dict (keyed by label) or a list (with explicit `id` fields).

#### Shorthand Forms

```yaml
inputs:
  my_dataset: data                  # dataset input
  my_collection: collection         # collection input
  my_text: text                     # text parameter
  my_int: integer                   # integer parameter
  my_float: float                   # float parameter
  my_bool: boolean                  # boolean parameter
  my_color: color                   # color picker
  multi_text: [string]              # array of strings
```

#### Expanded Forms

```yaml
inputs:
  aligned_reads:
    type: data                      # or File (alias)
    doc: "Aligned reads in BAM format"
    optional: false
    format: bam                     # single format
    # format: [bam, sam]            # or list of formats

  paired_fastqs:
    type: collection                # or data_collection
    collection_type: "list:paired"  # list, paired, list:paired, list:list
    optional: false

  num_lines:
    type: integer                   # or int
    default: 5
    optional: true

  seed_text:
    type: text                      # or string
    default: "hello"
    restrictions: ["opt1", "opt2", "opt3"]  # dropdown values

  sample_sheet_input:
    type: data_collection
    collection_type: sample_sheet
    column_definitions:
      - name: treatment
        type: string
        default_value: control
        restrictions: [treatment, control]
```

#### Type Aliases

| Format2 type | Native type | Notes |
|---|---|---|
| `data`, `File` | `data_input` | Dataset |
| `collection`, `data_collection` | `data_collection_input` | Collection |
| `string`, `text` | `parameter_input` | `parameter_type: "text"` |
| `int`, `integer` | `parameter_input` | `parameter_type: "integer"` |
| `float` | `parameter_input` | `parameter_type: "float"` |
| `boolean` | `parameter_input` | `parameter_type: "boolean"` |
| `color` | `parameter_input` | `parameter_type: "color"` |
| `[type]` | `parameter_input` | `multiple: true` in tool_state |

#### List Form

```yaml
inputs:
  - id: the_input
    type: data
  - id: the_param
    type: integer
    default: 5
```

### Outputs

Outputs declare which step outputs are workflow-level results.

```yaml
outputs:
  trimmed_reads:
    outputSource: cutadapt/out_pairs
  quality_report:
    outputSource: fastqc/html_file
```

- `outputSource: step_label/output_name` — qualified reference
- `outputSource: step_label` — defaults to first/primary output
- Legacy `source` key also accepted

### Steps

Steps can be a dict (keyed by label) or a list (with explicit `id` fields). Dict form is standard.

#### Tool Steps

```yaml
steps:
  trim_reads:
    tool_id: toolshed.g2.bx.psu.edu/repos/lparsons/cutadapt/cutadapt/4.4+galaxy0
    tool_version: "4.4+galaxy0"                  # optional
    tool_shed_repository:                         # optional, for Tool Shed provenance
      changeset_revision: 8c0175e03cee
      name: cutadapt
      owner: lparsons
      tool_shed: toolshed.g2.bx.psu.edu
    doc: "Trim adapters and low-quality bases"    # optional
    position: {left: 400, top: 200}               # optional, editor layout

    in:                                            # input connections
      library|input_1: raw_reads
      anno|reference: annotation_file

    state:                                         # tool parameter values
      adapter_options:
        action: trim
      quality_cutoff: 20

    out:                                           # output actions (PJAs)
      out_pairs:
        rename: "Trimmed Reads"
      report:
        hide: true

    runtime_inputs:                                # runtime-settable params
      - quality_cutoff
```

#### Input Connections (`in`)

Three syntactic forms, all equivalent:

**Simple reference (shorthand):**
```yaml
in:
  input1: upstream_step                    # default output of step
  input2: upstream_step/specific_output    # qualified output
```

**Source dict:**
```yaml
in:
  input1:
    source: upstream_step/output_name
  input2:
    source: upstream_step                  # default output
    default: fallback_value                # default if disconnected
```

**Multiple sources (multi-data inputs):**
```yaml
in:
  input1:
    source:
      - step1/output
      - step2/output
```

**Nested parameter addressing** uses pipe notation inherited from Galaxy's tool form hierarchy:
```yaml
in:
  "library|input_1": raw_reads             # section.param
  "seed_source|seed": seed_input           # conditional.param
  "queries_0|input2": extra_data           # repeat[0].param
```

#### Alternative Connection Syntax: `connect`

The `connect` key is equivalent to `in` but coexists for backward compatibility:

```yaml
steps:
  my_step:
    tool_id: cat1
    connect:
      input1: upstream/output
```

Both `in` and `connect` are merged during conversion. Connections from `connect` and `in` are combined.

#### Tool State (`state`)

Structured tool parameters. Preferred over `tool_state` for human readability:

```yaml
state:
  simple_param: value
  nested:
    conditional_selector: option_a
    nested_param: value
  repeat_param:
    - element1
    - element2
  connected_input:
    $link: upstream_step/output            # connection via $link
```

`$link` directives are replaced with `{"__class__": "ConnectedValue"}` in the native conversion and the connection is recorded in `input_connections`.

**`$link` vs `in`**: Both create connections, but `$link` lives inside `state` (useful for deeply nested tool params), while `in` is top-level on the step.

**`tool_state`**: Low-level alternative — JSON-encoded strings per parameter, matching native format exactly. Cannot be used simultaneously with `state`.

#### Runtime Inputs

```yaml
steps:
  my_step:
    tool_id: random_lines1
    runtime_inputs:
      - num_lines                          # these become RuntimeValue markers
    state:
      num_lines: 1                         # default value (overridden at runtime)
```

Params listed in `runtime_inputs` get `{"__class__": "RuntimeValue"}` in the native tool_state.

#### Post-Job Actions (`out`)

```yaml
out:
  output_name:
    hide: true                             # HideDatasetAction
    rename: "New Name"                     # RenameDatasetAction
    change_datatype: fasta                 # ChangeDatatypeAction
    delete_intermediate_datasets: true     # DeleteIntermediatesAction
    add_tags: [tag1, tag2]                 # TagDatasetAction
    remove_tags: [old_tag]                 # RemoveTagDatasetAction
    set_columns: [col1, col2, col3]        # ColumnSetAction
```

PJA mapping:

| Format2 key | Native Galaxy PJA |
|---|---|
| `hide` | `HideDatasetAction` |
| `rename` | `RenameDatasetAction` |
| `change_datatype` | `ChangeDatatypeAction` |
| `delete_intermediate_datasets` | `DeleteIntermediatesAction` |
| `add_tags` | `TagDatasetAction` |
| `remove_tags` | `RemoveTagDatasetAction` |
| `set_columns` | `ColumnSetAction` |

#### Pause Steps

```yaml
steps:
  review_qc:
    type: pause
    in:
      input: upstream_step/output
```

#### Conditional Execution (`when`)

```yaml
steps:
  conditional_step:
    tool_id: some_tool
    when: "$(inputs.run_this != 'skip')"   # ECMAScript 5.1 expression
    in:
      run_this: boolean_input
      data_input: upstream/output
```

The `when` expression is evaluated at runtime. If it evaluates to false, the step and downstream dependents are skipped.

### Subworkflows

Three mechanisms:

#### Inline Subworkflow

```yaml
steps:
  nested:
    run:
      class: GalaxyWorkflow
      inputs:
        inner_input: data
      outputs:
        inner_output:
          outputSource: inner_step/out_file1
      steps:
        inner_step:
          tool_id: cat1
          in:
            input1: inner_input
    in:
      inner_input: outer_step/output
```

#### External File Import

```yaml
steps:
  nested:
    run:
      "@import": ./path/to/subworkflow.gxwf.yml
    in:
      input_name: upstream/output
```

Resolved relative to `workflow_directory`.

#### `$graph` Multi-Workflow Document

```yaml
$graph:
  - id: helper_workflow
    class: GalaxyWorkflow
    inputs:
      helper_input: data
    outputs:
      helper_output:
        outputSource: step/output
    steps:
      step:
        tool_id: cat1
        in:
          input1: helper_input

  - id: main
    class: GalaxyWorkflow
    inputs:
      the_input: data
    outputs:
      the_output:
        outputSource: nested/helper_output
    steps:
      nested:
        run: "#helper_workflow"
        in:
          helper_input: the_input
```

`main` is the entry point. Other workflows are referenced by `#graph_id`. With `deduplicate_subworkflows=True` (Galaxy's default), shared subworkflows are stored once in the converted output's `subworkflows` map.

### Report Template

```yaml
report:
  markdown: |
    # Analysis Report

    ## Inputs
    ```galaxy
    invocation_inputs()
    ```

    ## Results
    ```galaxy
    history_dataset_as_image(output="plot")
    ```

    ```galaxy
    history_dataset_as_table(output="counts")
    ```
```

Galaxy template directives supported:
- `invocation_inputs()`, `invocation_outputs()`
- `history_dataset_display(output="...")`, `history_dataset_as_image(output="...")`
- `history_dataset_as_table(output="...")`, `history_dataset_peek(output="...")`
- `history_dataset_info(input="...")`, `history_dataset_collection_display(input="...")`
- `workflow_display()`
- `job_parameters(step="...")`, `job_metrics(step="...")`
- `tool_stdout(step="...")`, `tool_stderr(step="...")`

## Export Path (Native → Format2)

Galaxy can export native workflows back to Format2 via `from_galaxy_native()`:

```python
# lib/galaxy/managers/workflows.py
wf_dict = self._workflow_to_dict_export(trans, stored_workflow, workflow=workflow)
wf_dict = from_galaxy_native(wf_dict, None, json_wrapper=True)
f.write(wf_dict["yaml_content"])
```

Export artifacts produced by `store_workflow_artifacts()`:

| File | Format | Method |
|---|---|---|
| `name.ga` | Native Galaxy JSON | `json.dump(wf_dict)` |
| `name.gxwf.yml` | Format2 YAML | `from_galaxy_native()` |
| `name.abstract.cwl` | CWL v1.2 abstract | `from_dict()` from `gxformat2.abstract` |
| `name.html` | Cytoscape visualization | `to_cytoscape()` (optional, may fail) |

API export styles:
- `style="export"` or `style="ga"` → native JSON
- `style="format2"` → Format2 dict
- `style="format2_wrapped_yaml"` → `{"yaml_content": "<yaml>"}`

The reverse conversion (`from_galaxy_native()` in `gxformat2/export.py`) iterates native steps and dispatches by module type:
- `data_input`/`data_collection_input`/`parameter_input` → Format2 `inputs:` entries
- `tool` → step dict with `tool_id`, recovered `state` (parsed from JSON string)
- `subworkflow` → recursive call, result embedded as `run:`
- `pause` → step with `type: pause`

Connections are reversed from native `input_connections` to CWL-style `in:` dicts. PJAs are reversed to `out:` specs.

## Schema Validation

Format2 workflows are validated against a schema-salad schema (v19.09):

```python
from gxformat2.lint import lint_format2, lint_ga
from gxformat2.linting import LintContext

ctx = LintContext()
lint_format2(ctx, workflow_dict, path="/path/to/workflow.gxwf.yml")
ctx.print_messages()
```

Checks performed:
- Structural correctness via schema-salad validation
- Required keys (`class`, `steps`, `outputs`)
- Workflow outputs exist and have labels
- Step errors (tool not installed warnings)
- Report markdown validity
- Input default type validation (e.g., string default for integer input = error)
- PJA type validation (e.g., `hide: "moocow"` = error, must be bool)

Exit codes: `0` success, `1` warnings, `2` errors, `3` parse failure.

## Normalization Layer

`gxformat2/normalize.py` provides format-agnostic views:

- `steps_normalized()` — all steps (inputs + tool/subworkflow) as a flat normalized list
- `inputs_normalized()` — just input steps
- `outputs_normalized()` — just outputs
- `NormalizedWorkflow` — deep-copies and normalizes: replaces anonymous output references, ensures implicit `out` dicts

This layer is used by the abstract CWL export and the Cytoscape visualization to work with a uniform step representation regardless of input format.

## Legacy Syntax Notes

| Legacy | Modern | Notes |
|---|---|---|
| `name` | `label` | Workflow name |
| `outputs` (step-level) | `out` | Step output actions |
| `source` | `outputSource` | Workflow output reference |
| `step#output` | `step/output` | Connection syntax (opt-in via `GXFORMAT2_SUPPORT_LEGACY_CONNECTIONS=1`) |
| List-format inputs with `id` | Dict-format inputs | Both supported |
| List-format steps with `id` | Dict-format steps | Both supported |

## File Index

| Component | File |
|---|---|
| Format detection | `lib/galaxy/managers/executables.py` — `artifact_class()` |
| Conversion orchestration | `lib/galaxy/managers/workflows.py` — `normalize_workflow_format()` |
| Galaxy interface stub | `lib/galaxy/managers/workflows.py` — `Format2ConverterGalaxyInterface` |
| Format2→native converter | `gxformat2/converter.py` — `python_to_workflow()` |
| Native→Format2 exporter | `gxformat2/export.py` — `from_galaxy_native()` |
| Type system / model | `gxformat2/model.py` — type aliases, connection handling, input conversion |
| Normalization | `gxformat2/normalize.py` — format-agnostic views |
| Schema validation | `gxformat2/lint.py` + `gxformat2/schema/v19_09/` |
| Abstract CWL export | `gxformat2/abstract.py` — `from_dict()` |
| YAML utilities | `gxformat2/yaml.py` — `ordered_load()`, `ordered_dump()` |
| Test fixtures (gxformat2) | `gxformat2/tests/example_wfs.py` |
| Test fixtures (Galaxy) | `lib/galaxy_test/base/workflow_fixtures.py` |
| WES integration | `lib/galaxy/webapps/galaxy/services/wes.py` |
