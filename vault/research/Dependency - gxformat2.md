---
type: research
subtype: dependency
tags:
  - research/dependency
  - galaxy/workflows
status: draft
created: 2026-02-18
revised: 2026-02-18
revision: 1
ai_generated: true
---

# gxformat2 — Implementation Overview & API Reference

Library for bidirectional conversion between Galaxy's native `.ga` workflow format and the human-readable Format 2 (YAML-based) representation. Also provides linting, abstract CWL export, and visualization.

## Public API

Exported from `gxformat2`:

```python
from gxformat2 import (
    python_to_workflow,          # Format2 dict → native Galaxy dict
    from_galaxy_native,          # native Galaxy dict → Format2 dict
    convert_and_import_workflow,  # convert + POST to Galaxy via BioBlend
    ImporterGalaxyInterface,     # ABC for Galaxy API interactions
    ImportOptions,               # conversion options (e.g. deduplicate_subworkflows)
)
```

### `python_to_workflow(as_python, galaxy_interface, workflow_directory=None, import_options=None) → dict`

Core Format2→native conversion. Takes a Format2 workflow as a Python dict, returns a native `.ga`-style dict. `galaxy_interface` can be `None` for offline conversion (only needed if the workflow uses `run: GalaxyTool` steps). `workflow_directory` resolves `@import` references for subworkflows.

### `from_galaxy_native(native_workflow_dict, tool_interface=None, json_wrapper=False) → dict`

Reverse conversion: native `.ga` dict → Format2 dict. Marked "highly experimental" in the source. If `json_wrapper=True`, returns `{"yaml_content": <yaml_string>}` instead.

### `convert_and_import_workflow(has_workflow, **kwds) → dict`

High-level: convert + import into a running Galaxy instance. Key kwargs:

| kwarg | description |
|---|---|
| `galaxy_interface` | `ImporterGalaxyInterface` instance (or constructs `BioBlendImporterGalaxyInterface` from remaining kwargs) |
| `source_type` | `"path"` to load from filesystem |
| `workflow_directory` | base dir for resolving `@import` |
| `convert` | `True` (default) to convert Format2→native before import |
| `name` | override workflow name |
| `publish` | publish on import |
| `exact_tools` | require exact tool versions |
| `url` / `admin_key` / `user_key` | passed to `BioBlendImporterGalaxyInterface` |

### `ImporterGalaxyInterface` (ABC)

```python
class ImporterGalaxyInterface(abc.ABCMeta):
    @abstractmethod
    def import_workflow(self, workflow, **kwds): ...
    def import_tool(self, tool): ...  # raises NotImplementedError
```

`BioBlendImporterGalaxyInterface` is the concrete implementation — wraps `bioblend.GalaxyInstance.workflows.import_workflow_json()`. Constructor accepts `admin_gi`/`user_gi` (BioBlend instances) or `url`+`admin_key`/`user_key`.

### `ImportOptions`

```python
class ImportOptions:
    deduplicate_subworkflows: bool = False  # share subworkflow definitions via $graph
```

---

## Format2 vs Native Galaxy Format

| | Format 2 | Native (.ga) |
|---|---|---|
| Serialization | YAML | JSON |
| Marker | `class: GalaxyWorkflow` | `a_galaxy_workflow: "true"` |
| Steps | dict (keyed by label) or list | dict keyed by integer order_index strings |
| Inputs | top-level `inputs:` dict | steps with `type: data_input` etc. |
| Connections | CWL-style `in: {x: {source: step/output}}` | `input_connections: {x: [{id: N, output_name: "..."}]}` |
| Outputs | top-level `outputs:` with `outputSource` | `workflow_outputs` embedded in steps |

Minimal Format2 example:

```yaml
class: GalaxyWorkflow
inputs:
  the_input: data
steps:
  the_step:
    tool_id: cat1
    in:
      input1:
        source: the_input
outputs:
  the_output:
    outputSource: the_step/out_file1
```

---

## Module Architecture

### `converter.py` — Format2 → Native

Entry: `python_to_workflow()`. Flow:

