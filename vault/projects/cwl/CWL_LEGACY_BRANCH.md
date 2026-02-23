# CWL Legacy Branch Deep Dive

Research document covering the CWL integration branch (`cwl-1.0` rebased onto Galaxy dev) and the recent WIP commits migrating to the tool request API. Written from code analysis of branch `cwl_on_tool_request_api_2`.

## Table of Contents

1. [Branch Structure](#branch-structure)
2. [Architecture Overview](#architecture-overview)
3. [Key Directories and Files](#key-directories-and-files)
4. [Tool Loading and Proxy Layer](#tool-loading-and-proxy-layer)
5. [Parameter Handling (The Hack Layer)](#parameter-handling-the-hack-layer)
6. [Tool Execution Flow](#tool-execution-flow)
7. [Output Collection](#output-collection)
8. [Workflow Integration](#workflow-integration)
9. [Test Infrastructure](#test-infrastructure)
10. [The 4 New Commits (Tool Request API Migration)](#the-4-new-commits-tool-request-api-migration)
11. [What's NOT Covered](#whats-not-covered)

---

## Branch Structure

The branch has ~52 commits from the legacy `cwl-1.0` branch (rebased onto Galaxy dev post `release_26.0`) plus 4 new WIP commits that begin migrating CWL tool execution to the modern tool request API.

**Legacy commits** (~48): Implement CWL tool/workflow parsing, parameter translation, execution via cwltool, conformance test infrastructure, output collection, and many bug fixes.

**New commits** (4):
```
d2f9a20b36  WIP: by-pass legacy Galaxy parameter handling for CWL tools
d968749217  Type error...
d4d68d2a9b  Fix persisting CWL tools for tool requests
c290f52d83  WIP: migrate CWL tool running to tool request API
```

---

## Architecture Overview

The CWL integration wraps the reference CWL runner (`cwltool`) inside Galaxy's tool framework. The core design pattern is a **proxy layer** that adapts CWL concepts to Galaxy concepts:

```
CWL Tool Description (.cwl file)
    ↓ cwltool parses
ToolProxy (wraps cwltool.process.Process)
    ↓ adapted to
Galaxy Tool (CwlTool/GalacticCwlTool extends Tool)
    ↓ parameters adapted via
Galaxy Parameter System (basic.py FieldTypeToolParameter, conditionals, repeats)
    ↓ reverse-converted at execution via
to_cwl_job() / galactic_flavored_to_cwl_job()
    ↓ fed to
JobProxy (wraps cwltool.job.Job)
    ↓ extracts
Shell command + environment + file staging
    ↓ executed by
Galaxy job runner (standard execution pipeline)
    ↓ outputs collected by
handle_outputs() → relocate_dynamic_outputs.py
```

The fundamental problem (from PROBLEM_AND_GOAL.md): CWL has flexible, schema-based parameters. Galaxy has opinionated, inflexible tool parameters. The legacy branch adapted CWL → Galaxy parameters → back to CWL, which required extensive hacking. The new commits bypass this round-trip.

---

## Key Directories and Files

### Primary CWL Implementation: `lib/galaxy/tool_util/cwl/`

| File | Lines | Purpose |
|------|-------|---------|
| `__init__.py` | 21 | Public API exports: `tool_proxy`, `workflow_proxy`, `to_cwl_job`, `to_galaxy_parameters`, `handle_outputs` |
| `cwltool_deps.py` | 148 | Optional dependency wrapper for cwltool/schema_salad/ruamel.yaml imports |
| `schema.py` | 110 | `SchemaLoader` class — loads CWL documents via cwltool's loading pipeline |
| `parser.py` | 1263 | **Core module**: `ToolProxy`, `JobProxy`, `WorkflowProxy` and all step/input proxy classes |
| `representation.py` | 589 | Galaxy↔CWL parameter mapping: `to_cwl_job()`, `to_galaxy_parameters()`, `galactic_flavored_to_cwl_job()` |
| `util.py` | 720 | Client-side utilities: `galactic_job_json()` (API→CWL), `output_to_cwl_json()` (Galaxy→CWL), file upload targets |
| `runtime_actions.py` | 232 | Post-execution output collection: `handle_outputs()` |
| `runnable.py` | 33 | Lightweight output discovery for CWL artifacts |

### Galaxy Tool Classes: `lib/galaxy/tools/__init__.py`

CWL tool hierarchy (around line 3754):
```
Tool (base)
  └── CwlCommandBindingTool    # Abstract base for CWL tools
        ├── CwlTool             # tool_type = "cwl"
        └── GalacticCwlTool     # tool_type = "galactic_cwl"
```

Also relevant: `ExpressionTool` — Galaxy's expression tool, separate from CWL expressions.

### Parameter Hack: `lib/galaxy/tools/parameters/basic.py`

- `FieldTypeToolParameter` (line ~2907) — CWL "field" type, the catch-all parameter that handles CWL's flexible typing within Galaxy's parameter system.

### CWL Tool Parser: `lib/galaxy/tool_util/parser/cwl.py`

- `CwlToolSource` — Implements Galaxy's `ToolSource` interface for CWL tools
- `CwlPageSource`, `CwlInputSource` — Adapts CWL inputs to Galaxy's input page model

### Execution: `lib/galaxy/tools/evaluation.py`

- `ToolEvaluator` — CWL-specific branches for command line building, config files, environment variables

### External Entry Point: `lib/galaxy_ext/cwl/handle_outputs.py`

- `relocate_dynamic_outputs()` — Called by job scripts post-execution to collect CWL outputs

---

## Tool Loading and Proxy Layer

### Schema Loading (`schema.py`)

Two global `SchemaLoader` instances:
- `schema_loader` — strict, validating (for tool loading)
- `non_strict_non_validating_schema_loader` — lenient (for job execution)

Loading pipeline:
```
SchemaLoader.raw_process_reference(path)
    → cwltool.load_tool.fetch_document()
    → RawProcessReference(loading_context, process_object, uri)
        ↓
SchemaLoader.process_definition(raw_ref)
    → cwltool.load_tool.resolve_and_validate_document()
    → ResolvedProcessDefinition
        ↓
SchemaLoader.tool(process_def)
    → cwltool.load_tool.make_tool()
    → cwltool.process.Process
```

### Tool Proxy Hierarchy (`parser.py`)

```
ToolProxy (abstract)
├── CommandLineToolProxy  (_class = "CommandLineTool")
└── ExpressionToolProxy   (_class = "ExpressionTool")
```

**ToolProxy** wraps a `cwltool.process.Process` and provides:
- `input_fields()` — CWL input record schema fields
- `input_instances()` → list of `InputInstance` (Galaxy-adapted input metadata)
- `output_instances()` → list of `OutputInstance`
- `job_proxy(input_dict, output_dict, job_directory)` → `JobProxy`
- `to_persistent_representation()` / `from_persistent_representation()` — serialization for DB storage
- `requirements` — extracts CWL requirements/hints
- `docker_identifier()` — extracts DockerRequirement image

**Key hack**: `_hack_cwl_requirements()` moves `DockerRequirement` from requirements to hints so Galaxy's own container system handles containerization instead of cwltool.

### InputInstance (Simplified by New Commits)

**Before new commits**: `InputInstance` had `input_type`, `collection_type`, `array`, `area` attributes and a complex `to_dict()` producing Galaxy form widgets with conditionals and selects.

**After new commits**: `InputInstance` is stripped to just `name`, `label`, `description`. The function `_outer_field_to_input_instance()` no longer maps CWL types to Galaxy widget types.

### Persistent Representation

Tools serialize to JSON for database storage:
```json
{
  "class": "CommandLineTool",
  "raw_process_reference": { /* full CWL document */ },
  "tool_id": "tool_name",
  "uuid": "uuid-string"
}
```

### Dynamic Tool Registration

CWL tools are registered as "dynamic tools" in Galaxy. In `tools/__init__.py` (line ~676), when loading a dynamic tool with a CWL proxy:
```python
tool_source = CwlToolSource(tool_proxy=dynamic_tool.proxy)
```

For workflow-embedded tools, tools are created from persistent representations stored in the database.

---

## Parameter Handling (The Hack Layer)

This is the part the migration aims to eliminate. The legacy approach:

### CWL → Galaxy Parameter Mapping (`representation.py`)

CWL type system is mapped to Galaxy's parameter types:

| CWL Type | Galaxy Representation | Galaxy Widget |
|----------|----------------------|---------------|
| File | DATA | DataToolParameter |
| Directory | DATA | DataToolParameter |
| string | TEXT | TextToolParameter |
| int/long | INTEGER | IntegerToolParameter |
| float/double | FLOAT | FloatToolParameter |
| boolean | BOOLEAN | BooleanToolParameter |
| array | DATA_COLLECTION (list) | DataCollectionToolParameter |
| record | DATA_COLLECTION (record) | DataCollectionToolParameter |
| enum | TEXT or SELECT | SelectToolParameter |
| Any/union | FIELD or CONDITIONAL | FieldTypeToolParameter or Conditional |
| null | (no param) | — |

**Union types** are the worst offender — a CWL input like `[null, File, int]` gets mapped to a Galaxy **conditional** with a select dropdown (`_cwl__type_`) to pick the active type, and a nested value input (`_cwl__value_`).

### FieldTypeToolParameter (`basic.py:2907`)

The `field` type is the catch-all CWL parameter in Galaxy's parameter system:

```python
class FieldTypeToolParameter(ToolParameter):
    def from_json(self, value, trans, other_values=None):
        # Handles: None, dicts with "src", File class dicts, raw values
        if value.get("class") == "File":
            return raw_to_galaxy(trans.app, trans.history, value)
        return self.to_python(value, trans.app)

    def to_json(self, value, app, use_security):
        # Serializes: None, dicts with src/id, File class dicts, raw values
```

This parameter type handles the kitchen-sink nature of CWL inputs but is inherently hacky — it's trying to encode arbitrary structured data within Galaxy's parameter framework.

### Reverse Conversion: Galaxy → CWL (`representation.py`)

**`to_cwl_job(tool, param_dict, local_working_directory)`** — The main legacy conversion path:

1. Walks `tool.inputs` (Galaxy's parsed parameter tree)
2. For `repeat` inputs → builds CWL arrays
3. For `conditional` inputs → reads `_cwl__type_` discriminator, extracts `_cwl__value_`
4. For data inputs → calls `dataset_wrapper_to_file_json()` which creates CWL File objects with location, size, checksum, secondary files
5. For data_collection → `collection_wrapper_to_array()` or `collection_wrapper_to_record()`
6. For primitives → direct type conversion

**`galactic_flavored_to_cwl_job(tool, param_dict, local_working_directory)`** — Simpler variant for tools with `gx:Interface` extensions.

**`to_galaxy_parameters(tool, as_dict)`** — Reverse: CWL job outputs → Galaxy tool state. Used when workflow steps receive CWL results.

### The Problem

The round-trip (CWL schema → Galaxy widgets → user input → Galaxy param_dict → CWL job JSON) loses type fidelity, requires extensive special-casing, and touches `basic.py` which is core Galaxy infrastructure. Every CWL type needs Galaxy UI representation, serialization/deserialization, and reverse-mapping logic.

---

## Tool Execution Flow

### Legacy Path (pre-migration)

```
POST /api/tools  (run_tool_raw)
    ↓
Tool.execute() → exec_before_job()
    ↓
CwlCommandBindingTool.exec_before_job(param_dict):
    1. param_dict_to_cwl_inputs(param_dict)  ← reverse-engineers CWL from Galaxy params
    2. Creates JobProxy(input_json, output_dict, job_dir)
    3. Extracts: command_line, stdin, stdout, stderr, environment
    4. cwl_job_proxy.stage_files()  ← symlinks input files
    5. cwl_job_proxy.save_job()     ← writes .cwl_job.json
    6. Stores in param_dict:
        __cwl_command = "shell command string"
        __cwl_command_state = {args, stdin, stdout, stderr, env}
    ↓
ToolEvaluator builds command:
    if tool_type in CWL_TOOL_TYPES and "__cwl_command" in param_dict:
        command_line = param_dict["__cwl_command"]  # pre-generated, no Cheetah
    ↓
Job script runs on compute node:
    1. Execute __cwl_command
    2. python relocate_dynamic_outputs.py
    ↓
handle_outputs(job_directory):
    1. Load JobProxy from .cwl_job.json
    2. job_proxy.collect_outputs()  ← cwltool collects outputs
    3. Move files/directories to Galaxy dataset paths
    4. Write galaxy.json metadata
```

### New Path (tool request API)

```
POST /api/jobs  (tool_request_raw)
    ↓
Tool.handle_input_async() with has_galaxy_inputs=False:
    - SKIPS expand_meta_parameters_async()
    - SKIPS _populate_async()
    - Passes raw input state through as-is
    ↓
Celery task (serializes tool via persistent representation)
    ↓
CwlCommandBindingTool.exec_before_job(validated_tool_state):
    input_json = validated_tool_state.input_state  ← direct, no reverse-engineering
    ... rest same as legacy
```

### JobProxy Internals (`parser.py:329-569`)

JobProxy wraps cwltool's job execution:

```python
class JobProxy:
    def __init__(self, tool_proxy, input_dict, output_dict, job_directory):
        self._tool_proxy = tool_proxy
        self._input_dict = input_dict      # CWL-format job inputs
        self._output_dict = output_dict    # Maps output names → dataset paths
        self._job_directory = job_directory
```

**_normalize_job()**: Fills CWL defaults via `process.fill_in_defaults()`, converts "path" → "location".

**_ensure_cwl_job_initialized()**: Creates cwltool RuntimeContext with:
- `outdir` = `{job_dir}/working`
- `tmpdir` = `{job_dir}/cwltmp`
- `stagedir` = `{job_dir}/cwlstagedir`
- `use_container=False` (Galaxy handles containers)

Then calls `cwl_tool.job()` to get the cwltool.job.Job object.

**Key properties**:
- `command_line` — list of shell fragments (replaces GALAXY_SLOTS sentinel)
- `stdin`, `stdout`, `stderr` — I/O redirection
- `environment` — env vars dict
- `generate_files` — InitialWorkDirRequirement files

**stage_files()**: Uses cwltool's PathMapper to create symlinks for input files.

**collect_outputs(tool_working_directory, rcode)**: Calls `cwl_job.collect_outputs()` for CommandLineTools, or executes JavaScript for ExpressionTools.

### ToolEvaluator CWL Specifics (`evaluation.py`)

```python
CWL_TOOL_TYPES = ("galactic_cwl", "cwl")
```

- **Command line** (line 808): Uses pre-generated `__cwl_command` instead of Cheetah template
- **Config files** (line 849): Returns empty list (CWL tools don't use config files)
- **Environment variables** (line 873): Reads from `__cwl_command_state["env"]`

---

## Output Collection

### Post-Execution Pipeline (`runtime_actions.py`)

`handle_outputs(job_directory)` runs after the CWL tool completes:

1. Loads `JobProxy` from `.cwl_job.json`
2. Reads `cwl_params.json` for job metadata location
3. Calls `job_proxy.collect_outputs()` to get CWL output dict
4. For each output, dispatches by type:

| CWL Output Type | Galaxy Action |
|-----------------|---------------|
| File | Copy to dataset path, handle secondaryFiles |
| Directory | Copy tree to extra_files_path |
| Array of Files | Create dataset list collection |
| Record | Create dataset record collection |
| Scalar/JSON | Write to expression.json |
| Literal (`_:` prefix) | Write inline content to file |

### Secondary Files

Stored in `dataset_X_files/__secondary_files__/` with an index:
```json
// __secondary_files_index.json
{ "order": ["file1.idx", "file2.bai"] }
```

Reconstructed during input conversion by `dataset_wrapper_to_file_json()`.

### Galaxy Metadata

Written to `galaxy.json`:
```json
{
  "output_name": {
    "created_from_basename": "result.txt",
    "ext": "data",
    "format": "http://edamontology.org/format_XXXX"
  }
}
```

---

## Workflow Integration

### WorkflowProxy (`parser.py:571-759`)

Wraps `cwltool.workflow.Workflow` and converts CWL workflows to Galaxy's internal format.

**Key methods**:
- `step_proxies()` — returns `ToolStepProxy` or `SubworkflowStepProxy` per step
- `tool_reference_proxies()` — collects all tool definitions recursively (for dynamic registration)
- `input_connections_by_step()` — maps CWL step output sources to Galaxy connection format
- `to_dict()` — converts entire CWL workflow to Galaxy workflow dict format

### Step Proxy Hierarchy

```
BaseStepProxy
├── ToolStepProxy          # CommandLineTool/ExpressionTool step
│   └── tool_proxy         # ToolProxy for the embedded tool
└── SubworkflowStepProxy   # Nested Workflow step
    └── subworkflow_proxy  # WorkflowProxy for the sub-workflow
```

### InputProxy (`parser.py:971-1016`)

Represents a workflow step input connection:
- `input_name` — CWL input field name
- `cwl_source_id` — source reference (step/output)
- `scatter` — boolean
- `to_dict()` — produces Galaxy input dict with `merge_type`, `scatter_type`, `value_from`

### CWL → Galaxy Workflow Conversion

`WorkflowProxy.to_dict()` produces:
```python
{
    "name": "workflow_name",
    "steps": {
        0: {"type": "data_input", "label": "input1", ...},  # CWL input
        1: {"type": "tool", "tool_uuid": "...", "input_connections": {...}},  # Tool step
        2: {"type": "subworkflow", "subworkflow": {...}},   # Sub-workflow step
    },
    "annotation": "..."
}
```

CWL workflow inputs map to Galaxy data_input/data_collection_input/parameter_input steps depending on type.

### Scatter Support

CWL scatter is mapped via InputProxy:
- `scatter_type` = "dotproduct" | "flat_crossproduct" (from `scatterMethod`)
- Scatter inputs identified by checking step's `scatter` field

### Galaxy Workflow Manager Integration (`managers/workflows.py`)

When importing a CWL workflow:
1. Creates `workflow_proxy` from CWL dict/path
2. Extracts `tool_reference_proxies` — all tools used
3. Registers each as a dynamic tool (with UUID)
4. Converts to Galaxy dict format via `workflow_proxy.to_dict()`
5. Passes to Galaxy's standard workflow import

---

## Test Infrastructure

### Test Files

- `lib/galaxy_test/api/test_tools_cwl.py` — API tests for CWL tool execution
  - `class TestCwlTools(ApiTestCase)` — test class
  - Tests for various CWL features (int, file, array, record, etc.)
  - `_run_and_get_stdout()`, `_run()` helper methods

- `lib/galaxy_test/api/cwl/` — CWL-specific test utilities

- `test/functional/tools/cwl_tools/` — CWL tool definitions used in tests
  - `v1.0_custom/` — custom CWL v1.0 test tools
  - Conformance test data

### CWL Populator (`lib/galaxy_test/base/populators.py`)

```python
CWL_TOOL_DIRECTORY = "test/functional/tools/cwl_tools"
```

**`CwlPopulator`** class:
- `run_cwl_job(tool_id, job, history_id)` — submits CWL tool via API
  - **New path**: calls `tool_request_raw()` (tool request API)
  - **Old path**: called `run_tool_raw()` (legacy `/api/tools`)
- Extracts `tool_request_id` from response
- Returns `CwlToolRun`

**`CwlToolRun`** class:
- Wraps tool request response
- Properties: `job_id`, `output`, `output_collection`
- Waits for tool request completion before accessing outputs

### Conformance Tests

- `scripts/cwl_conformance_to_test_cases.py` — converts CWL conformance tests to Galaxy test format
- `scripts/update_cwl_conformance_tests.sh` — updates conformance test suite
- `conformance_tests_gen()` — generator that loads conformance YAML and yields test cases

---

## The 4 New Commits (Tool Request API Migration)

### Commit 1: `c290f52d83` — "WIP: migrate CWL tool running to tool request API"

Foundational commit switching test infrastructure from `/api/tools` to `/api/jobs` tool request API.

**Changes**:
- `CwlToolRun.__init__` now takes `tool_request_id` instead of `run_response`
- `CwlPopulator.run_cwl_job()` calls `tool_request_raw()` instead of `run_tool_raw()`
- Added `test_cwl_int_simple` test
- Added `cwl_int.cwl` to `sample_tool_conf.xml`

### Commit 2: `d4d68d2a9b` — "Fix persisting CWL tools for tool requests"

Tool request API uses Celery tasks, so CWL tools must serialize/deserialize correctly.

**Changes**:
- `ToolProxy.__init__` accepts and stores `tool_id`
- `to_persistent_representation()` includes `tool_id`
- `from_persistent_representation()` reads `tool_id` back
- `QueueJobs` schema gains `tool_id: str` and `tool_uuid: Optional[UUID]`
- `JobsService` populates these from tool metadata
- Celery task chain passes `tool_id`/`tool_uuid` through to `create_tool_from_representation()`
- Unit tests verify round-trip serialization preserves UUID and tool_id

### Commit 3: `d968749217` — "Type error..."

Preparatory cleanup stripping 55 lines of Galaxy type-mapping logic from `_outer_field_to_input_instance()`.

### Commit 4: `d2f9a20b36` — "WIP: by-pass legacy Galaxy parameter handling for CWL tools"

The architecturally significant commit:

**A. `has_galaxy_inputs` flag** (`tools/__init__.py`):
```python
self.has_galaxy_inputs = False  # Set True only when pages.inputs_defined
```

For CWL tools, `inputs_style="cwl"` on PagesSource means `has_galaxy_inputs` stays `False`.

**B. Bypass parameter machinery** (`handle_input_async`):
```python
if self.has_galaxy_inputs:
    expanded_incomings, job_tool_states, collection_info = expand_meta_parameters_async(...)
    params, errors = self._populate_async(request_context, expanded_incoming)
else:
    # CWL path: pass state through directly
    expanded_incomings = [deepcopy(tool_request_internal_state.input_state)]
    params = expanded_incoming
    errors = {}
```

**C. Thread validated_tool_state to exec_before_job**:
```python
# OLD:
input_json = self.param_dict_to_cwl_inputs(param_dict, local_working_directory)

# NEW:
input_json = validated_tool_state.input_state
```

**D. CWL input pages simplified**:
- `parse_input_pages()` always returns CWL-style pages (no Galaxy interface overlay)
- `InputInstance` stripped to name/label/description only

### Migration Summary

| Aspect | Legacy Path | New Path |
|--------|-------------|----------|
| API endpoint | `/api/tools` | `/api/jobs` (tool request API) |
| Parameter handling | CWL→Galaxy widgets→param_dict→CWL | Raw JSON passed through |
| CWL job inputs | `param_dict_to_cwl_inputs(param_dict)` | `validated_tool_state.input_state` |
| Tool serialization | Not needed (same process) | Celery: `ToolProxy.to_persistent_representation()` |
| Input form rendering | Full Galaxy form with types | `has_galaxy_inputs=False`, no form |
| Expansion/validation | `expand_meta_parameters_async()` + `_populate_async()` | Bypassed entirely |

---

## What's NOT Covered

This research document has limitations due to context window constraints:

### Partially Covered
- **`representation.py` line-by-line**: Covered the key functions but not every helper or edge case in the 589-line file
- **`util.py` internals**: Covered the main functions (`galactic_job_json`, `output_to_cwl_json`) but not every upload target class or collection handling detail
- **`parser.py` JobProxy**: Covered the main methods but not every normalization step or edge case in `_normalize_job()`

### Not Covered
- **Client-side CWL support**: Any Vue/TypeScript components for CWL tool forms in `client/`
- **Galaxy model changes**: CWL-related changes to `model/` (DynamicTool model, tool state storage)
- **Job wrapper changes**: `lib/galaxy/jobs/__init__.py` — `is_cwl_job` property and CWL-specific job handling details
- **Command factory**: `lib/galaxy/jobs/command_factory.py` — how CWL job scripts differ from standard Galaxy job scripts (relocate_dynamic_outputs.py generation)
- **CWL v1.1/v1.2 differences**: The branch supports v1.0, v1.1, and v1.2 but version-specific handling wasn't analyzed
- **Workflow run.py changes**: CWL-specific workflow execution modifications (raw_to_galaxy for File outputs in workflow steps)
- **Galaxy controller changes**: `webapps/galaxy/controllers/tool_runner.py` — CWL tool type allowlisting
- **Conformance test coverage**: Specific CWL conformance test pass/fail status, which tests are "red" vs "green"
- **`basic.py` full diff**: The complete set of modifications to basic.py for CWL support (beyond FieldTypeToolParameter)
- **Expression tool JavaScript execution**: How CWL ExpressionTool JS evaluation works inside Galaxy
- **CWL format/EDAM mapping**: How CWL format URIs map to Galaxy datatypes
- **Error handling**: CWL validation error propagation, failed job handling
- **Galaxy config for CWL**: `strict_cwl_validation`, `enable_cwl` flags, tool_conf setup
- **The `galactic_cwl` tool type**: How gx:Interface extensions work in detail, what `map_to` does
- **Scatter execution**: How CWL scatter actually maps to Galaxy's collection-based parallelism
- **`value_from` expressions**: How CWL valueFrom JavaScript expressions are evaluated during workflow execution