1. `_preprocess_graphs()` — handle `$graph` multi-workflow documents, register subworkflows
2. `convert_inputs_to_steps()` — transform top-level `inputs:` into native input step dicts, prepend to step list
3. Per-step dispatch via `transform_{step_type}()`:
   - `transform_tool()` — resolves `state`/`runtime_inputs`/`tool_state`, builds `post_job_actions` from `out` specs
   - `transform_subworkflow()` — recursive conversion via `run_workflow_to_step()`
   - `transform_data_input()`, `transform_data_collection_input()`, `transform_parameter_input()` — input step scaffolding
   - `transform_pause()` — pause/review step
4. `_populate_input_connections()` — converts CWL-style `in`/`connect` to native `input_connections` with numeric step IDs
5. Output processing — maps `outputs[].outputSource` → `workflow_outputs` entries on target steps

`ConversionContext` tracks label→step_id mappings and subworkflow state. `SubworkflowConversionContext` delegates graph-level state to parent.

#### Post-Job Actions

Format2 `out` dict keys map to Galaxy PJA classes:

```python
POST_JOB_ACTIONS = {
    'hide':         HideDatasetAction,
    'rename':       RenameDatasetAction,
    'change_datatype': ChangeDatatypeAction,
    'set_columns':  ColumnSetAction,
    'add_tags':     TagDatasetAction,
    'remove_tags':  RemoveTagDatasetAction,
    'delete_intermediate_datasets': DeleteIntermediatesAction,
}
```

### `export.py` — Native → Format2

Entry: `from_galaxy_native()`. Iterates native steps, dispatches by `module_type`:

- `data_input`/`data_collection_input`/`parameter_input` → Format2 `inputs:` entries (using `native_input_to_format2_type()`)
- `tool` → step dict with `tool_id`, `tool_version`, recovered `tool_state` (parsed from JSON string)
- `subworkflow` → recursive `from_galaxy_native()` call, result embedded as `run:`
- `pause` → step with `type: pause`

`_convert_input_connections()` reverses native connections to CWL-style `in:` dicts. `_convert_post_job_actions()` reverses PJAs back to `out:` specs.

### `model.py` — Core Abstractions

Type system and shared utilities:

```python
NativeGalaxyStepType = Literal["subworkflow", "data_input", "data_collection_input", "tool", "pause", "parameter_input"]

STEP_TYPE_ALIASES = {
    'input': 'data_input',
    'input_collection': 'data_collection_input',
    'parameter': 'parameter_input',
}
```

Key functions:

- `get_native_step_type(step_dict)` — infer native type from Format2 step, resolving aliases; defaults to `"tool"` (or `"subworkflow"` if `run` present)
- `pop_connect_from_step_dict(step)` — merge `in` and `connect` keys into unified connection dict, separating connections from defaults
- `setup_connected_values(value, key, append_to)` — recursively walk tool state, replace `{"$link": "step/output"}` with `{"__class__": "ConnectedValue"}` and collect connections
- `inputs_as_native_steps(workflow_dict)` — convert Format2 `inputs:` to native step dicts with proper `type`, `parameter_type`, `tool_state` etc.
- `steps_as_list(format2_workflow, add_ids, inputs_offset, mutate)` — normalize steps from dict-or-list to list, optionally embedding IDs
- `convert_dict_to_id_list_if_needed(dict_or_list)` — convert `{key: value}` to `[{id: key, ...value}]`

Input type mapping (`inputs_as_native_steps`):

| Format2 type | Native step type | Notes |
|---|---|---|
| `data`, `File` | `data_input` | |
| `collection`, `data_collection` | `data_collection_input` | |
| `int`, `integer` | `parameter_input` | `parameter_type: "integer"` |
| `string`, `text` | `parameter_input` | `parameter_type: "text"` |
| `float`, `color`, `boolean` | `parameter_input` | `parameter_type` matches |
| `[int]` (array) | `parameter_input` | `multiple: true` in tool_state |

### `normalize.py` — Cross-Format Normalization

Provides format-agnostic views of workflows. Auto-converts native to Format2 via `ensure_format2()`.

- `steps_normalized(workflow_dict=None, workflow_path=None)` — returns all steps (inputs + tool/subworkflow steps) as normalized list
- `inputs_normalized(**kwd)` — just the input steps
- `outputs_normalized(**kwd)` — just the outputs
- `NormalizedWorkflow(input_workflow)` — deep-copies and normalizes: replaces anonymous output references, ensures implicit `out` dicts
- `walk_id_list_or_dict(dict_or_list)` — yields `(key, value)` regardless of dict or list representation

### `lint.py` + `linting.py` — Validation

```python
from gxformat2.lint import lint_format2, lint_ga
from gxformat2.linting import LintContext

ctx = LintContext()
lint_format2(ctx, workflow_dict, path="/path/to/workflow.gxwf.yml")
# or
lint_ga(ctx, workflow_dict)

ctx.print_messages()
# ctx.found_errors, ctx.found_warns, ctx.error_messages, ctx.warn_messages
```

`lint_format2()` validates against the schema-salad v19.09 schema (requires a file path for `file://` URI). `lint_ga()` validates native format structure.

Both check:
- Structural correctness (required keys, types)
- Workflow outputs exist and have labels
- Report markdown validity (`validate_galaxy_markdown`)
- Test tool shed references (warn)
- Training topic tags (if `training_topic` set on `LintContext`)

Exit codes (from `main()`): `0` success, `1` warnings, `2` errors, `3` parse failure.

### `abstract.py` — CWL Export

```python
from gxformat2.abstract import from_dict

cwl_dict = from_dict(workflow_dict)  # accepts either format, auto-converts
```

Produces CWL v1.2 abstract representation. Tool steps become `Operation` classes (non-executable). Subworkflows become nested `Workflow` classes. Uses `NormalizedWorkflow` to resolve anonymous outputs and ensure `out` dicts before export.

Type mapping: `data`→`File`, `collection`→`File[]`, optional types get `?` suffix.

### `cytoscape.py` — Visualization

```python
from gxformat2.cytoscape import to_cytoscape

to_cytoscape("workflow.ga", "output.html")  # or .json for raw elements
```

Produces Cytoscape.js nodes/edges from normalized step representation. HTML output embeds the data in an interactive visualization template.

### `_scripts.py` — Format Detection

```python
from gxformat2._scripts import ensure_format2

format2_dict = ensure_format2(some_dict)  # converts from native if a_galaxy_workflow == "true"
```

### `yaml.py` — YAML Utilities

```python
from gxformat2.yaml import ordered_load, ordered_dump, ordered_load_path, ordered_dump_to_path
```

Safe YAML load/dump preserving dict ordering.

---

## Connection Syntax

Format2 supports two connection styles in steps:

**CWL-style `in` dict** (preferred):
```yaml
in:
  input_name:
    source: other_step/output_name
```

**`state` with `$link`** (for tool parameters):
```yaml
state:
  param_name:
    $link: other_step/output_name
  nested:
    deep_param:
      $link: step2/result
```

`$link` values are replaced with `{"__class__": "ConnectedValue"}` in the native tool_state, and the connection is recorded in `input_connections`. The pipe-delimited key path (e.g. `nested|deep_param`) maps to Galaxy's parameter addressing.

**Legacy `#` syntax** (deprecated, opt-in via `GXFORMAT2_SUPPORT_LEGACY_CONNECTIONS=1`):
```yaml
source: step#output  # → step/output
```

---

## Subworkflow Handling

Three mechanisms:

1. **Inline `run:`** — subworkflow dict embedded directly in the step
2. **`@import`** — `run: {"@import": "path/to/subworkflow.gxwf.yml"}`, resolved relative to `workflow_directory`
3. **`$graph`** — multi-workflow document with `id`-keyed entries; `main` is the entry point, others referenced by `#graph_id`. With `ImportOptions.deduplicate_subworkflows=True`, shared subworkflows are stored once in `converted["subworkflows"]`

---

## Schema Validation

`gxformat2.schema.v19_09` is auto-generated from schema-salad definitions (via `build_schema.sh`). `lint_format2()` calls `load_document("file://" + path)` for structural validation. The schema defines the Format2 vocabulary: `GalaxyWorkflow`, step types, input types, output definitions, etc.

---

## Dependencies

| Package | Usage |
|---|---|
| `pyyaml` | YAML parse/dump |
| `schema-salad >= 8.7` | Format2 schema validation, code generation |
| `bioblend` | Galaxy API interaction (`BioBlendImporterGalaxyInterface`) |
| `typing_extensions` | `Literal` type hints |
